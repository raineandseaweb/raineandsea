import { NavigationProgress } from "@/components/navigation-progress";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/contexts/auth-context";
import { CartProvider } from "@/contexts/cart-context";
import type { AppProps } from "next/app";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
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
