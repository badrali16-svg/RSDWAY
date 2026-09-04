const DEVICE_ID_KEY = "rsdway.device_id";

function createDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `device-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;

    const deviceId = createDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  } catch {
    const existing = sessionStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;

    const deviceId = createDeviceId();
    sessionStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  }
}