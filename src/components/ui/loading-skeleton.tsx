interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-gray-200 rounded-lg h-4 w-full mb-2"></div>
      <div className="bg-gray-200 rounded-lg h-4 w-3/4 mb-2"></div>
      <div className="bg-gray-200 rounded-lg h-4 w-1/2"></div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6 animate-pulse">
      <div className="bg-gray-200 rounded-lg h-48 w-full mb-4"></div>
      <div className="bg-gray-200 rounded-lg h-4 w-full mb-2"></div>
      <div className="bg-gray-200 rounded-lg h-4 w-3/4 mb-4"></div>
      <div className="bg-gray-200 rounded-lg h-8 w-full"></div>
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden animate-pulse">
      <div className="bg-gray-200 h-48 w-full"></div>
      <div className="p-6">
        <div className="bg-gray-200 rounded-lg h-6 w-3/4 mb-2"></div>
        <div className="bg-gray-200 rounded-lg h-4 w-full"></div>
      </div>
    </div>
  );
}
