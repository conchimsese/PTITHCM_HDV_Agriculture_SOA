import { useState } from 'react';
import {
  profileFields,
  profileFormOf,
  profileUpdateOf,
  type PrivateProfile,
} from '@agri/contracts';
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
  const save = useSaveProfile(targetId);
  if (account.role === 'ADMIN') return <p>Quản trị viên không có hồ sơ Nhà nông / Thương lái.</p>;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError('');
        try {
          save.mutate(profileUpdateOf(account, form));
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Hồ sơ không hợp lệ.');
        }
      }}
    >
      <fieldset disabled={save.isPending} className="user-form-grid">
        {profileFields
          .filter((field) => field.key !== 'buyingArea' || account.role === 'TRADER')
          .map((field) => (
            <label key={field.key}>
              {field.label}
              <input
                name={field.key}
                type={field.key === 'phone' ? 'tel' : 'text'}
                maxLength={field.max}
                required={field.key === 'name'}
                value={form[field.key]}
                onChange={(event) => {
                  save.reset();
                  setForm({ ...form, [field.key]: event.target.value });
                }}
              />
            </label>
          ))}
      </fieldset>
      {(error || save.error) && (
        <p className="user-alert" role="alert">
          {error || save.error?.message}
        </p>
      )}
      {save.isSuccess && (
        <p className="user-success" role="status">
          Đã lưu hồ sơ.
        </p>
      )}
      <button className="user-primary" disabled={save.isPending}>
        {save.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
      </button>
    </form>
  );
}
