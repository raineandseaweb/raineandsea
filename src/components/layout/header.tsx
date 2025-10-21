"use client";

import { PrefetchLink } from "@/components/ui/prefetch-link";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

export function Header() {
  const { user, loading, logout } = useAuth();
  const { getTotalItems } = useCart();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isTogglingRef = useRef(false);

  const toggleMobileMenu = () => {
    // Prevent rapid toggling
    if (isTogglingRef.current) return;

    isTogglingRef.current = true;
    setIsMobileMenuOpen((prev) => !prev);

    // Reset toggle lock after a short delay
    setTimeout(() => {
      isTogglingRef.current = false;
    }, 100);
  };

  const closeMobileMenu = () => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  // Close mobile menu on route changes
  useEffect(() => {
    const handleRouteChange = () => {
      closeMobileMenu();
    };

    // Listen for Next.js router events
    router.events.on("routeChangeStart", handleRouteChange);
    router.events.on("routeChangeComplete", handleRouteChange);

    // Also listen for browser navigation events
    window.addEventListener("popstate", handleRouteChange);
    window.addEventListener("hashchange", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
      router.events.off("routeChangeComplete", handleRouteChange);
      window.removeEventListener("popstate", handleRouteChange);
      window.removeEventListener("hashchange", handleRouteChange);
    };
  }, [router.events]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        menuButtonRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        closeMobileMenu();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent body scroll when menu is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu on scroll to prevent touch issues
  useEffect(() => {
    const handleScroll = () => {
      if (isMobileMenuOpen) {
        closeMobileMenu();
      }
    };

    if (isMobileMenuOpen) {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile Menu Backdrop - Outside header for full screen coverage */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm md:hidden z-40" />
      )}

      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/logo.jpg"
                alt="RaineAndSea logo"
                className="h-12 w-12 rounded-xl object-cover shadow-sm"
              />
              <span className="text-xl font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors duration-200">
                RaineAndSea
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <PrefetchLink
                href="/products"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                Products
              </PrefetchLink>
              <PrefetchLink
                href="/categories"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                Categories
              </PrefetchLink>
              <PrefetchLink
                href="/account"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                Account
              </PrefetchLink>
              <PrefetchLink
                href="/orders/lookup"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                Order Lookup
              </PrefetchLink>
              {(user?.role === "admin" || user?.role === "root") && (
                <PrefetchLink
                  href="/admin"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Admin
                </PrefetchLink>
              )}
            </nav>

            <div className="flex items-center gap-3">
              {/* Mobile Cart Button */}
              <PrefetchLink href="/cart" className="md:hidden">
                <button className="relative inline-flex items-center p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  {getTotalItems() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getTotalItems()}
                    </span>
                  )}
                </button>
              </PrefetchLink>

              {/* Desktop Cart Button */}
              <PrefetchLink href="/cart" className="hidden md:block">
                <button className="relative inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  Cart ({getTotalItems()})
                </button>
              </PrefetchLink>

              {/* Mobile Menu Button */}
              <button
                ref={menuButtonRef}
                onClick={toggleMobileMenu}
                className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200 touch-manipulation"
                aria-label="Toggle mobile menu"
                aria-expanded={isMobileMenuOpen}
                style={{ touchAction: "manipulation" }}
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>

              {/* Desktop Auth Section */}
              <div className="hidden md:flex items-center gap-3">
                {loading ? (
                  <div className="h-10 w-20 bg-gray-200 rounded-xl animate-pulse" />
                ) : user ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">
                        {user.name || user.email}
                      </span>
                      {user.role && user.role !== "user" && (
                        <StatusIndicator status={user.role} type="user" />
                      )}
                    </div>
                    <button
                      onClick={() => logout()}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link href="/auth/signin">
                      <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200">
                        Sign in
                      </button>
                    </Link>
                    <Link href="/auth/signup">
                      <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md">
                        Sign up
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div
              ref={mobileMenuRef}
              className="fixed top-20 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-60"
            >
              <div className="px-4 py-4 space-y-4">
                {/* Mobile Navigation Links */}
                <nav className="space-y-3">
                  <PrefetchLink
                    href="/products"
                    className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors duration-200"
                    onClick={closeMobileMenu}
                  >
                    Products
                  </PrefetchLink>
                  <PrefetchLink
                    href="/categories"
                    className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors duration-200"
                    onClick={closeMobileMenu}
                  >
                    Categories
                  </PrefetchLink>
                  <PrefetchLink
                    href="/account"
                    className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors duration-200"
                    onClick={closeMobileMenu}
                  >
                    Account
                  </PrefetchLink>
                  <PrefetchLink
                    href="/orders/lookup"
                    className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors duration-200"
                    onClick={closeMobileMenu}
                  >
                    Order Lookup
                  </PrefetchLink>
                  {(user?.role === "admin" || user?.role === "root") && (
                    <PrefetchLink
                      href="/admin"
                      className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors duration-200"
                      onClick={closeMobileMenu}
                    >
                      Admin
                    </PrefetchLink>
                  )}
                </nav>

                {/* Mobile Auth Section */}
                <div className="pt-4 border-t border-gray-200">
                  {loading ? (
                    <div className="h-10 w-full bg-gray-200 rounded-xl animate-pulse" />
                  ) : user ? (
                    <div className="space-y-3">
                      <div className="px-4 py-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {user.name || user.email}
                          </span>
                          {user.role && user.role !== "user" && (
                            <StatusIndicator status={user.role} type="user" />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          closeMobileMenu();
                        }}
                        className="w-full px-4 py-3 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors duration-200"
                      >
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Link href="/auth/signin" onClick={closeMobileMenu}>
                        <button className="w-full px-4 py-3 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors duration-200">
                          Sign in
                        </button>
                      </Link>
                      <Link href="/auth/signup" onClick={closeMobileMenu}>
                        <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md">
                          Sign up
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
