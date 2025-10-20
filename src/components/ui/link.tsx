import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

interface CustomLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function CustomLink({
  href,
  children,
  className = "",
  onClick,
}: CustomLinkProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if it's a modifier key (cmd/ctrl for new tab)
    if (e.metaKey || e.ctrlKey) {
      return;
    }

    // Don't navigate if it's a different origin
    if (href.startsWith("http") && !href.includes(window.location.origin)) {
      return;
    }

    setIsNavigating(true);

    if (onClick) {
      onClick();
    }

    // Reset state after a short delay to prevent flicker
    setTimeout(() => {
      setIsNavigating(false);
    }, 100);
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      <span
        className={`transition-opacity duration-150 ${
          isNavigating ? "opacity-70" : "opacity-100"
        }`}
      >
        {children}
      </span>
    </Link>
  );
}
