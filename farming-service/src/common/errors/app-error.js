/**
 * Base Application Error
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Invalid request', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

class AccountNotActiveError extends ForbiddenError {
  constructor(message = 'Account is not active') {
    super(message, 'ACCOUNT_NOT_ACTIVE');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

class SnapshotIncompleteError extends ConflictError {
  constructor(message = 'Snapshot data is incomplete for listing') {
    super(message, 'SNAPSHOT_INCOMPLETE');
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', code = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code);
  }
}

class AccessStateUnavailableError extends ServiceUnavailableError {
  constructor(message = 'User service access-state check unavailable') {
    super(message, 'ACCESS_STATE_UNAVAILABLE');
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  AccountNotActiveError,
  NotFoundError,
  ConflictError,
  SnapshotIncompleteError,
  InternalServerError,
  ServiceUnavailableError,
  AccessStateUnavailableError
};
