"use client";
import useCsrfToken from "@/useCsrfToken";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import storage from "@/lib/storage";
import useAxios from "@/useAxios";
import { Oswald, DM_Sans } from "next/font/google";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

interface UserData {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

interface UserResponse {
  data: UserData;
}

const LoginPage = () => {
  const t = useTranslations("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const router = useRouter();
  const { csrfToken } = useCsrfToken();

  const axiosInstance = useAxios();
  const locale = useLocale();

  const { user, keycloakSignIn } = useAuth();

  useEffect(() => {
    if (user?.username) {
      router.replace("/");
    }
  }, [user, router]);

  if (user?.username) {
    return null;
  }

  const handleLoginError = (
    error: unknown,
    t: (key: string) => string,
  ): string => {
    // Check if error has response property (typical of axios errors)
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as {
        response?: { status?: number; data?: { message?: string } };
      };
      const status = axiosError.response?.status;
      const message = axiosError.response?.data?.message;

      switch (status) {
        case 403:
          return t("errors.csrfExpired");
        case 401:
          return t("errors.invalidCredentials");
        case 404:
          return t("errors.userNotFound");
        case 500:
          return t("errors.serverError");
        case undefined:
          return t("errors.networkError");
        default:
          return message
            ? `${t("errors.generic")}: ${message}`
            : t("errors.generic");
      }
    }
    return t("errors.generic");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post<LoginResponse>(
        "/auth/login",
        {
          username: email,
          password,
        },
        {
          headers: {
            "X-CSRF-Token": csrfToken,
          },
          withCredentials: true,
        },
      );

      const { access_token, refresh_token } = response.data;

      // Store tokens only if user has consented to cookies
      const hasConsented = storage.getItem("cookieConsent");
      const hasOptionalConsented = storage.getItem("optionalCookieConsent");
      if (hasConsented === "true" || hasOptionalConsented === "true") {
        storage.setItem("access_token", access_token);
        storage.setItem("refresh_token", refresh_token);
      }

      // Set Authorization header for future requests
      axiosInstance.defaults.headers.common["Authorization"] =
        `Bearer ${access_token}`;

      const userResponse = await axiosInstance.get<UserResponse>(`/users/me`, {
        headers: {
          Authorization: `Bearer ${response.data.access_token}`,
          "X-CSRF-Token": csrfToken,
        },
        withCredentials: true,
      });

      const userData = {
        id: userResponse.data.data.id,
        username: userResponse.data.data.username,
        role: userResponse.data.data.role,
        createdAt: userResponse.data.data.createdAt,
      };

      if (hasConsented === "true" || hasOptionalConsented === "true") {
        storage.setItem("userData", JSON.stringify(userData));
      }

      // Wait for the auth context to update before redirecting
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Redirect to the same locale
      window.location.href = `/${locale}/`;
    } catch (error) {
      setError(handleLoginError(error, t));
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center bg-zinc-950 px-4 ${oswald.variable} ${dmSans.variable}`}
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(245,158,11,0.12) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Amber left stripe */}
      <div className="pointer-events-none fixed inset-y-0 left-0 w-1 bg-amber-500" />

      <div className="relative w-full max-w-md">
        {/* Offset accent border */}
        <div className="absolute -right-2 -top-2 h-full w-full border border-amber-500/20" />

        <div className="relative bg-zinc-900 border border-zinc-800 p-10">
          {/* Amber top accent */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-amber-500" />

          <p
            className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-400 mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="h-px w-6 bg-amber-400" />
            {t("title")}
          </p>

          <h2
            className="text-3xl font-bold uppercase tracking-tight text-white mb-8"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("title")}
          </h2>

          {error && (
            <div className="mb-6 flex items-center gap-3 border border-red-500/30 bg-red-500/10 px-4 py-3">
              <svg
                className="h-4 w-4 shrink-0 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-red-300 text-xs">{error}</span>
            </div>
          )}

          {/* Primary SSO login */}
          <button
            type="button"
            onClick={keycloakSignIn}
            className="group w-full inline-flex items-center justify-center gap-2 bg-amber-500 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-zinc-950 transition-all duration-300 hover:bg-amber-400"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            {t("keycloakLogin")}
            <svg
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Toggle email/password form for legacy users */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setShowEmailForm((v) => !v)}
              className="text-xs text-zinc-600 hover:text-zinc-400 underline underline-offset-2 transition-colors"
            >
              {t("emailLogin")}
            </button>
          </div>

          {/* Legacy email/password form */}
          {showEmailForm && (
            <div className="mt-5 border-t border-zinc-800 pt-5">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold uppercase tracking-[0.15em] text-zinc-400 mb-1.5"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t("email")}
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold uppercase tracking-[0.15em] text-zinc-400 mb-1.5"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t("password")}
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full border border-zinc-700 px-6 py-3 text-xs font-bold uppercase tracking-widest text-zinc-300 transition-all hover:border-amber-500/60 hover:text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("title")}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;