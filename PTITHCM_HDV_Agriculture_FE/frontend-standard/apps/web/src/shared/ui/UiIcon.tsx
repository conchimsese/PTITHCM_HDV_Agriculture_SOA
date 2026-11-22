const paths: Record<string, string> = {
  dashboard: 'M3 10l9-7 9 7v10h-6v-7H9v7H3z',
  plots: 'M12 21v-9M12 14C5 14 3 9 3 5c6 0 9 3 9 9Zm0-3c0-5 4-8 9-8 0 5-3 8-9 8Z',
  journal: 'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3zM12 6v15',
  costs: 'M3 7V5l14-3v5M3 7h18v13H3zM16 11h5v5h-5z',
  listings: 'M4 8h16v13H4zM8 8V6a4 4 0 0 1 8 0v2',
  chat: 'M3 4h18v13H9l-6 4zM7 9h10M7 13h6',
  send: 'M2 11l20-8-7 19-4-8-9-3Zm9 3L22 3',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  document: 'M5 2h10l4 4v16H5zM9 11h6M9 15h6',
};
export function UiIcon({ name }: { name: string }) {
  const aliases: Record<string, string> = {
    marketplace: 'listings',
    accounts: 'profile',
    offers: 'document',
    deposits: 'costs',
  };
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="ui-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d={paths[aliases[name] ?? name] ?? paths.document} />
    </svg>
  );
}
