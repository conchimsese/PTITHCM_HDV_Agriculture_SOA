import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '../../../shared/api/runtime';

export type LivePlot = {
  plotId: string;
  name: string;
  area?: number | string;
  location: string;
  description?: string | null;
  latitude?: number;
  longitude?: number;
  isVisible?: boolean;
};

export type LiveSeason = {
  cropSeasonId: string;
  plotId?: string;
  seasonName: string;
  cropType: string;
  startDate?: string;
  expectedYield?: number | string | null;
  actualYield?: number | string | null;
  status?: string;
};

export type LiveSeasonReport = {
  cropSeason?: LiveSeason;
  plot?: LivePlot;
  farmingLogs: {
    logId: string;
    workDate: string;
    description?: string | null;
    workType: string;
    quantity?: number | string | null;
    unit?: string | null;
  }[];
  costs: {
    costId: string;
    incurredDate: string;
    category: string;
    amount: string | number;
    description?: string | null;
  }[];
  summary: {
    totalCost: number | string;
    expectedYield?: number | string | null;
    actualYield?: number | string | null;
  };
};

export const workTypeLabels: Record<string, string> = {
  LAND_PREPARATION: 'Làm đất',
  PLANTING: 'Gieo sạ',
  FERTILIZING: 'Bón phân',
  WATERING: 'Tưới nước',
  PEST_CONTROL: 'Phòng trừ sâu bệnh',
  HARVESTING: 'Thu hoạch',
};

export const seasonStatusLabels: Record<string, string> = {
  PLANNED: 'Sắp bắt đầu',
  IN_PROGRESS: 'Đang canh tác',
  ACTIVE: 'Đang canh tác',
  COMPLETED: 'Đã thu hoạch',
};

export function usePlots(accountId?: string, enabled = true) {
  return useQuery({
    queryKey: ['farming', accountId, 'plots'],
    enabled: Boolean(accountId && enabled),
    queryFn: ({ signal }) =>
      http.request<{ items: LivePlot[] }>('/api/v1/plots?size=100', { signal }),
  });
}

export function usePlotSeasons(accountId?: string, plotId?: string, enabled = true) {
  return useQuery({
    queryKey: ['farming', accountId, 'seasons', plotId],
    enabled: Boolean(accountId && plotId && enabled),
    queryFn: ({ signal }) =>
      http.request<{ items: LiveSeason[] }>(
        '/api/v1/plots/' + encodeURIComponent(plotId!) + '/crop-seasons',
        {
          signal,
        },
      ),
  });
}

export function useSeasonReport(accountId?: string, seasonId?: string, enabled = true) {
  return useQuery({
    queryKey: ['farming', accountId, 'report', seasonId],
    enabled: Boolean(accountId && seasonId && enabled),
    queryFn: ({ signal }) =>
      http.request<LiveSeasonReport>(
        '/api/v1/crop-seasons/' + encodeURIComponent(seasonId!) + '/report',
        { signal },
      ),
  });
}

export function useSaveFarming(accountId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({ path, body }: { path: string; body: Record<string, unknown> }) =>
      http.request(path, { method: 'POST', body }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['farming', accountId] }),
  });
}
