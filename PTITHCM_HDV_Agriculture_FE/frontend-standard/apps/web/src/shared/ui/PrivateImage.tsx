import { useEffect, useState } from 'react';
import { privateRequest } from '../api/media';
import { useAccount } from '../hooks/useAccount';
export function PrivateImage({ path }: { path: string }) {
  const session = useAccount();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    void privateRequest(path, undefined, controller.signal)
      .then((r) => r.blob())
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Không tải được ảnh');
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, session?.accountId]);
  return url ? <img src={url} alt="Ảnh trao đổi riêng tư" /> : <p>{error || 'Đang tải ảnh…'}</p>;
}
