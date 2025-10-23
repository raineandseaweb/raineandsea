import { theme, ThemeName } from "@/lib/theme";
import { useEffect, useState } from "react";

/**
 * Hook for managing theme switching
 *
 * Usage:
 *   const { currentTheme, isDark, setTheme, toggleDarkMode } = useTheme();
 */
export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>("default");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Initialize theme on mount
    setCurrentTheme(theme.getTheme());
    setIsDark(theme.isDarkMode());

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
