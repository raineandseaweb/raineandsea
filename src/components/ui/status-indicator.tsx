import { theme } from "@/lib/theme";

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
        root: theme.badge.root,
        admin: theme.badge.admin,
        user: theme.badge.user,
        verified: theme.badge.verified,
        pending: theme.badge.pending,
      };
      return userColors[status as keyof typeof userColors] || theme.badge.user;
    }

    if (type === "product") {
      const productColors = {
        active: theme.badge.active,
        inactive: theme.badge.inactive,
        draft: theme.badge.draft,
      };
      return (
        productColors[status as keyof typeof productColors] || theme.badge.user
      );
    }

    // Order status colors
    const orderColors = {
      received: theme.badge.received,
      paid: theme.badge.paid,
      shipped: theme.badge.shipped,
      completed: theme.badge.completed,
      cancelled: theme.badge.cancelled,
      refunded: theme.badge.refunded,
      created: theme.badge.created,
      fulfilled: theme.badge.fulfilled,
    };
    return orderColors[status as keyof typeof orderColors] || theme.badge.user;
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 sm:py-0.5 rounded-md text-xs font-medium ${getStatusColor(
        status,
        type
      )} ${className}`}
    >
      {formatStatus(status)}
    </span>
  );
}
