import { useState } from 'react';
import { Text, View } from 'react-native';
import {
  profileFields,
  profileFormOf,
  profileUpdateOf,
  type PrivateProfile,
} from '@agri/contracts';
import { Action, Field, ui } from '../../../shared/ui/Screen';
import { useSaveProfile } from '../hooks/useUsers';
export function ProfileEditor({
  account,
  targetId,
}: {
  account: PrivateProfile;
  targetId?: string;
}) {
  const [form, setForm] = useState(() => profileFormOf(account));
  const [error, setError] = useState('');
  const mutation = useSaveProfile(targetId);
  if (account.role === 'ADMIN')
    return (
      <Text style={ui.subtitle}>
        Quản trị viên không có hồ sơ Nhà nông / Thương lái để chỉnh sửa.
      </Text>
    );
  return (
    <View style={ui.card}>
      <Text style={ui.label}>THÔNG TIN LIÊN HỆ</Text>
      {profileFields
        .filter((field) => field.key !== 'buyingArea' || account.role === 'TRADER')
        .map((field) => (
          <Field
            key={field.key}
            label={field.label}
            value={form[field.key]}
            maxLength={field.max}
            editable={!mutation.isPending}
            keyboardType={field.key === 'phone' ? 'phone-pad' : 'default'}
            onChangeText={(value) => {
              mutation.reset();
              setForm({ ...form, [field.key]: value });
            }}
          />
        ))}
      {(error || mutation.error) && (
        <Text style={ui.error} accessibilityRole="alert">
          {error || mutation.error?.message}
        </Text>
      )}
      {mutation.isSuccess && <Text style={ui.success}>Đã lưu hồ sơ.</Text>}
      <Action
        title={mutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
        disabled={mutation.isPending}
        onPress={() => {
          setError('');
          try {
            mutation.mutate(profileUpdateOf(account, form));
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Hồ sơ không hợp lệ.');
          }
        }}
      />
    </View>
  );
}
