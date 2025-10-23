"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams?.get("returnUrl") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
      } else {
        setResendMessage("");
        router.push(returnUrl);
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const showResend = /verify your email/i.test(error);

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setResendMessage("");
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        setResendMessage(
          "Verification email sent. Please check your inbox and spam folder."
        );
      } else {
        const data = await response.json();
        setResendMessage(data.error || "Unable to resend verification email.");
      }
    } catch {
      setResendMessage("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-w-[400px]">
      <div className="bg-card rounded-lg shadow-sm border p-8">
        <h1 className="text-2xl font-semibold text-foreground mb-6">
          Sign in to your account
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-accent border border-border rounded-md">
            <p className="text-sm text-destructive">{error}</p>
            {showResend && (
              <div className="mt-3 space-y-2">
                <Button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading || !email}
                  className="w-full"
                >
                  {resendLoading ? "Sending..." : "Resend verification email"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Or visit the{" "}
                  <Link
                    href="/auth/verify-email"
                    className="text-primary hover:text-primary/80 font-medium"
                  >
                    verification page
                  </Link>{" "}
                  to learn more.
                </p>
              </div>
            )}
          </div>
        )}

        {resendMessage && (
          <div className="mb-4 p-3 bg-accent border border-border rounded-md">
            <p className="text-sm text-primary">{resendMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Enter your password"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-primary hover:text-primary/80 font-medium"
            >
              Sign up
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Forgot your password?{" "}
            <Link
              href="/auth/forgot-password"
              className="text-primary hover:text-primary/80 font-medium"
            >
              Reset it
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
