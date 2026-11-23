type IconSpec = {
  paths?: readonly string[];
  circles?: readonly { cx: number; cy: number; r: number }[];
  rects?: readonly { x: number; y: number; width: number; height: number; rx?: number }[];
};

const icons: Record<string, IconSpec> = {
  dashboard: { paths: ['M3 10l9-7 9 7v10h-6v-7H9v7H3z'] },
  plots: {
    paths: ['M12 21v-9', 'M12 14C5 14 3 9 3 5c6 0 9 3 9 9Z', 'M12 11c0-5 4-8 9-8 0 5-3 8-9 8Z'],
  },
  rice: {
    paths: ['M12 21v-9', 'M12 14C5 14 3 9 3 5c6 0 9 3 9 9Z', 'M12 11c0-5 4-8 9-8 0 5-3 8-9 8Z'],
  },
  journal: { paths: ['M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z', 'M12 6v15'] },
  costs: {
    paths: ['M3 7V5l14-3v5', 'M3 7h18v13H3z', 'M16 11h5v5h-5z'],
  },
  listings: {
    paths: ['M4 8h16v13H4z', 'M8 8V6a4 4 0 0 1 8 0v2'],
  },
  offers: {
    paths: ['M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z'],
    circles: [{ cx: 7, cy: 7, r: 1 }],
  },
  chat: { paths: ['M3 4h18v13H9l-6 4z', 'M7 9h10', 'M7 13h6'] },
  send: { paths: ['M2 11l20-8-7 19-4-8-9-3Z', 'M11 14L22 3'] },
  contracts: {
    paths: [
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      'M14 2v6h6',
      'M9 15l2 2 4-4',
    ],
  },
  disputes: {
    paths: ['M12 3L2 20h20L12 3z', 'M12 10v4', 'M12 17h.01'],
  },
  notifications: {
    paths: ['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
  },
  accounts: {
    paths: [
      'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
      'M23 21v-2a4 4 0 0 0-3-3.87',
      'M16 3.13a4 4 0 0 1 0 7.75',
    ],
    circles: [{ cx: 9, cy: 7, r: 4 }],
  },
  profile: {
    paths: ['M4 21a8 8 0 0 1 16 0'],
    circles: [{ cx: 12, cy: 8, r: 4 }],
  },
  user: {
    paths: ['M4 21a8 8 0 0 1 16 0'],
    circles: [{ cx: 12, cy: 8, r: 4 }],
  },
  document: { paths: ['M5 2h10l4 4v16H5z', 'M9 11h6', 'M9 15h6'] },
  back: { paths: ['M19 12H5', 'M12 19l-7-7 7-7'] },
  filter: { paths: ['M22 3H2l8 9.46V19l4 2v-8.54L22 3z'] },
  plus: { paths: ['M12 5v14', 'M5 12h14'] },
  search: {
    paths: ['m21 21-4.35-4.35'],
    circles: [{ cx: 11, cy: 11, r: 7 }],
  },
  pin: {
    paths: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z'],
    circles: [{ cx: 12, cy: 10, r: 3 }],
  },
  scale: {
    paths: [
      'M12 3v18',
      'M5 21h14',
      'M3 7h18',
      'M6 7l-3 7a3 3 0 0 0 6 0L6 7Z',
      'M18 7l-3 7a3 3 0 0 0 6 0l-3-7Z',
    ],
  },
  area: {
    paths: ['M3 8V3h5', 'M16 3h5v5', 'M21 16v5h-5', 'M8 21H3v-5', 'M9 9h6v6H9z'],
  },
  chart: {
    paths: ['M3 3v18h18', 'M7 16v-4', 'M12 16V8', 'M17 16v-6'],
  },
  camera: {
    paths: ['M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z'],
    circles: [{ cx: 12, cy: 13, r: 3.5 }],
  },
  check: {
    paths: ['M20 6 9 17l-5-5'],
  },
  info: {
    paths: ['M12 16v-4', 'M12 8h.01'],
    circles: [{ cx: 12, cy: 12, r: 9 }],
  },
  copy: {
    paths: ['M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
    rects: [{ x: 9, y: 9, width: 13, height: 13, rx: 2 }],
  },
  chevron: {
    paths: ['m6 9 6 6 6-6'],
  },
  farmer: {
    paths: [
      'M12 21v-8',
      'M12 13C6.5 13 4 8.5 4 4c5 0 8 2.5 8 9Z',
      'M12 11c0-5 3.5-8 8-8 0 4.5-3 8-8 8Z',
      'M6 21h12',
    ],
  },
  trader: {
    paths: ['M16 3h5v5', 'M21 3 13 11', 'M8 21H3v-5', 'M3 21l8-8'],
  },
  sparkle: {
    paths: [
      'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z',
      'M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z',
    ],
  },
  close: {
    paths: ['M18 6 6 18', 'M6 6l12 12'],
  },
  refresh: {
    paths: ['M21 12a9 9 0 1 1-2.64-6.36', 'M21 3v6h-6'],
  },
  compass: {
    paths: ['m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12Z'],
    circles: [{ cx: 12, cy: 12, r: 9 }],
  },
  lock: {
    paths: ['M7 11V7a5 5 0 0 1 10 0v4'],
    rects: [{ x: 5, y: 11, width: 14, height: 10, rx: 2 }],
  },
  bag: {
    paths: [
      'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z',
      'M3 6h18',
      'M16 10a4 4 0 0 1-8 0',
    ],
  },
  edit: {
    paths: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'],
  },
  ban: {
    paths: ['m5.64 5.64 12.72 12.72'],
    circles: [{ cx: 12, cy: 12, r: 9 }],
  },
  undo: {
    paths: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  },
  clock: {
    paths: ['M12 7v5l3 2'],
    circles: [{ cx: 12, cy: 12, r: 9 }],
  },
};

const aliases: Record<string, string> = {
  marketplace: 'listings',
  deposits: 'costs',
};

export function UiIcon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const spec = icons[aliases[name] ?? name] ?? icons.document;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className ? `ui-icon ${className}` : 'ui-icon'}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {spec.paths?.map((d, index) => (
        <path key={`p-${index}`} d={d} />
      ))}
      {spec.circles?.map((circle, index) => (
        <circle key={`c-${index}`} cx={circle.cx} cy={circle.cy} r={circle.r} />
      ))}
      {spec.rects?.map((rect, index) => (
        <rect
          key={`r-${index}`}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          rx={rect.rx}
        />
      ))}
    </svg>
  );
}
