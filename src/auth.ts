import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { jwtDecode } from "jwt-decode";

export const SCOPES = {
  GET: "revsticks:get",
  CREATE: "revsticks:create",
  UPDATE: "revsticks:update",
  DELETE: "revsticks:delete",
} as const;

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

interface KeycloakAccessToken {
  scope?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
}

function parseScopesFromToken(accessToken: string): string[] {
  try {
    const decoded = jwtDecode<KeycloakAccessToken>(accessToken);
    const scopes: string[] = [];

    // 1. Top-level "scope" claim (space-separated string)
    if (decoded.scope) {
      scopes.push(...decoded.scope.split(" "));
    }

    // 2. realm_access.roles (Keycloak realm roles)
    if (decoded.realm_access?.roles) {
      scopes.push(...decoded.realm_access.roles);
    }

    // 3. resource_access.<clientId>.roles (Keycloak client roles)
    if (decoded.resource_access) {
      for (const client of Object.values(decoded.resource_access)) {
        if (client.roles) {
          scopes.push(...client.roles);
        }
      }
    }

    return [...new Set(scopes)]; // deduplicate
  } catch {
    return [];
  }
}

declare module "next-auth" {
  interface Session {
    idToken?: string;
    accessToken?: string;
    error?: string;
    scopes: string[];
    backendAccessToken?: string;
    backendRefreshToken?: string;
    backendAccessTokenExpiresIn?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    lastRefreshCheck?: number;
    error?: string;
    scopes: string[];
    backendAccessToken?: string;
    backendRefreshToken?: string;
    backendAccessTokenExpiresIn?: number;
  }
}

const KEYCLOAK_CHECK_INTERVAL = 30 * 1000; // check Keycloak session every 30 seconds

async function refreshAccessToken(token: import("next-auth/jwt").JWT) {
  try {
    const response = await fetch(
      `${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.AUTH_KEYCLOAK_ID!,
          client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
          grant_type: "refresh_token",
          refresh_token: token.refreshToken!,
        }),
      },
    );

    const refreshed = await response.json();

    if (!response.ok) throw refreshed;

    const newAccessToken = refreshed.access_token as string;

    return {
      ...token,
      accessToken: newAccessToken,
      refreshToken: (refreshed.refresh_token as string) ?? token.refreshToken,
      idToken: (refreshed.id_token as string) ?? token.idToken,
      accessTokenExpires: Date.now() + (refreshed.expires_in as number) * 1000,
      lastRefreshCheck: Date.now(),
      scopes: parseScopesFromToken(newAccessToken),
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        const accessToken = account.access_token as string;

        // Exchange Keycloak token for backend JWT tokens
        let backendTokens: {
          backendAccessToken?: string;
          backendRefreshToken?: string;
          backendAccessTokenExpiresIn?: number;
        } = {};
        try {
          const res = await fetch(`${process.env.BACKEND_URL}/auth/keycloak`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: accessToken }),
          });
          if (res.ok) {
            const data = await res.json();
            backendTokens = {
              backendAccessToken: data.access_token,
              backendRefreshToken: data.refresh_token,
              backendAccessTokenExpiresIn: data.accessTokenExpiresIn,
            };
          } else {
            console.error("Backend token exchange failed:", res.status);
          }
        } catch (err) {
          console.error("Backend token exchange error:", err);
        }

        return {
          ...token,
          accessToken,
          refreshToken: account.refresh_token,
          idToken: account.id_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 60 * 1000,
          lastRefreshCheck: Date.now(),
          scopes: parseScopesFromToken(accessToken),
          ...backendTokens,
        };
      }

      // Periodically check Keycloak session validity even if the access token
      // hasn't expired yet — this detects sessions killed in the Keycloak admin panel
      if (
        Date.now() <
        (token.lastRefreshCheck ?? 0) + KEYCLOAK_CHECK_INTERVAL
      ) {
        return token;
      }

      return refreshAccessToken(token);
    },
    session({ session, token }) {
      session.idToken = token.idToken;
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.scopes = token.scopes ?? [];
      session.backendAccessToken = token.backendAccessToken;
      session.backendRefreshToken = token.backendRefreshToken;
      session.backendAccessTokenExpiresIn = token.backendAccessTokenExpiresIn;
      return session;
    },
  },
});
