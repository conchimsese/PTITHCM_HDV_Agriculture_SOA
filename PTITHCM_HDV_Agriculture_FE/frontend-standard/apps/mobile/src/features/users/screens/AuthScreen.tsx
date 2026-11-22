import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { emptyRegistration, normalizeLogin, registrationRequest } from '@agri/contracts';
import { setTokenPair } from '@agri/api-client';
import { authApi } from '../../../shared/api/runtime';
import { Action, Field, Screen, ui } from '../../../shared/ui/Screen';
import { useSession } from '../hooks/useUsers';

export function AuthScreen() {
  const session = useSession();
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login');
  const [form, setForm] = useState({ ...emptyRegistration });
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  if (session?.tokens) return <Redirect href="/tai-khoan" />;
  const changeMode = (next: typeof mode) => {
    setMode(next);
    setError('');
    setNotice('');
    setForm((current) => ({ ...current, password: '', confirmPassword: '' }));
  };
  async function submit() {
    if (busy) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'register') {
        const request = registrationRequest(form);
        const result = await authApi.register(request);
        setForm({ ...emptyRegistration, email: request.email });
        setMode('verify');
        setCooldown(result.verificationEmailStatus === 'FAILED' ? 0 : 60);
        setNotice(
          result.verificationEmailStatus === 'FAILED'
            ? 'Đã tạo tài khoản. Chưa gửi được email, vui lòng gửi lại mã.'
            : 'Mã OTP đã gửi đến email, có hiệu lực 10 phút.',
        );
      } else if (mode === 'verify') {
        if (!/^[0-9]{6}$/.test(otp)) throw new Error('Vui lòng nhập mã OTP 6 chữ số.');
        await authApi.verifyEmail(form.email.trim().toLowerCase(), otp);
        changeMode('login');
        setNotice('Xác minh thành công. Bạn có thể đăng nhập.');
        setOtp('');
      } else {
        const username = normalizeLogin(identifier);
        if (username.length < 3 || !form.password)
          throw new Error('Vui lòng nhập tài khoản và mật khẩu.');
        setTokenPair(await authApi.login({ username, password: form.password }));
        setForm({ ...emptyRegistration });
        router.replace('/tai-khoan');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (busy || cooldown) return;
    setBusy(true);
    setError('');
    try {
      await authApi.resendVerification(form.email.trim().toLowerCase());
      setCooldown(60);
      setNotice('Nếu email hợp lệ, mã OTP mới sẽ được gửi.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không gửi được OTP.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title={
        mode === 'register'
          ? 'Bắt đầu mùa vụ mới'
          : mode === 'verify'
            ? 'Xác minh email'
            : 'Chào mừng trở lại!'
      }
      subtitle="Gieo kết nối. Gặt thành công."
    >
      <View style={ui.row}>
        <View style={ui.flex}>
          <Action
            title="Đăng nhập"
            secondary={mode !== 'login'}
            disabled={busy}
            onPress={() => changeMode('login')}
          />
        </View>
        <View style={ui.flex}>
          <Action
            title="Đăng ký"
            secondary={mode !== 'register'}
            disabled={busy}
            onPress={() => changeMode('register')}
          />
        </View>
      </View>
      <View style={ui.card}>
        {mode === 'register' && (
          <>
            <View style={ui.row}>
              {(['FARMER', 'TRADER'] as const).map((role) => (
                <View style={ui.flex} key={role}>
                  <Action
                    title={role === 'FARMER' ? 'Nhà nông' : 'Thương lái'}
                    secondary={form.role !== role}
                    disabled={busy}
                    onPress={() => setForm({ ...form, role })}
                  />
                </View>
              ))}
            </View>
            <Field
              label="Họ tên / Tên doanh nghiệp"
              value={form.name}
              onChangeText={(name) => setForm({ ...form, name })}
              maxLength={150}
              editable={!busy}
            />
            <Field
              label="Số điện thoại"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(phone) => setForm({ ...form, phone })}
              maxLength={20}
              editable={!busy}
            />
          </>
        )}
        {mode !== 'login' ? (
          <Field
            label="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(email) => setForm({ ...form, email })}
            maxLength={254}
            editable={!busy}
          />
        ) : (
          <Field
            label="Tên đăng nhập, số điện thoại hoặc email"
            autoCapitalize="none"
            autoCorrect={false}
            value={identifier}
            onChangeText={setIdentifier}
            editable={!busy}
            maxLength={100}
          />
        )}
        {mode === 'verify' ? (
          <>
            <Field
              label="Mã OTP 6 chữ số"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
              editable={!busy}
            />
            <Text style={ui.subtitle}>
              Kiểm tra cả hộp thư rác. Mã xác minh có hiệu lực 10 phút.
            </Text>
          </>
        ) : (
          <>
            <Field
              label="Mật khẩu"
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
              value={form.password}
              onChangeText={(password) => setForm({ ...form, password })}
              editable={!busy}
            />
            <Action
              title={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              secondary
              onPress={() => setShow(!show)}
            />
            {mode === 'register' && (
              <>
                <Text style={ui.subtitle}>
                  Ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.
                </Text>
                <Field
                  label="Nhập lại mật khẩu"
                  secureTextEntry={!show}
                  value={form.confirmPassword}
                  onChangeText={(confirmPassword) => setForm({ ...form, confirmPassword })}
                  editable={!busy}
                />
              </>
            )}
          </>
        )}
        {error && (
          <Text style={ui.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
        {notice && (
          <Text style={ui.success} accessibilityLiveRegion="polite">
            {notice}
          </Text>
        )}
        <Action
          title={
            busy
              ? 'Đang xử lý…'
              : mode === 'register'
                ? 'Tạo tài khoản'
                : mode === 'verify'
                  ? 'Xác minh email'
                  : 'Đăng nhập'
          }
          disabled={busy}
          onPress={() => void submit()}
        />
        {mode === 'verify' ? (
          <Action
            title={cooldown ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã'}
            secondary
            disabled={busy || cooldown > 0}
            onPress={() => void resend()}
          />
        ) : (
          <Action
            title="Tôi cần xác minh email"
            secondary
            disabled={busy}
            onPress={() => changeMode('verify')}
          />
        )}
      </View>
    </Screen>
  );
}
