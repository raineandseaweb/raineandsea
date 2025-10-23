import { NavigationProgress } from "@/components/navigation-progress";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/contexts/auth-context";
import { CartProvider } from "@/contexts/cart-context";
import { theme } from "@/lib/theme";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Load theme from localStorage or use defaults
    const savedTheme = localStorage.getItem("theme") || "default";
    const savedColorMode = localStorage.getItem("colorMode") || "light";

    theme.setTheme(savedTheme as any);
    theme.setDarkMode(savedColorMode === "dark");
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <NavigationProgress />
          <Component {...pageProps} />
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
