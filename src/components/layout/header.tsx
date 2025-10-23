"use client";

import { PrefetchLink } from "@/components/ui/prefetch-link";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import { useTheme } from "@/hooks/use-theme";
import { ThemeName } from "@/lib/theme";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

export function Header() {
  const { user, loading, logout } = useAuth();
  const { getTotalItems } = useCart();
  const { currentTheme, isDark, setTheme, toggleDarkMode } = useTheme();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
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
      // Prevent body scroll when menu is open, but allow menu internal scrolling
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "unset";
      document.body.style.position = "unset";
      document.body.style.width = "unset";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
      document.body.style.position = "unset";
      document.body.style.width = "unset";
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

  // Remove auto-close on window scroll; allow internal menu scrolling instead
  // (Previously we closed the menu on any window scroll which interfered with menu scroll.)

  // Handle user dropdown hover
  useEffect(() => {
    const dropdownElement = userDropdownRef.current;
    if (!dropdownElement) return;

    const handleMouseEnter = () => {
      setIsUserDropdownOpen(true);
    };

    const handleMouseLeave = () => {
      setIsUserDropdownOpen(false);
    };

    dropdownElement.addEventListener("mouseenter", handleMouseEnter);
    dropdownElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      dropdownElement.removeEventListener("mouseenter", handleMouseEnter);
      dropdownElement.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Keep user menu open when hovering theme dropdown
  useEffect(() => {
    const themeDropdownElement = themeDropdownRef.current;
    if (!themeDropdownElement) return;

    const handleMouseEnter = () => {
      setIsUserDropdownOpen(true);
    };

    themeDropdownElement.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      themeDropdownElement.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, []);

  // Handle theme dropdown clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isThemeDropdownOpen &&
        themeDropdownRef.current &&
        !themeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsThemeDropdownOpen(false);
      }
    };

    if (isThemeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isThemeDropdownOpen]);

  const formatThemeName = (themeName: string) => {
    return themeName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <>
      {/* Mobile Menu Backdrop - Outside header for full screen coverage */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm md:hidden z-40" />
      )}

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/logo.jpg"
                alt="RaineAndSea logo"
                className="h-12 w-12 rounded-xl object-cover shadow-sm"
              />
              <span className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors duration-200">
                RaineAndSea
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <PrefetchLink
                href="/products"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Products
              </PrefetchLink>
              <PrefetchLink
                href="/categories"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Categories
              </PrefetchLink>
              <PrefetchLink
                href="/account"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Account
              </PrefetchLink>
              <PrefetchLink
                href="/orders/lookup"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Order Lookup
              </PrefetchLink>
              {(user?.role === "admin" || user?.role === "root") && (
                <PrefetchLink
                  href="/admin"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  Admin
                </PrefetchLink>
              )}
            </nav>

            <div className="flex items-center gap-3">
              {/* Mobile Cart Button */}
              <PrefetchLink href="/cart" className="md:hidden">
                <button className="relative inline-flex items-center p-2 bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md">
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
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getTotalItems()}
                    </span>
                  )}
                </button>
              </PrefetchLink>

              {/* Desktop Cart Button */}
              <PrefetchLink href="/cart" className="hidden md:block">
                <button className="relative inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md">
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
                className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors duration-200 touch-manipulation"
                aria-label="Toggle mobile menu"
                aria-expanded={isMobileMenuOpen}
                style={{ touchAction: "manipulation" }}
              >
                <svg
                  className="w-6 h-6 text-muted-foreground"
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
                  <div className="h-10 w-20 bg-muted rounded-xl animate-pulse" />
                ) : user ? (
                  <div ref={userDropdownRef} className="relative">
                    {/* User Info Button */}
                    <button
                      onMouseEnter={() => setIsUserDropdownOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {user.name || user.email}
                        </span>
                        {user.role && user.role !== "user" && (
                          <StatusIndicator status={user.role} type="user" />
                        )}
                      </div>
                      <svg
                        className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform duration-200 ${
                          isUserDropdownOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    <>
                      {/* Invisible hover buffer to prevent accidental closing */}
                      <div
                        className={`absolute right-0 top-full h-6 w-64 ${
                          isUserDropdownOpen
                            ? "pointer-events-auto"
                            : "pointer-events-none"
                        }`}
                      />
                      <div
                        className={`absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-lg overflow-visible transition-all duration-200 z-[55] ${
                          isUserDropdownOpen
                            ? "opacity-100 translate-y-0 pointer-events-auto"
                            : "opacity-0 -translate-y-2 pointer-events-none"
                        }`}
                      >
                        {/* Content wrapper for proper border radius */}
                        <div>
                          {/* User Info Header */}
                          <div className="px-4 py-3 border-b border-border bg-muted/50 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                                {(user.name || user.email)[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {user.name || user.email}
                                </p>
                                {user.role && user.role !== "user" && (
                                  <StatusIndicator
                                    status={user.role}
                                    type="user"
                                  />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Theme Switcher */}
                          <div className="px-4 py-3 border-b border-border relative overflow-visible">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                              Theme
                            </label>
                            <div ref={themeDropdownRef} className="relative">
                              <button
                                onClick={() =>
                                  setIsThemeDropdownOpen(!isThemeDropdownOpen)
                                }
                                className="w-full flex items-center justify-between px-3 py-2 bg-muted hover:bg-accent rounded-lg transition-colors"
                              >
                                <span className="text-sm font-medium text-foreground">
                                  {formatThemeName(currentTheme)}
                                </span>
                                <svg
                                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                                    isThemeDropdownOpen ? "rotate-180" : ""
                                  }`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>

                              {isThemeDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                                  {(
                                    [
                                      "default",
                                      "forest",
                                      "forest-alt",
                                      "ocean",
                                      "ocean-alt",
                                      "sunset",
                                      "sunset-alt",
                                      "iris",
                                      "iris-alt",
                                    ] as ThemeName[]
                                  ).map((themeName) => (
                                    <button
                                      key={themeName}
                                      onClick={() => {
                                        setTheme(themeName);
                                        setIsThemeDropdownOpen(false);
                                      }}
                                      className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                                        currentTheme === themeName
                                          ? "bg-primary text-primary-foreground"
                                          : "text-foreground hover:bg-muted"
                                      }`}
                                    >
                                      {formatThemeName(themeName)}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Dark Mode Toggle */}
                          <div className="px-4 py-3 border-b border-border overflow-hidden">
                            <button
                              onClick={toggleDarkMode}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                            >
                              <span className="text-sm font-medium text-foreground">
                                Dark Mode
                              </span>
                              <div
                                className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                                  isDark ? "bg-primary" : "bg-muted"
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
                                    isDark ? "translate-x-5" : "translate-x-0.5"
                                  }`}
                                  style={{ marginTop: "2px" }}
                                />
                              </div>
                            </button>
                          </div>

                          {/* Sign Out Button */}
                          <div className="p-2 overflow-hidden">
                            <button
                              onClick={() => logout()}
                              className="w-full px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                              </svg>
                              Sign out
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link href="/auth/signin">
                      <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all duration-200">
                        Sign in
                      </button>
                    </Link>
                    <Link href="/auth/signup">
                      <button className="px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-medium rounded-xl hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-sm hover:shadow-md">
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
              className="fixed top-20 left-0 right-0 h-[calc(100vh-5rem)] bg-background border-t border-border shadow-lg md:hidden z-60 flex flex-col"
            >
              <div
                className="flex-1 overflow-y-auto px-4 py-4 pb-32 space-y-4 mobile-scroll"
                style={{ minHeight: 0 }}
              >
                {/* Mobile Navigation Links */}
                <nav className="space-y-3">
                  <PrefetchLink
                    href="/products"
                    className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors duration-200"
                    onClick={closeMobileMenu}
                  >
                    Products
                  </PrefetchLink>
                  <PrefetchLink
                    href="/categories"
                    className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors duration-200"
                    onClick={closeMobileMenu}
                  >
                    Categories
                  </PrefetchLink>
                  <PrefetchLink
                    href="/account"
                    className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors duration-200"
                    onClick={closeMobileMenu}
                  >
                    Account
                  </PrefetchLink>
                  <PrefetchLink
                    href="/orders/lookup"
                    className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors duration-200"
                    onClick={closeMobileMenu}
                  >
                    Order Lookup
                  </PrefetchLink>
                  {(user?.role === "admin" || user?.role === "root") && (
                    <PrefetchLink
                      href="/admin"
                      className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors duration-200"
                      onClick={closeMobileMenu}
                    >
                      Admin
                    </PrefetchLink>
                  )}
                </nav>

                {/* Mobile Auth Section */}
                <div className="pt-4 border-t border-border">
                  {loading ? (
                    <div className="h-10 w-full bg-muted rounded-xl animate-pulse" />
                  ) : user ? (
                    <div className="space-y-3">
                      <div className="px-4 py-3 bg-muted rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {user.name || user.email}
                          </span>
                          {user.role && user.role !== "user" && (
                            <StatusIndicator status={user.role} type="user" />
                          )}
                        </div>
                      </div>

                      {/* Mobile Theme Controls */}
                      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
                        {/* Theme Selection */}
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Theme
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {(
                              [
                                "default",
                                "forest",
                                "forest-alt",
                                "ocean",
                                "ocean-alt",
                                "sunset",
                                "sunset-alt",
                                "iris",
                                "iris-alt",
                              ] as ThemeName[]
                            ).map((themeName) => (
                              <button
                                key={themeName}
                                onClick={() => setTheme(themeName)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  themeName === "default" ? "col-span-2" : ""
                                } ${
                                  currentTheme === themeName
                                    ? "bg-primary text-primary-foreground ring-2 ring-primary/20"
                                    : "bg-muted text-foreground hover:bg-accent"
                                }`}
                              >
                                {formatThemeName(themeName)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dark Mode Toggle */}
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Dark Mode
                          </label>
                          <button
                            onClick={toggleDarkMode}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                          >
                            <span className="text-sm font-medium text-foreground">
                              {isDark ? "Light Mode" : "Dark Mode"}
                            </span>
                            <div
                              className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                                isDark ? "bg-primary" : "bg-muted"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
                                  isDark ? "translate-x-5" : "translate-x-0.5"
                                }`}
                                style={{ marginTop: "2px" }}
                              />
                            </div>
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          logout();
                          closeMobileMenu();
                        }}
                        className="w-full px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors duration-200"
                      >
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Link href="/auth/signin" onClick={closeMobileMenu}>
                        <button className="w-full px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors duration-200">
                          Sign in
                        </button>
                      </Link>
                      <Link href="/auth/signup" onClick={closeMobileMenu}>
                        <button className="w-full px-4 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-base font-medium rounded-xl hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-sm hover:shadow-md">
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
