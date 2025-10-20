import { useEffect, useState } from "react";

export function useCSRF() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchToken = async () => {
    try {
      const response = await fetch("/api/csrf-token", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setToken(data.csrfToken);
      }
    } catch (error) {
      console.error("Failed to fetch CSRF token:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  const refreshToken = () => {
    setLoading(true);
    fetchToken();
  };

  return { token, loading, refreshToken };
}
