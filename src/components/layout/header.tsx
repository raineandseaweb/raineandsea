"use client";

import { PrefetchLink } from "@/components/ui/prefetch-link";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import Link from "next/link";

export function Header() {
  const { user, loading, logout } = useAuth();
  const { getTotalItems } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
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
            <PrefetchLink href="/cart">
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
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"
                  />
                </svg>
                Cart ({getTotalItems()})
              </button>
            </PrefetchLink>

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
    </header>
  );
}
