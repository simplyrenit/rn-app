import type { SavedAddress } from "@/lib/addresses";

type LocationResult = (
  coordinates: { latitude: number; longitude: number } | null,
  address: string | null,
  /** Set only when the request was answered by saving an address (the add flow). */
  saved?: SavedAddress
) => void;

const requests = new Map<string, LocationResult>();
let nextRequestId = 0;

export const createLocationRequest = (callback: LocationResult) => {
  const requestId = `location-${Date.now()}-${nextRequestId++}`;
  requests.set(requestId, callback);
  return requestId;
};

export const resolveLocationRequest = (
  requestId: string | undefined,
  coordinates: { latitude: number; longitude: number } | null,
  address: string | null,
  saved?: SavedAddress
) => {
  if (!requestId) {
    return;
  }

  const callback = requests.get(requestId);
  requests.delete(requestId);
  callback?.(coordinates, address, saved);
};

export const cancelLocationRequest = (requestId: string | undefined) => {
  if (requestId) {
    requests.delete(requestId);
  }
};
