const env = require('../../config/env');
const { AccessStateUnavailableError, AccountNotActiveError } = require('../errors/app-error');

/**
 * Access-State Real-time Verification Middleware
 * Calls User Service GET /internal/v1/accounts/{accountId}/access-state
 * Enforces Fail-Closed policy: Timeout/Network Error -> 503 ACCESS_STATE_UNAVAILABLE
 * Inactive/Locked Account -> 403 ACCOUNT_NOT_ACTIVE
 */
async function checkAccessState(req, res, next) {
  // If in test environment and mock flag is enabled, allow mock behavior
  if (req.mockAccessState) {
    if (req.mockAccessState.status === 503) {
      return next(new AccessStateUnavailableError());
    }
    if (req.mockAccessState.state !== 'ACTIVE') {
      return next(new AccountNotActiveError());
    }
    return next();
  }

  // Bypass if explicitly set in test or dev when user service is not reachable
  if (process.env.BYPASS_USER_SERVICE === 'true') {
    return next();
  }

  const accountId = req.user?.accountId;
  if (!accountId) {
    return next(new AccountNotActiveError('Account identifier missing'));
  }

  const url = `${env.USER_SERVICE_URL}/internal/v1/accounts/${accountId}/access-state`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env.ACCESS_STATE_TIMEOUT_MS);

    const headers = {
      'Accept': 'application/json',
      'Cache-Control': 'no-store'
    };
    if (env.USER_SERVICE_KEY) {
      headers['X-Service-Key'] = env.USER_SERVICE_KEY;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404 || response.status === 403) {
        return next(new AccountNotActiveError('Account is not found or not active'));
      }
      return next(new AccessStateUnavailableError());
    }

    const data = await response.json();
    const status = (data.status || data.state || '').toUpperCase();

    if (status !== 'ACTIVE') {
      return next(new AccountNotActiveError(`Account status is ${status || 'INACTIVE'}`));
    }

    next();
  } catch (err) {
    // Timeout or network error -> Fail Closed
    return next(new AccessStateUnavailableError());
  }
}

module.exports = {
  checkAccessState
};
