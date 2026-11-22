const paths: Record<string, string> = {
  dashboard: 'M3 10l9-7 9 7v10h-6v-7H9v7H3z',
  plots: 'M12 21v-9M12 14C5 14 3 9 3 5c6 0 9 3 9 9Zm0-3c0-5 4-8 9-8 0 5-3 8-9 8Z',
  journal: 'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3zM12 6v15',
  costs: 'M3 7V5l14-3v5M3 7h18v13H3zM16 11h5v5h-5z',
  listings: 'M4 8h16v13H4zM8 8V6a4 4 0 0 1 8 0v2',
  offers: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  chat: 'M3 4h18v13H9l-6 4zM7 9h10M7 13h6',
  send: 'M2 11l20-8-7 19-4-8-9-3Zm9 3L22 3',
  contracts: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15l2 2 4-4',
  disputes: 'M12 3L2 20h20L12 3zM12 10v4M12 17h.01',
  notifications: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  accounts:
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  document: 'M5 2h10l4 4v16H5zM9 11h6M9 15h6',
  back: 'M19 12H5M12 19l-7-7 7-7',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  plus: 'M12 5v14M5 12h14',
};
export function UiIcon({ name }: { name: string }) {
  const aliases: Record<string, string> = {
    marketplace: 'listings',
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
