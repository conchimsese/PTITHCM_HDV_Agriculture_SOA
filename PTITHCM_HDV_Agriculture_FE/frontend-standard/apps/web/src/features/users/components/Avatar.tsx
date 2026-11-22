import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, useSession } from '../hooks/useUsers';
export function Avatar({
  path,
  name,
  editable = false,
}: {
  path: string | null;
  name: string;
  editable?: boolean;
}) {
  const session = useSession();
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const client = useQueryClient();
  const upload = useMutation({
    mutationFn: (file: File) => {
      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw new Error('Chọn ảnh JPEG, PNG hoặc WebP, tối đa 5 MiB.');
      const data = new FormData();
      data.append('file', file);
      return usersApi.uploadAvatar(data);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['users', session?.accountId] }),
  });
  useEffect(() => {
    setImage('');
    setError('');
    if (!path) return;
    const controller = new AbortController();
    let objectUrl = '';
    void usersApi
      .avatar(path, controller.signal)
      .then((blob) => {
        if (!controller.signal.aborted) {
          objectUrl = URL.createObjectURL(blob);
          setImage(objectUrl);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Không tải được ảnh đại diện.');
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, session?.accountId]);
  return (
    <div>
      <div className="user-avatar">
        {image ? (
          <img
            src={image}
            alt={`Ảnh đại diện ${name}`}
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          name.slice(0, 1)
        )}
      </div>
      {editable && (
        <label className="user-avatar-picker">
          {upload.isPending ? 'Đang tải ảnh…' : 'Đổi ảnh đại diện'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={upload.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
              event.target.value = '';
            }}
          />
          <small>JPEG, PNG, WebP · tối đa 5 MiB</small>
        </label>
      )}
      {(error || upload.error) && (
        <p role="alert" className="user-alert">
          {upload.error?.message || error}
        </p>
      )}
    </div>
  );
}
