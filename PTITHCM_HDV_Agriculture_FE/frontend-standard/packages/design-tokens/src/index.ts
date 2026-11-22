// Chuyển từ design-tokens.json V5. Web map thành CSS variables, Native dùng StyleSheet.
export const colors = {
  brand900: '#164735',
  brand700: '#246B45',
  harvest: '#D8AD47',
  ink: '#182820',
  background: '#F3F6F1',
  card: '#FFFFFF',
  border: '#DCE6DD',
  danger: '#A83939',
  muted: '#607267',
  surfaceSoft: '#EDF5ED',
  inputBorder: '#B9CBBD',
  info: '#2C6590',
} as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { control: 12, card: 18 } as const;
