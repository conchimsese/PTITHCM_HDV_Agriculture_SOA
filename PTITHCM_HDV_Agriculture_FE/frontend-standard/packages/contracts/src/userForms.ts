import type { RegisterRequest } from './auth';
export const normalizeLogin = (text: string) =>
  /^\+?\d[\d\s().+-]+$/.test(text.trim())
    ? text.replace(/[\s().-]/g, '').replace(/^\+84/, '0')
    : text.trim().toLowerCase();
export type RegistrationForm = {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'FARMER' | 'TRADER';
};
export const emptyRegistration: RegistrationForm = {
  name: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'FARMER',
};
export function registrationRequest(form: RegistrationForm): RegisterRequest {
  const phone = normalizeLogin(form.phone);
  if (!form.name.trim()) throw new Error('Vui lòng nhập họ tên hoặc tên doanh nghiệp.');
  if (!/^0[35789]\d{8}$/.test(phone))
    throw new Error('Số điện thoại không hợp lệ. Ví dụ: 0912345678.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    throw new Error('Địa chỉ email không hợp lệ.');
  if (
    !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/s.test(form.password) ||
    new TextEncoder().encode(form.password).length > 72
  )
    throw new Error(
      'Mật khẩu cần 8 ký tự trở lên, có chữ hoa, chữ thường, số, ký tự đặc biệt và tối đa 72 byte.',
    );
  if (form.password !== form.confirmPassword) throw new Error('Mật khẩu nhập lại chưa khớp.');
  return {
    username: phone,
    email: form.email.trim().toLowerCase(),
    password: form.password,
    role: form.role,
    profile: {
      phone,
      ...(form.role === 'FARMER'
        ? { fullName: form.name.trim() }
        : { businessName: form.name.trim() }),
    },
  };
}
