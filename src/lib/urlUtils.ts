'use client';

/**
 * Utility class for handling URL operations and query parameters
 */
export class UrlUtils {
  /**
   * Adds query parameters to a URL
   * @param baseUrl - The base URL (can include existing query params)
   * @param params - Object with key-value pairs to add as query parameters
   * @returns The complete URL with query parameters
   */
  static addQueryParams(
    baseUrl: string,
    params: Record<string, string | number>
  ): string {
    try {
      const url = new URL(baseUrl, window.location.origin);

      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value.toString());
      });

      return url.pathname + url.search;
    } catch (error) {
      console.error('Error constructing URL with query params:', error);
      return baseUrl;
    }
  }

  /**
   * Builds a URL with the backend URL and adds query parameters
   * @param backendUrl - The backend base URL
   * @param path - The API endpoint path
   * @param params - Object with key-value pairs to add as query parameters
   * @returns The complete URL with query parameters
   */
  static buildApiUrl(
    backendUrl: string,
    path: string,
    params?: Record<string, string | number>
  ): string {
    try {
      const fullUrl = `${backendUrl}${path}`;

      if (params) {
        return this.addQueryParams(fullUrl, params);
      }

      return path; // Return just the path for axios to use with baseURL
    } catch (error) {
      console.error('Error building API URL:', error);
      return path;
    }
  }

  /**
   * Gets query parameter value from current URL
   * @param paramName - The parameter name to get
   * @returns The parameter value or null if not found
   */
  static getQueryParam(paramName: string): string | null {
    if (typeof window === 'undefined') return null;

    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(paramName);
  }

  /**
   * Updates the current URL with new query parameters without page reload
   * @param params - Object with key-value pairs to add/update as query parameters
   */
  static updateQueryParams(params: Record<string, string | number>): void {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value.toString());
    });

    window.history.pushState({}, '', url.toString());
  }
}

export default UrlUtils;
