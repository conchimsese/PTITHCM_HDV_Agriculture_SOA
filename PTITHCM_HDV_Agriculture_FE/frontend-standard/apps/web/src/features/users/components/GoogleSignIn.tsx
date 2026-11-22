import { useEffect, useRef, useState } from 'react';
import type { TokenPair } from '@agri/contracts';
import { tokenPairSchema } from '@agri/contracts';
import { http } from '../../../shared/api/runtime';
import { env } from '../../../shared/config/env';

type GoogleIdentity = {
  initialize: (options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }) => void;
  renderButton: (element: HTMLElement, options: Record<string, string | number>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}
let sdkPromise: Promise<GoogleIdentity> | undefined;
function loadGoogle() {
  if (window.google) return Promise.resolve(window.google.accounts.id);
  if (!sdkPromise) {
    sdkPromise = new Promise<GoogleIdentity>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () =>
        window.google
          ? resolve(window.google.accounts.id)
          : reject(new Error('Không tải được Google.'));
      script.onerror = () => {
        script.remove();
        sdkPromise = undefined;
        reject(new Error('Không kết nối được Google. Vui lòng tải lại trang.'));
      };
      document.head.append(script);
    });
  }
  return sdkPromise;
}

export function GoogleSignIn({
  onSuccess,
  disabled,
}: {
  onSuccess: (tokens: TokenPair) => void;
  disabled: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onSuccess);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const configured = Boolean(env.googleClientId && env.googleLoginPath);
  useEffect(() => {
    callback.current = onSuccess;
  }, [onSuccess]);
  useEffect(() => {
    if (!configured) return;
    let active = true;
    void loadGoogle()
      .then((google) => {
        if (!active || !container.current) return;
        google.initialize({
          client_id: env.googleClientId,
          callback: (response) => {
            if (!active) return;
            setBusy(true);
            setError('');
            void http
              .request(env.googleLoginPath, {
                method: 'POST',
                auth: false,
                body: { credential: response.credential },
                schema: tokenPairSchema,
              })
              .then((tokens) => {
                if (active) callback.current(tokens);
              })
              .catch((reason: unknown) => {
                if (active)
                  setError(reason instanceof Error ? reason.message : 'Đăng nhập Google thất bại.');
              })
              .finally(() => {
                if (active) setBusy(false);
              });
          },
        });
        google.renderButton(container.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          locale: 'vi',
          width: 320,
        });
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Không tải được Google.');
      });
    return () => {
      active = false;
    };
  }, [configured]);

  return (
    <div className="google-section">
      {configured ? (
        <div inert={disabled || busy} aria-busy={busy} className="google-button" ref={container} />
      ) : (
        <button
          className="google-fallback"
          type="button"
          disabled={disabled}
          onClick={() =>
            setError(
              'Đăng nhập Google chưa được kích hoạt. Vui lòng dùng số điện thoại hoặc email.',
            )
          }
        >
          <span className="google-g" aria-hidden="true">
            G
          </span>
          Đăng nhập bằng Google
        </button>
      )}
      {busy && (
        <p role="status" className="field-hint">
          Đang xác thực với Google…
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
