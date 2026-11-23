export type Plot = { id: string; name: string; area: string; season: string; crop: string };
export type Entry = {
  id: string;
  plotId: string;
  season: string;
  date: string;
  detail: string;
  amount?: number;
};
export type Data = { plots: Plot[]; journal: Entry[]; costs: Entry[] };
const initial: Data = {
  plots: [
    { id: 'sample-1', name: 'Ruộng A1', area: '2.500 m²', season: 'Thu Đông 2026', crop: 'ST25' },
    { id: 'sample-2', name: 'Ruộng B2', area: '1.800 m²', season: 'Hè Thu 2026', crop: 'OM18' },
  ],
  journal: [
    {
      id: 'j1',
      plotId: 'sample-1',
      season: 'Thu Đông 2026',
      date: '2026-10-11',
      detail: 'Bón phân lần 2',
    },
  ],
  costs: [
    {
      id: 'c1',
      plotId: 'sample-1',
      season: 'Thu Đông 2026',
      date: '2026-10-11',
      detail: 'Phân bón',
      amount: 720000,
    },
  ],
};
export const storageKey = 'agri-farming-demo-v1';
export function load(): Data {
  try {
    const saved = sessionStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as Data) : initial;
  } catch {
    return initial;
  }
}

export const selectedPlotKey = 'agri-demo-selected-plot';
export function selectedPlot(data: Data) {
  return (
    data.plots.find((plot) => plot.id === sessionStorage.getItem(selectedPlotKey)) ?? data.plots[0]
  );
}
