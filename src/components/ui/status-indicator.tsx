interface StatusIndicatorProps {
  status: string;
  type?: "order" | "user" | "product";
  className?: string;
}

export function StatusIndicator({
  status,
  type = "order",
  className = "",
}: StatusIndicatorProps) {
  const getStatusColor = (status: string, type: string) => {
    if (type === "user") {
      const userColors = {
        root: "bg-red-100 text-red-800",
        admin: "bg-blue-100 text-blue-800",
        user: "bg-gray-100 text-gray-800",
        verified: "bg-green-100 text-green-800",
        pending: "bg-yellow-100 text-yellow-800",
      };
      return (
        userColors[status as keyof typeof userColors] ||
        "bg-gray-100 text-gray-800"
      );
    }

    if (type === "product") {
      const productColors = {
        active: "bg-green-100 text-green-800",
        inactive: "bg-red-100 text-red-800",
        draft: "bg-yellow-100 text-yellow-800",
      };
      return (
        productColors[status as keyof typeof productColors] ||
        "bg-gray-100 text-gray-800"
      );
    }

    // Order status colors
    const orderColors = {
      received: "bg-orange-100 text-orange-800",
      paid: "bg-blue-100 text-blue-800",
      shipped: "bg-indigo-100 text-indigo-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      refunded: "bg-yellow-100 text-yellow-800",
      created: "bg-gray-100 text-gray-800",
      fulfilled: "bg-purple-100 text-purple-800",
    };
    return (
      orderColors[status as keyof typeof orderColors] ||
      "bg-gray-100 text-gray-800"
    );
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${getStatusColor(
        status,
        type
      )} ${className}`}
    >
      {formatStatus(status)}
    </span>
  );
}
