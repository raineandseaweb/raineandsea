import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { PrefetchLink } from "@/components/ui/prefetch-link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-muted">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
              Welcome to RaineAndSea
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 sm:mb-12 max-w-2xl mx-auto px-4">
              Discover our collection of premium crystal jewelry, handmade with
              care and shipped from Anacortes, WA
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <PrefetchLink
                href="/products"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-semibold hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-sm hover:shadow-md text-base sm:text-lg"
              >
                Browse Products
              </PrefetchLink>
              <PrefetchLink
                href="/categories"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 border border-border text-foreground rounded-xl font-semibold hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md text-base sm:text-lg"
              >
                View Categories
              </PrefetchLink>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-16 sm:mt-20 lg:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-4">
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                Secure Shopping
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground px-2">
                Your payment information is always protected with
                industry-standard security.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                Free Shipping
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground px-2">
                Enjoy free shipping on all orders, no minimum purchase required.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                Custom Made
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground px-2">
                Each piece is carefully crafted by hand with attention to
                detail.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
