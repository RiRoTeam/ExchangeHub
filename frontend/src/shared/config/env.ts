function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const apiBaseUrl = configuredApiBaseUrl
  ? trimTrailingSlash(configuredApiBaseUrl)
  : "/api";
