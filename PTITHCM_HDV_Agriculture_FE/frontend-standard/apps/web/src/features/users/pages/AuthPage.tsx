import { useEffect, useState, useSyncExternalStore } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  createDemoSession,
  getSession,
  setSession,
  setTokenPair,
  subscribeSession,
} from '@agri/api-client';
import { authApi, queryClient } from '../../../shared/api/runtime';
import { GoogleSignIn } from '../components/GoogleSignIn';
import './auth.css';

const normalizePhone = (value: string) => value.replace(/[\s().-]/g, '').replace(/^\+84/, '0');
const isPhone = (value: string) => /^0[35789]\d{8}$/.test(normalizePhone(value));
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  return <AuthScreen key={mode} mode={mode} />;
}

function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const register = mode === 'register';
  const session = useSyncExternalStore(subscribeSession, getSession);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? '').trim();
    setError('');
    setNotice('');
    const password = String(form.get('password') ?? '');
    const identifier = value('identifier');
    if (
      !verificationEmail &&
      !register &&
      !isEmail(identifier) &&
      !isPhone(identifier) &&
      !/^[a-zA-Z0-9_.-]{3,100}$/.test(identifier)
    ) {
      setError('Vui lòng nhập tên đăng nhập, số điện thoại hoặc địa chỉ email hợp lệ.');
      return;
    }
    if (register && !verificationEmail) {
      if (!isPhone(value('phone'))) {
        setError('Số điện thoại không hợp lệ. Ví dụ: 0912345678.');
        return;
      }
      if (
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/s.test(password) ||
        new TextEncoder().encode(password).length > 72
      ) {
        setError(
          'Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt và tối đa 72 byte.',
        );
        return;
      }
      if (password !== String(form.get('confirmPassword') ?? '')) {
        setError('Mật khẩu nhập lại chưa khớp.');
        return;
      }
    }
    if (
      import.meta.env.DEV &&
      ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
      !register &&
      !verificationEmail &&
      password === 'demo123'
    ) {
      const roles = {
        'nongdan.demo': 'FARMER',
        'thuonglai.demo': 'TRADER',
        'admin.demo': 'ADMIN',
      } as const;
      const role = roles[identifier.toLowerCase() as keyof typeof roles];
      if (role) {
        queryClient.clear();
        setSession(createDemoSession(role));
        return;
      }
    }
    setBusy(true);
    try {
      if (verificationEmail) {
        await authApi.verifyEmail(verificationEmail, value('otp'));
        setVerified(true);
        setVerificationEmail('');
        setNotice('Email đã được xác minh. Bạn có thể đăng nhập ngay.');
      } else if (register) {
        const role = value('role') === 'TRADER' ? 'TRADER' : 'FARMER';
        const phone = normalizePhone(value('phone'));
        const email = value('email').toLowerCase();
        const result = await authApi.register({
          username: phone,
          email,
          password,
          role,
          profile: {
            phone,
            ...(role === 'FARMER' ? { fullName: value('name') } : { businessName: value('name') }),
          },
        });
        setVerificationEmail(email);
        setCooldown(result.verificationEmailStatus === 'FAILED' ? 0 : 60);
        setNotice(
          result.verificationEmailStatus === 'FAILED'
            ? 'Tài khoản đã tạo nhưng chưa gửi được email. Hãy gửi lại mã xác minh.'
            : 'Mã xác minh đã được gửi đến email của bạn.',
        );
      } else {
        const username = isPhone(identifier)
          ? normalizePhone(identifier)
          : identifier.toLowerCase();
        setTokenPair(await authApi.login({ username, password }));
      }
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await authApi.resendVerification(verificationEmail);
      setCooldown(60);
      setNotice('Nếu email hợp lệ, mã xác minh mới sẽ được gửi.');
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError('');
    try {
      if (session?.tokens) await authApi.logout(session.tokens.refreshToken);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      queryClient.clear();
      setSession(null);
      setBusy(false);
    }
  }

  if (session?.isDemo) return <Navigate to="/" replace />;
  if (session?.tokens) return <Navigate to="/" replace />;
  return (
    <main className="auth-layout">
      <aside className="auth-story">
        <Link to="/dang-nhap" className="brand">
          <span className="brand-mark" aria-hidden="true">
            ❧
          </span>
          <span>
            Ruộng Lúa Việt<small>KẾT NỐI GIÁ TRỊ NÔNG NGHIỆP</small>
          </span>
        </Link>
        <div className="story-copy">
          <span className="eyebrow">ĐỒNG HÀNH CÙNG NHÀ NÔNG</span>
          <h1>
            Gieo kết nối.
            <br />
            Gặt <em>thành công.</em>
          </h1>
          <p>Nơi nhà nông và thương lái gặp nhau, cùng xây dựng một mùa vụ bền vững.</p>
          <div className="story-features">
            <span>✓ Kết nối trực tiếp</span>
            <span>✓ Giao dịch minh bạch</span>
            <span>✓ Đồng hành mỗi mùa vụ</span>
          </div>
        </div>
        <div className="field-art" aria-hidden="true">
          <div className="sun" />
          <div className="hill hill-back" />
          <div className="hill hill-front" />
          <div className="field-lines" />
          <span className="rice rice-one">❧</span>
          <span className="rice rice-two">❧</span>
          <span className="rice rice-three">❧</span>
        </div>
        <p className="story-footer">Từ cánh đồng Việt, đến những cơ hội mới.</p>
      </aside>
      <section className="auth-main" aria-label={register ? 'Đăng ký tài khoản' : 'Đăng nhập'}>
        <div className="mobile-brand">❧ Ruộng Lúa Việt</div>
        <div className="auth-card">
          <div className="card-kicker">
            <span /> NÔNG NGHIỆP KẾT NỐI
          </div>
          <h2>
            {session
              ? 'Đăng nhập thành công'
              : verificationEmail
                ? 'Xác minh email'
                : verified
                  ? 'Sẵn sàng kết nối!'
                  : register
                    ? 'Bắt đầu mùa vụ mới'
                    : 'Đăng nhập máy chủ'}
          </h2>
          <p className="auth-description">
            {session
              ? 'Bạn đã kết nối với Ruộng Lúa Việt.'
              : verificationEmail
                ? `Nhập mã 6 chữ số được gửi đến ${verificationEmail}. Mã có hiệu lực trong 10 phút.`
                : register
                  ? 'Tạo tài khoản trên máy chủ để cùng phát triển nông nghiệp Việt.'
                  : 'Đăng nhập bằng tài khoản đã đăng ký trên hệ thống Ruộng Lúa Việt.'}
          </p>
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="alert alert-success" role="status">
              {notice}
            </div>
          )}
          {session ? (
            <div className="session-card">
              <Link className="primary-button button-link" to="/tai-khoan">
                Đến hồ sơ cá nhân →
              </Link>
              <span className="success-icon">✓</span>
              <p>
                Tài khoản{' '}
                {session.role === 'FARMER'
                  ? 'Nhà nông'
                  : session.role === 'TRADER'
                    ? 'Thương lái'
                    : 'Quản trị viên'}
              </p>
              <button className="primary-button" disabled={busy} onClick={() => void logout()}>
                {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
              </button>
            </div>
          ) : verified ? (
            <Link className="primary-button button-link" to="/dang-nhap">
              Đến trang đăng nhập →
            </Link>
          ) : (
            <>
              {!verificationEmail && (
                <p className="auth-switch">
                  <Link to="/xac-minh-email">Tôi cần xác minh email</Link>
                </p>
              )}
              {!verificationEmail && (
                <nav className="auth-tabs" aria-label="Tài khoản">
                  <Link to="/dang-nhap" aria-current={!register ? 'page' : undefined}>
                    Đăng nhập
                  </Link>
                  <Link to="/dang-ky" aria-current={register ? 'page' : undefined}>
                    Đăng ký
                  </Link>
                </nav>
              )}
              <form onSubmit={(event) => void submit(event)}>
                <fieldset disabled={busy}>
                  {verificationEmail ? (
                    <label className="form-field">
                      Mã xác minh
                      <input
                        name="otp"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        placeholder="Nhập mã 6 chữ số"
                        required
                        autoFocus
                      />
                    </label>
                  ) : (
                    <>
                      {register ? (
                        <>
                          <div className="role-options" aria-label="Vai trò tài khoản">
                            <label>
                              <input type="radio" name="role" value="FARMER" defaultChecked />
                              <span>♧ Nhà nông</span>
                            </label>
                            <label>
                              <input type="radio" name="role" value="TRADER" />
                              <span>⇄ Thương lái</span>
                            </label>
                          </div>
                          <label className="form-field">
                            Họ tên / Tên doanh nghiệp
                            <input
                              name="name"
                              autoComplete="name"
                              placeholder="Nhập tên của bạn"
                              maxLength={150}
                              required
                            />
                          </label>
                          <div className="form-row">
                            <label className="form-field">
                              Số điện thoại
                              <input
                                name="phone"
                                type="tel"
                                autoComplete="tel"
                                placeholder="0912 345 678"
                                maxLength={20}
                                required
                              />
                            </label>
                            <label className="form-field">
                              Email
                              <input
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder="ban@gmail.com"
                                maxLength={254}
                                required
                              />
                            </label>
                          </div>
                        </>
                      ) : (
                        <label className="form-field">
                          Tên đăng nhập, số điện thoại hoặc email
                          <input
                            name="identifier"
                            autoComplete="username"
                            placeholder="Số điện thoại hoặc ban@gmail.com"
                            maxLength={254}
                            required
                          />
                        </label>
                      )}
                      <label className="form-field">
                        Mật khẩu
                        <div className="password-input">
                          <input
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete={register ? 'new-password' : 'current-password'}
                            placeholder={register ? 'Tạo mật khẩu của bạn' : 'Nhập mật khẩu'}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            aria-pressed={showPassword}
                          >
                            {showPassword ? 'Ẩn' : 'Hiện'}
                          </button>
                        </div>
                      </label>
                      {register && (
                        <>
                          <p className="field-hint">
                            Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
                          </p>
                          <label className="form-field">
                            Nhập lại mật khẩu
                            <input
                              name="confirmPassword"
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              placeholder="Nhập lại mật khẩu"
                              required
                            />
                          </label>
                        </>
                      )}
                    </>
                  )}
                  <button className="primary-button" type="submit">
                    {busy
                      ? 'Đang xử lý…'
                      : verificationEmail
                        ? 'Xác minh email'
                        : register
                          ? 'Tạo tài khoản'
                          : 'Đăng nhập'}{' '}
                    <span aria-hidden="true">→</span>
                  </button>
                </fieldset>
              </form>
              {verificationEmail ? (
                <button
                  className="text-button resend-button"
                  disabled={busy || cooldown > 0}
                  onClick={() => void resend()}
                >
                  {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã xác minh'}
                </button>
              ) : (
                <>
                  <div className="divider">
                    <span>hoặc tiếp tục với</span>
                  </div>
                  <GoogleSignIn onSuccess={setTokenPair} disabled={busy} />
                  <p className="auth-switch">
                    {register ? 'Đã có tài khoản?' : 'Bạn chưa có tài khoản?'}{' '}
                    <Link to={register ? '/dang-nhap' : '/dang-ky'}>
                      {register ? 'Đăng nhập' : 'Đăng ký ngay'}
                    </Link>
                  </p>
                  {import.meta.env.DEV &&
                    ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
                    !register && (
                      <details className="demo-login-box">
                        <summary className="demo-login-summary">
                          Xem thử giao diện cục bộ (Demo trình duyệt)
                        </summary>
                        <p className="demo-login-hint">
                          Chỉ dùng dữ liệu giả lập trên trình duyệt, không kết nối hoặc lưu vào máy
                          chủ thực. Tài khoản demo gõ tay: nongdan.demo / thuonglai.demo /
                          admin.demo (mật khẩu <strong>demo123</strong>).
                        </p>
                        <div className="demo-login-buttons">
                          <button
                            type="button"
                            className="demo-role-btn farmer"
                            onClick={() => {
                              queryClient.clear();
                              setSession(createDemoSession('FARMER'));
                            }}
                          >
                            Mở bản xem thử Nông dân (Demo)
                          </button>
                          <button
                            type="button"
                            className="demo-role-btn trader"
                            onClick={() => {
                              queryClient.clear();
                              setSession(createDemoSession('TRADER'));
                            }}
                          >
                            Mở bản xem thử Thương lái (Demo)
                          </button>
                          <button
                            type="button"
                            className="demo-role-btn"
                            onClick={() => {
                              queryClient.clear();
                              setSession(createDemoSession('ADMIN'));
                            }}
                          >
                            Mở bản xem thử Quản trị (Demo)
                          </button>
                        </div>
                      </details>
                    )}
                </>
              )}
            </>
          )}
        </div>
        <footer className="auth-footer">
          © {new Date().getFullYear()} Ruộng Lúa Việt{' '}
          <span>Gắn kết hôm nay, thịnh vượng ngày mai.</span>
        </footer>
      </section>
    </main>
  );
}
