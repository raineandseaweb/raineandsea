import { PrefetchLink } from "@/components/ui/prefetch-link";

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <PrefetchLink
                  href="/about"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  About Us
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink
                  href="/contact"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Contact
                </PrefetchLink>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Support
            </h3>
            <ul className="space-y-3">
              <li>
                <PrefetchLink
                  href="/help"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Help Center
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink
                  href="/shipping"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Shipping Info
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink
                  href="/returns"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Returns
                </PrefetchLink>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-3">
              <li>
                <PrefetchLink
                  href="/privacy"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Privacy Policy
                </PrefetchLink>
              </li>
              <li>
                <PrefetchLink
                  href="/terms"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Terms of Service
                </PrefetchLink>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Connect
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Stay updated with our latest products and offers.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
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
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>Secure Shopping</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-8 text-center">
          <p className="text-sm text-gray-500">
            &copy; 2024 RaineAndSea. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
