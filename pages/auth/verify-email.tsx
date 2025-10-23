import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { checkAuth } = useAuth();

  const handleResendVerification = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Verification email sent! Please check your inbox.");
      } else {
        setError(data.error || "Failed to send verification email");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (token: string) => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Email verified successfully! Redirecting...");
        // Force a page refresh to ensure auth context is updated
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        setError(data.error || "Verification failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Check if there's a token in the URL
  const { token } = router.query;

  useEffect(() => {
    if (token && typeof token === "string") {
      // Auto-verify if token is in URL
      if (!loading && !message && !error) {
        handleVerifyToken(token);
      }
    }
  }, [token, loading, message, error]);

  return (
    <div className="min-h-screen bg-muted">
      <Header />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent text-primary mx-auto mb-4">
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
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Verify Your Email Address
              </h1>
              <p className="text-muted-foreground">
                We've sent a verification link to your email address. Please
                check your inbox and click the link to verify your account.
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
                  <p className="text-accent-foreground text-sm">Processing...</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Didn't receive the email?
                </h3>
                <p className="text-muted-foreground mb-4">
                  Check your spam folder or request a new verification email.
                </p>

                <div className="space-y-4">
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
                    />
                  </div>

                  <button
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {loading ? "Sending..." : "Resend Verification Email"}
                  </button>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Need Help?
                </h3>
                <p className="text-muted-foreground mb-4">
                  If you're having trouble verifying your email, please contact
                  our support team.
                </p>
                <button
                  onClick={() => router.push("/contact")}
                  className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors duration-200"
                >
                  Contact Support
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => router.push("/auth/signin")}
                  className="text-primary hover:text-primary text-sm font-medium transition-colors duration-200"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
