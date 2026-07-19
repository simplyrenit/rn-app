type LocationResult = (
  coordinates: { latitude: number; longitude: number } | null,
  address: string | null
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
  address: string | null
) => {
  if (!requestId) {
    return;
  }

  const callback = requests.get(requestId);
  requests.delete(requestId);
  callback?.(coordinates, address);
};

export const cancelLocationRequest = (requestId: string | undefined) => {
  if (requestId) {
    requests.delete(requestId);
  }
};
