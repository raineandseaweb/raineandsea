import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useRouter } from "next/router";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(
          "If an account with that email exists, a password reset link has been sent to your inbox."
        );
        setEmail(""); // Clear email for security
      } else {
        setError(data.error || "Failed to send reset email");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      <Header />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent text-destructive mx-auto mb-4">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Forgot Your Password?
              </h1>
              <p className="text-muted-foreground">
                Enter your email address and we'll send you a link to reset your
                password.
              </p>
            </div>

            {message && (
              <div className="mb-6 p-4 bg-accent border border-border rounded-lg">
                <p className="text-accent-foreground text-sm">{message}</p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-accent border border-border rounded-lg">
                <p className="text-accent-foreground text-sm">{error}</p>
              </div>
            )}

            {loading && (
              <div className="mb-6 p-4 bg-accent border border-border rounded-lg">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-3"></div>
                  <p className="text-accent-foreground text-sm">
                    Sending reset email...
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <div className="text-center mt-6">
              <button
                onClick={() => router.push("/auth/signin")}
                className="text-primary hover:text-primary text-sm font-medium transition-colors duration-200"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
