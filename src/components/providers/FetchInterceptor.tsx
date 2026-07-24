"use client";

import { useEffect } from "react";

export default function FetchInterceptor() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;

    window.fetch = async (input, init) => {
      try {
        const response = await originalFetch(input, init);

        if (response.status === 401) {
          // Clear authentication tokens from localStorage
          localStorage.removeItem("user");
          localStorage.removeItem("tokens");

          // Force redirect to login page if we aren't already there
          if (!window.location.pathname.startsWith("/login")) {
            window.location.href = "/login?expired=true";
          }
        }

        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
