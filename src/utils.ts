export function makeRequestId() {
  return `req_${Math.random().toString(16).slice(2, 8)}`;
}

export function copyToClipboard(text: string) {
  if (!navigator.clipboard) return Promise.reject(new Error("Clipboard unavailable"));
  return navigator.clipboard.writeText(text);
}
