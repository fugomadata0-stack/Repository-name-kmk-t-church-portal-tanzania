const listeners = new Set();

export function subscribeRealtimeEnterprise(callback) {
  if (typeof callback !== "function") return () => {};
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function emitRealtimeEnterprise(event) {
  listeners.forEach((fn) => fn(event));
}

export function getRealtimeListenerCount() {
  return listeners.size;
}
