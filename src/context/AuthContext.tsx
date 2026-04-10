import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import axios from "axios";
import {
  useSession,
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";
import useCsrfToken from "@/useCsrfToken";
import storage from "@/lib/storage";
import { User } from "@/types/user.type";
import { useEnv } from "./EnvContext";

type AuthProvider = "legacy" | "keycloak" | null;

type AuthContextType = {
  user: User | null;
  logout: () => void;
  refreshTokenIfNeeded: () => Promise<string | null>;
  refreshUserData: () => Promise<void>;
  isTokenExpired: (token: string) => boolean;
  authProvider: AuthProvider;
  keycloakSignIn: () => void;
};

interface CsrfTokenResponse {
  token: string;
}

interface AuthRefreshResponse {
  access_token: string;
  refresh_token: string;
  accessTokenExpiresIn: number;
}

interface UserResponse {
  data: User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authProvider, setAuthProvider] = useState<AuthProvider>(null);
  const { csrfToken } = useCsrfToken();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const keycloakExchangeRef = useRef(false);
  const loggingOutRef = useRef(false);
  const { data: session, status: sessionStatus } = useSession();

  // Decode and check if a token is expired
  const isTokenExpired = useCallback((token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      // Use 60 second buffer to refresh before token actually expires
      return Date.now() >= payload.exp * 1000 - 60000;
    } catch {
      return true;
    }
  }, []);

  // Schedule token refresh
  const scheduleRefresh = useCallback((delay: number) => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Set new timer - ensure it's at least 10 seconds
    const safeDelay = Math.max(delay, 10000);
    refreshTimerRef.current = setTimeout(() => {
      refreshTokenIfNeeded().catch(console.error);
    }, safeDelay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle logout - clear all tokens and user data
  const logout = useCallback(() => {
    loggingOutRef.current = true;

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    storage.removeItem("access_token");
    storage.removeItem("refresh_token");
    storage.removeItem("access_token_expiry");
    storage.removeItem("cart");

    keycloakExchangeRef.current = false;
    setUser(null);
    setAuthProvider(null);

    // If logged in via Keycloak, sign out from NextAuth (async/redirect)
    if (authProvider === "keycloak") {
      nextAuthSignOut({ callbackUrl: "/" });
    } else {
      loggingOutRef.current = false;
    }
  }, [authProvider]);

  // Refresh the token when needed
  const refreshTokenIfNeeded = useCallback(async (): Promise<string | null> => {
    const accessToken = storage.getItem("access_token");
    const refreshToken = storage.getItem("refresh_token");

    // If access token exists and isn't expired, just return it and schedule next refresh
    if (accessToken && !isTokenExpired(accessToken)) {
      try {
        // Still schedule next refresh based on token expiry
        const payload = JSON.parse(atob(accessToken.split(".")[1]));
        const timeToExpiry = payload.exp * 1000 - Date.now();
        const refreshTime = Math.max(timeToExpiry - 300000, 10000); // 5 min before expiry
        if (refreshToken) {
          scheduleRefresh(refreshTime);
        }
        return accessToken;
      } catch {}
    }

    // If no refresh token exists, can't refresh
    if (!refreshToken) return null;

    // Need to refresh the token
    try {
      let currentCsrfToken = csrfToken;

      if (!currentCsrfToken) {
        currentCsrfToken = storage.getItem("csrf_token") || "";
      }

      // If still empty, fetch a new one
      if (!currentCsrfToken) {
        try {
          const response = await axios.get<CsrfTokenResponse>(
            `${BACKEND_URL}/users/csrf-token`,
            {
              withCredentials: true,
            },
          );
          currentCsrfToken = response.data.token;
          storage.setItem("csrf_token", currentCsrfToken);
        } catch {
          logout();
          return null;
        }
      }

      const response = await axios.post<AuthRefreshResponse>(
        `${BACKEND_URL}/auth/refresh`,
        { refresh_token: refreshToken },
        {
          headers: {
            "X-CSRF-Token": currentCsrfToken,
          },
          withCredentials: true,
        },
      );

      const { access_token, refresh_token, accessTokenExpiresIn } =
        response.data;

      // Store new tokens
      storage.setItem("access_token", access_token);
      storage.setItem("refresh_token", refresh_token);
      storage.setItem(
        "access_token_expiry",
        String(Date.now() + accessTokenExpiresIn),
      );

      // Schedule next refresh - 5 min before expiry
      const nextRefreshDelay = Math.max(accessTokenExpiresIn - 300000, 10000);
      scheduleRefresh(nextRefreshDelay);

      return access_token;
    } catch {
      logout();
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csrfToken, isTokenExpired, logout, scheduleRefresh]);

  const { BACKEND_URL } = useEnv();

  // Fetch user data with auth token
  const fetchUserData = useCallback(
    async (provider: AuthProvider = "legacy") => {
      try {
        const accessToken = await refreshTokenIfNeeded();
        if (!accessToken) return;

        const { data } = await axios.get<UserResponse>(
          `${BACKEND_URL}/users/me`,
          {
            headers: {
              "X-CSRF-Token": csrfToken,
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        setUser(data.data);
        setAuthProvider(provider);
      } catch {
        // Only logout if not authenticated via Keycloak
        if (provider !== "keycloak") {
          logout();
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [csrfToken, logout, refreshTokenIfNeeded],
  );

  // Refresh user data - public function for components to use
  const refreshUserData = useCallback(async () => {
    await fetchUserData(authProvider ?? "legacy");
  }, [authProvider, fetchUserData]);

  // Keycloak sign in helper
  const keycloakSignIn = useCallback(() => {
    nextAuthSignIn("keycloak");
  }, []);

  // Handle Keycloak session — store backend tokens and fetch real user data
  useEffect(() => {
    // Skip if logout is in progress or session isn't ready
    if (loggingOutRef.current) return;

    if (
      sessionStatus !== "authenticated" ||
      !session?.accessToken ||
      authProvider === "legacy"
    ) {
      return;
    }

    // If localStorage already has a valid backend token, ensure user is loaded
    const existingToken = storage.getItem("access_token");
    if (
      existingToken &&
      !isTokenExpired(existingToken) &&
      storage.getItem("refresh_token")
    ) {
      // Always ensure provider is set; re-fetch user if not loaded yet
      if (authProvider !== "keycloak" || !user) {
        setAuthProvider("keycloak");
        fetchUserData("keycloak");
      }
      return;
    }

    // Use backend tokens from session if server-side exchange succeeded
    if (session.backendAccessToken) {
      storage.setItem("access_token", session.backendAccessToken);
      if (session.backendRefreshToken) {
        storage.setItem("refresh_token", session.backendRefreshToken);
      }
      if (session.backendAccessTokenExpiresIn) {
        storage.setItem(
          "access_token_expiry",
          String(Date.now() + session.backendAccessTokenExpiresIn),
        );
      }
      keycloakExchangeRef.current = true;
      setAuthProvider("keycloak");
      fetchUserData("keycloak");
      return;
    }

    // Fallback: server-side exchange failed, try client-side exchange
    if (keycloakExchangeRef.current) return;

    const exchangeClientSide = async () => {
      try {
        const currentCsrfToken =
          csrfToken || storage.getItem("csrf_token") || "";
        const res = await axios.post(
          `${BACKEND_URL}/auth/keycloak`,
          { token: session.accessToken },
          {
            withCredentials: true,
            headers: currentCsrfToken
              ? { "X-CSRF-Token": currentCsrfToken }
              : undefined,
          },
        );
        const { access_token, refresh_token, accessTokenExpiresIn } = res.data as {
          access_token?: string;
          refresh_token?: string;
          accessTokenExpiresIn?: number;
        };
        if (!access_token) return;

        keycloakExchangeRef.current = true;
        storage.setItem("access_token", access_token);
        if (refresh_token) {
          storage.setItem("refresh_token", refresh_token);
        }
        if (accessTokenExpiresIn) {
          storage.setItem(
            "access_token_expiry",
            String(Date.now() + accessTokenExpiresIn),
          );
        }
        setAuthProvider("keycloak");
        fetchUserData("keycloak");
      } catch (err) {
        console.error("Client-side Keycloak token exchange failed:", err);
      }
    };

    exchangeClientSide();
  }, [
    session,
    sessionStatus,
    authProvider,
    user,
    csrfToken,
    fetchUserData,
    isTokenExpired,
    BACKEND_URL,
  ]);

  // Reset logout guard when NextAuth session is cleared
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      loggingOutRef.current = false;
    }
  }, [sessionStatus]);

  // Initialize legacy authentication on app load
  useEffect(() => {
    // Only attempt legacy auth if not authenticated via Keycloak
    if (csrfToken && authProvider !== "keycloak") {
      // If a Keycloak session exists, let the Keycloak effect handle auth
      if (sessionStatus === "authenticated" && session?.accessToken) return;
      fetchUserData();
    }

    // Clean up timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [csrfToken, fetchUserData, authProvider, sessionStatus, session]);

  // Export the refreshTokenIfNeeded function to use with axios
  useEffect(() => {
    if (window) {
      // Make refreshTokenIfNeeded available to axios interceptor
      // @ts-expect-error - Add to window for axios to access
      window.__refreshTokenIfNeeded = refreshTokenIfNeeded;
    }
  }, [refreshTokenIfNeeded]);

  return (
    <AuthContext.Provider
      value={{
        user,
        logout,
        refreshTokenIfNeeded,
        refreshUserData,
        isTokenExpired,
        authProvider,
        keycloakSignIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
