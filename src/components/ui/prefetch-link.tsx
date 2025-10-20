"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

interface PrefetchLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  prefetchOnHover?: boolean;
}

export function PrefetchLink({
  href,
  children,
  className = "",
  onClick,
  prefetchOnHover = true,
}: PrefetchLinkProps) {
  const router = useRouter();
  const [hasPrefetched, setHasPrefetched] = useState(false);
  const [isRouterReady, setIsRouterReady] = useState(false);

  useEffect(() => {
    if (router.isReady) {
      setIsRouterReady(true);
    }
  }, [router.isReady]);

  const handleMouseEnter = useCallback(() => {
    if (prefetchOnHover && !hasPrefetched && isRouterReady) {
      // Only prefetch if it's a local route
      if (!href.startsWith("http") || href.includes(window.location.origin)) {
        router.prefetch(href);
        setHasPrefetched(true);
      }
    }
  }, [href, router, prefetchOnHover, hasPrefetched, isRouterReady]);

  return (
    <Link
      href={href}
      className={className}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </Link>
  );
}
