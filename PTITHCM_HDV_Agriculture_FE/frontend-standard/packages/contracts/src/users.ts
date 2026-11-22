import { z } from 'zod';
import { roleSchema } from './auth';
import { pageSchema } from './common';

export const accountStatusSchema = z.enum(['UNVERIFIED', 'ACTIVE', 'LOCKED', 'INACTIVE']);
export type AccountStatus = z.infer<typeof accountStatusSchema>;
export const avatarUploadSchema = z.object({
  mediaId: z.uuid(),
  avatarUrl: z.string(),
  contentType: z.string(),
  sizeBytes: z.number(),
});
export function userMediaPath(url: string | null | undefined): string | null {
  return url && /^\/api\/v1\/users\/media\/[0-9a-f-]{36}$/.test(url) ? url : null;
}
const optionalText = z.string().nullable();
const contacts = {
  phone: optionalText,
  address: optionalText,
  province: optionalText,
  district: optionalText,
  avatarUrl: optionalText,
};
export const farmerProfileSchema = z.object({ fullName: z.string(), ...contacts });
export const traderProfileSchema = z.object({
  businessName: z.string(),
  ...contacts,
  buyingArea: optionalText,
});
export const accountSummarySchema = z.object({
  accountId: z.uuid(),
  username: z.string(),
  email: z.email(),
  role: roleSchema,
  status: accountStatusSchema,
  createdAt: z.string(),
});
const details = { ...accountSummarySchema.shape, emailVerifiedAt: optionalText };
export const privateProfileSchema = z.discriminatedUnion('role', [
  z.object({ ...details, role: z.literal('FARMER'), profile: farmerProfileSchema }),
  z.object({ ...details, role: z.literal('TRADER'), profile: traderProfileSchema }),
  z.object({ ...details, role: z.literal('ADMIN'), profile: z.null() }),
]);
export const publicProfileSchema = z.object({
  accountId: z.uuid(),
  displayName: z.string(),
  avatarUrl: optionalText,
  province: optionalText,
  district: optionalText,
  joinedAt: z.string(),
});
export const accountsPageSchema = pageSchema(accountSummarySchema);
export type PrivateProfile = z.infer<typeof privateProfileSchema>;
export type ProfileUpdate =
  z.infer<typeof farmerProfileSchema> | z.infer<typeof traderProfileSchema>;
export type AccountFilters = {
  page: number;
  role?: z.infer<typeof roleSchema>;
  status?: AccountStatus;
};
export const accountStatusLabels: Record<AccountStatus, string> = {
  UNVERIFIED: 'Chưa xác minh',
  ACTIVE: 'Đang hoạt động',
  LOCKED: 'Đã khóa',
  INACTIVE: 'Ngừng hoạt động',
};
export const userRoleLabels = { FARMER: 'Nhà nông', TRADER: 'Thương lái', ADMIN: 'Quản trị viên' };
export const profileFields = [
  { key: 'name', label: 'Họ tên / Tên doanh nghiệp', max: 150 },
  { key: 'phone', label: 'Số điện thoại', max: 20 },
  { key: 'address', label: 'Địa chỉ', max: 255 },
  { key: 'province', label: 'Tỉnh / Thành phố', max: 100 },
  { key: 'district', label: 'Quận / Huyện', max: 100 },
  { key: 'buyingArea', label: 'Khu vực thu mua', max: 255 },
] as const;
export type ProfileForm = Record<(typeof profileFields)[number]['key'], string>;
export function profileFormOf(account: PrivateProfile): ProfileForm {
  const profile = account.profile;
  return {
    name:
      account.role === 'FARMER'
        ? account.profile.fullName
        : account.role === 'TRADER'
          ? account.profile.businessName
          : '',
    phone: profile?.phone ?? '',
    address: profile?.address ?? '',
    province: profile?.province ?? '',
    district: profile?.district ?? '',
    buyingArea: account.role === 'TRADER' ? (account.profile.buyingArea ?? '') : '',
  };
}
export function profileUpdateOf(account: PrivateProfile, form: ProfileForm): ProfileUpdate {
  if (!form.name.trim()) throw new Error('Vui lòng nhập tên hồ sơ.');
  const value = (text: string) => text.trim() || null;
  const base = {
    phone: value(form.phone),
    address: value(form.address),
    province: value(form.province),
    district: value(form.district),
    avatarUrl: account.profile?.avatarUrl ?? null,
  };
  if (account.role === 'ADMIN')
    throw new Error('Quản trị viên không có hồ sơ kinh doanh để chỉnh sửa.');
  return account.role === 'FARMER'
    ? { ...base, fullName: form.name.trim() }
    : { ...base, businessName: form.name.trim(), buyingArea: value(form.buyingArea) };
}
