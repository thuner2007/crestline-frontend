"use client";
import useCsrfToken from "@/useCsrfToken";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import storage from "@/lib/storage";
import useAxios from "@/useAxios";

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white p-12 md:p-16 rounded-2xl shadow-xl w-full max-w-2xl">
        <h2 className="text-3xl font-bold mb-8">{t("title")}</h2>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Primary SSO login */}
        <button
          type="button"
          onClick={keycloakSignIn}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 flex items-center justify-center gap-2 text-base font-semibold"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          {t("keycloakLogin")}
        </button>

        {/* Toggle email/password form for legacy users */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowEmailForm((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            {t("emailLogin")}
          </button>
        </div>

        {/* Legacy email/password form */}
        {showEmailForm && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t("email")}
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-600 focus:border-purple-600 sm:text-sm"
                  required
                />
              </div>
              <div className="mb-3">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t("password")}
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-600 focus:border-purple-600 sm:text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 text-sm"
              >
                {t("title")}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;