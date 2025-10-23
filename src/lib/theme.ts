/**
 * Theme system with CSS variables
 *
 * This theme uses CSS variables defined in styles/globals.css
 * Available themes: default, forest, forest-alt, ocean, ocean-alt, sunset, sunset-alt, twilight, twilight-alt
 * Each theme has its own color palette with light and dark variants
 *
 * Usage:
 *   className={`${theme.surface.primary} ${theme.text.primary}`}
 *   theme.setTheme('forest-alt')
 */

export type ThemeName =
  | "default"
  | "forest"
  | "forest-alt"
  | "ocean"
  | "ocean-alt"
  | "sunset"
  | "sunset-alt"
  | "iris"
  | "iris-alt";

export const theme = {
  // Surface colors using CSS variables
  surface: {
    primary: "bg-background",
    secondary: "bg-muted",
    tertiary: "bg-secondary",
    elevated: "bg-card",
  },

  // Text colors using CSS variables
  text: {
    primary: "text-foreground",
    secondary: "text-muted-foreground",
    tertiary: "text-muted-foreground opacity-70",
    muted: "text-muted-foreground opacity-50",
    inverse: "text-background",
  },

  // Border colors using CSS variables
  border: {
    default: "border-border",
    strong: "border-primary",
    muted: "border-border opacity-50",
  },

  // Status colors (still using Tailwind classes for variety)
  status: {
    success: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-800 dark:text-green-300",
      border: "border-green-200 dark:border-green-800",
      badge:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    },
    error: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-800 dark:text-red-300",
      border: "border-red-200 dark:border-red-800",
      badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    },
    warning: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-800 dark:text-yellow-300",
      border: "border-yellow-200 dark:border-yellow-800",
      badge:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    },
    info: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-800 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-800",
      badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    },
  },

  // Specific badges
  badge: {
    root: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    user: "bg-muted text-muted-foreground",
    verified:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",

    active:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    inactive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    draft:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",

    received:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    paid: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    shipped:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    completed:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    refunded:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    created: "bg-muted text-muted-foreground",
    fulfilled:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  },

  // Button variants using CSS variables
  button: {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-secondary text-secondary-foreground hover:opacity-80",
    destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    orange:
      "bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600",
  },

  // Card styles using CSS variables
  card: "bg-card text-card-foreground rounded-lg shadow-sm border border-border",

  // Input styles using CSS variables
  input:
    "border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground",

  // Link styles
  link: "text-primary hover:opacity-80",

  // Spinner using CSS variables
  spinner: "border-b-2 border-primary",

  // Divider using CSS variables
  divider: "border-b border-border",

  // Overlay
  overlay: "bg-black/20 dark:bg-black/50",

  // Shadows
  shadow: {
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl",
  },

  // Theme switching utilities
  setTheme: (themeName: ThemeName) => {
    const root = document.documentElement;
    root.setAttribute("data-theme", themeName);
  },

  setDarkMode: (isDark: boolean) => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  },

  getTheme: (): ThemeName => {
    return (document.documentElement.getAttribute("data-theme") ||
      "default") as ThemeName;
  },

  isDarkMode: (): boolean => {
    return document.documentElement.classList.contains("dark");
  },
} as const;

export type Theme = typeof theme;
