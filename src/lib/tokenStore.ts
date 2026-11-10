const ACCESS_KEY = "repflow.accessToken";
const REFRESH_KEY = "repflow.refreshToken";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export const tokenStore = {
  getAccessToken(): string | null {
    return isBrowser() ? window.localStorage.getItem(ACCESS_KEY) : null;
  },
  getRefreshToken(): string | null {
    return isBrowser() ? window.localStorage.getItem(REFRESH_KEY) : null;
  },
  setTokens(accessToken: string, refreshToken: string): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACCESS_KEY, accessToken);
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  setAccessToken(accessToken: string): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACCESS_KEY, accessToken);
  },
  clear(): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};
