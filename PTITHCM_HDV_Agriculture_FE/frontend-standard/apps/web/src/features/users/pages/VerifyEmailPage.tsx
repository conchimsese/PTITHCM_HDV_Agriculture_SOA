import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { authApi } from '../../../shared/api/runtime';
import './auth.css';
export function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const verify = useMutation({
    mutationFn: () => authApi.verifyEmail(email.trim().toLowerCase(), otp),
  });
  const resend = useMutation({
    mutationFn: () => authApi.resendVerification(email.trim().toLowerCase()),
    onSuccess: () => setCooldown(60),
  });
  const busy = verify.isPending || resend.isPending;
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  return (
    <main className="auth-main" style={{ minHeight: '100dvh' }}>
      <section className="auth-card">
        <div className="card-kicker">RUỘNG LÚA VIỆT</div>
        <h2>Xác minh email</h2>
        <p className="auth-description">
          Dùng mã OTP 6 chữ số được gửi đến email của bạn. Mã có hiệu lực 10 phút.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) verify.mutate();
          }}
        >
          <fieldset disabled={busy || verify.isSuccess}>
            <label className="form-field">
              Email
              <input
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => {
                  resend.reset();
                  setEmail(event.target.value);
                }}
              />
            </label>
            <label className="form-field">
              Mã OTP
              <input
                required
                pattern="[0-9]{6}"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
              />
            </label>
            <button className="primary-button">
              {verify.isPending ? 'Đang xác minh…' : 'Xác minh email'}
            </button>
          </fieldset>
        </form>
        <button
          className="text-button resend-button"
          disabled={
            busy ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
            cooldown > 0 ||
            verify.isSuccess
          }
          onClick={() => resend.mutate()}
        >
          {cooldown ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã OTP'}
        </button>
        {(verify.error || resend.error) && (
          <p className="alert alert-error" role="alert">
            {verify.error?.message || resend.error?.message}
          </p>
        )}
        {resend.isSuccess && (
          <p className="alert alert-success" role="status">
            Nếu email hợp lệ, mã OTP mới sẽ được gửi.
          </p>
        )}
        {verify.isSuccess && (
          <p className="alert alert-success" role="status">
            Đã xác minh email. Bạn có thể đăng nhập.
          </p>
        )}
        <Link className="primary-button button-link" to="/dang-nhap">
          Về đăng nhập
        </Link>
      </section>
    </main>
  );
}
