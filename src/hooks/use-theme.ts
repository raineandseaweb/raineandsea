import { theme, ThemeName } from "@/lib/theme";
import { useEffect, useState } from "react";

/**
 * Hook for managing theme switching
 *
 * Usage:
 *   const { currentTheme, isDark, setTheme, toggleDarkMode } = useTheme();
 */
export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    // Initialize from localStorage if available (SSR-safe)
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") || "default") as ThemeName;
    }
    return "default";
  });
  const [isDark, setIsDark] = useState(() => {
    // Initialize from localStorage if available (SSR-safe)
    if (typeof window !== "undefined") {
      return localStorage.getItem("colorMode") === "dark";
    }
    return false;
  });

  useEffect(() => {
    // Read from localStorage again to ensure we have the latest values
    // This handles cases where _app.tsx might have updated localStorage
    const savedTheme = (localStorage.getItem("theme") ||
      "default") as ThemeName;
    const savedColorMode = localStorage.getItem("colorMode") === "dark";

    setCurrentTheme(savedTheme);
    setIsDark(savedColorMode);

    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (
        !localStorage.getItem("theme") &&
        !localStorage.getItem("colorMode")
      ) {
        theme.setDarkMode(e.matches);
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const changeTheme = (themeName: ThemeName) => {
    theme.setTheme(themeName);
    setCurrentTheme(themeName);
    localStorage.setItem("theme", themeName);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDark;
    theme.setDarkMode(newDarkMode);
    setIsDark(newDarkMode);
    localStorage.setItem("colorMode", newDarkMode ? "dark" : "light");
  };

  return {
    currentTheme,
    isDark,
    setTheme: changeTheme,
    toggleDarkMode,
  };
}
