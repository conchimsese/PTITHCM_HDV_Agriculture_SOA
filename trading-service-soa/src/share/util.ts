export const generateRandomString = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let result = '';
  const randomBuffer = new Uint32Array(length);

  crypto.getRandomValues(randomBuffer);

  for (let i = 0; i < length; i++) {
    result += characters[randomBuffer[i] % charactersLength];
  }

  return result;
};

/**
 * Format decimal monetary string into canonical 2-decimal form (e.g. "4600000.00")
 * required by downstream Zod contracts (`^\d+(\.\d{2})?$`).
 */
export const formatMoney = (
  value: string | number | { toString(): string } | null | undefined,
  fallback = "0.00",
): string => {
  if (value === null || value === undefined) return fallback;
  const raw =
    typeof value === "number" ? value.toFixed(2) : value.toString().trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!match) return fallback;
  const intPart = match[1];
  const fracPart = (match[2] ?? "").padEnd(2, "0").slice(0, 2);
  return `${intPart}.${fracPart}`;
};

/** Haversine distance in kilometers between two WGS84 coordinates. */
export const haversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};
