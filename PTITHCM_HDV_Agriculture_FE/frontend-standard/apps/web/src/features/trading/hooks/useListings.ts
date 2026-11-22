import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ListingFilterQuery, Page, ListingDTO } from '@agri/contracts';
import { tradingApi } from '../../../shared/api/runtime';

/**
 * Hook to fetch paginated listings from Trading Service
 */
export function useListings(query: ListingFilterQuery = {}) {
  return useQuery<Page<ListingDTO>, Error>({
    queryKey: ['listings', query],
    queryFn: ({ signal }) => tradingApi.getListings(query, signal),
  });
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeolocationState {
  coords: Coordinates | null;
  loading: boolean;
  error: string | null;
  locationName: string | null;
  requestLocation: () => void;
  setPresetLocation: (name: string, coords: Coordinates) => void;
  clearLocation: () => void;
}

// Popular Mekong Delta agriculture hubs as convenient presets
export const LOCATION_PRESETS: { name: string; coords: Coordinates }[] = [
  { name: 'Cần Thơ', coords: { latitude: 10.0452, longitude: 105.7469 } },
  { name: 'An Giang (Long Xuyên)', coords: { latitude: 10.3833, longitude: 105.4167 } },
  { name: 'Đồng Tháp (Cao Lãnh)', coords: { latitude: 10.4578, longitude: 105.6324 } },
  { name: 'Sóc Trăng (ST25)', coords: { latitude: 9.6033, longitude: 105.9806 } },
  { name: 'Long An', coords: { latitude: 10.5369, longitude: 106.4092 } },
  { name: 'TP. Hồ Chí Minh', coords: { latitude: 10.7626, longitude: 106.6602 } },
];

/**
 * Hook to manage user GPS coordinates for proximity sorting
 */
export function useGeolocation(): GeolocationState {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationName('Vị trí hiện tại của bạn');
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Quyền truy cập vị trí bị từ chối.');
        } else {
          setError('Không thể lấy tọa độ vị trí hiện tại.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }, []);

  const setPresetLocation = useCallback((name: string, presetCoords: Coordinates) => {
    setCoords(presetCoords);
    setLocationName(name);
    setError(null);
  }, []);

  const clearLocation = useCallback(() => {
    setCoords(null);
    setLocationName(null);
    setError(null);
  }, []);

  return {
    coords,
    loading,
    error,
    locationName,
    requestLocation,
    setPresetLocation,
    clearLocation,
  };
}
