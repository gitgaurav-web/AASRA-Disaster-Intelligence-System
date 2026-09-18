/**
 * Unified API Configuration
 * Seamlessly resolves backend endpoints for Web, PWA, and Native Mobile (Capacitor Android).
 */
export function getApiBaseUrl() {
  if (typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform()) {
    const customHost = localStorage.getItem("aasra_backend_url");
    if (customHost) return customHost;
    // Android emulator alias for host PC localhost
    return "http://10.0.2.2:8000";
  }
  return "";
}

export function buildApiUrl(endpoint) {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const path = cleanEndpoint.startsWith("/api") ? cleanEndpoint : `/api${cleanEndpoint}`;
  return base ? `${base}${path}` : path;
}
