import type { Role } from './auth';
// Metadata để hai nền tảng có cùng phạm vi; component và navigator thuộc từng app.
export const modules = [
  {
    id: 'dashboard',
    label: 'Tổng quan',
    owner: 'Farming / Trading / User',
    roles: ['FARMER', 'TRADER', 'ADMIN'],
  },
  { id: 'plots', label: 'Ruộng & mùa vụ', owner: 'Farming', roles: ['FARMER'] },
  { id: 'journal', label: 'Nhật ký canh tác', owner: 'Farming', roles: ['FARMER'] },
  { id: 'costs', label: 'Chi phí & báo cáo', owner: 'Farming', roles: ['FARMER'] },
  { id: 'listings', label: 'Bài đăng của tôi', owner: 'Trading', roles: ['FARMER'] },
  { id: 'marketplace', label: 'Thị trường', owner: 'Trading', roles: ['TRADER', 'ADMIN'] },
  { id: 'offers', label: 'Báo giá', owner: 'Trading', roles: ['FARMER', 'TRADER'] },
  { id: 'chat', label: 'Tin nhắn', owner: 'Chat', roles: ['FARMER', 'TRADER'] },
  { id: 'contracts', label: 'Hợp đồng', owner: 'Payment', roles: ['FARMER', 'TRADER'] },
  { id: 'deposits', label: 'Tiền cọc', owner: 'Payment', roles: ['FARMER', 'TRADER'] },
  { id: 'disputes', label: 'Tranh chấp', owner: 'Payment', roles: ['FARMER', 'TRADER', 'ADMIN'] },
  {
    id: 'notifications',
    label: 'Thông báo',
    owner: 'Notification',
    roles: ['FARMER', 'TRADER', 'ADMIN'],
  },
  { id: 'profile', label: 'Tài khoản', owner: 'User', roles: ['FARMER', 'TRADER', 'ADMIN'] },
  { id: 'accounts', label: 'Quản lý tài khoản', owner: 'User', roles: ['ADMIN'] },
] as const;
export type ModuleId = (typeof modules)[number]['id'];
export const modulesForRole = (role: Role) =>
  modules.filter((item) => (item.roles as readonly Role[]).includes(role));
export const roleLabels: Record<Role, string> = {
  FARMER: 'Nông dân',
  TRADER: 'Thương lái',
  ADMIN: 'Quản trị viên',
};
