export const env = {
  gatewayUrl: import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:8080',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  googleLoginPath: import.meta.env.VITE_GOOGLE_LOGIN_PATH ?? '',
};
