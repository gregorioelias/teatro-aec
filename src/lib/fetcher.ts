// Agrega el header necesario para que ngrok no intercepte los requests del browser
export function apiFetch(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(options.headers || {}),
    },
  });
}
