// React Native's multipart transport supports URI parts; DOM typings omit this overload.
export {};
declare global {
  interface FormData {
    append(name: string, value: { uri: string; type: string; name: string }): void;
  }
}
