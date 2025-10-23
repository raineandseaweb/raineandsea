import { PrefetchLink } from "@/components/ui/prefetch-link";
import Image from "next/image";

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    thumbnail?: string;
  };
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <PrefetchLink href={`/products?category=${category.slug}`}>
      <div className="group relative bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border hover:shadow-lg hover:border-border transition-all duration-200 overflow-hidden cursor-pointer">
        <div className="relative w-full h-36 sm:h-48">
          {category.thumbnail ? (
            <Image
              src={category.thumbnail}
              alt={category.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
              <svg
                className="w-8 h-8 sm:w-12 sm:h-12 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          )}

          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-opacity duration-300"></div>

          {/* Category name overlay */}
          <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
            <h3 className="text-primary-foreground text-sm sm:text-lg font-semibold text-center drop-shadow-lg group-hover:text-blue-200 transition-colors leading-tight">
              {category.name}
            </h3>
          </div>
        </div>
      </div>
    </PrefetchLink>
  );
}
