import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "../../../pages/admin/audit-trail";

interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  requestMethod: string;
  requestPath: string;
  requestQuery: any;
  requestBody: any;
  responseStatus: number;
  responseTimeMs: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  endpointType: string | null;
  action: string | null;
  errorType: string | null;
  errorMessage: string | null;
  createdAt: string;
  metadata: any;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalRequests: number;
    avgResponseTime: number;
    errorCount: number;
  };
}

export function AuditTrailContent() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState({
    totalRequests: 0,
    avgResponseTime: 0,
    errorCount: 0,
  });

  // Filters (excluding search)
  const [filters, setFilters] = useState({
    userRole: "",
    endpointType: "",
    requestMethod: "",
    responseStatus: "",
    errorType: "",
  });

  // Search input (not debounced, for instant UI update)
  const [searchInput, setSearchInput] = useState("");

  // Debounced search value - only used for API calls
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries({
            ...filters,
            search: debouncedSearch, // Use debounced search value
          }).filter(([_, value]) => value !== "")
        ),
      });

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch audit logs");

      const data: AuditLogsResponse = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, debouncedSearch, toast]);

  // Debounce search input
  const searchTimeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 500); // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  // Fetch logs when pagination or other filters change
  useEffect(() => {
    fetchLogs();
  }, [pagination.page, fetchLogs]);

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "bg-green-500";
    if (status >= 300 && status < 400) return "bg-blue-500";
    if (status >= 400 && status < 500) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: "bg-blue-500",
      POST: "bg-green-500",
      PUT: "bg-yellow-500",
      PATCH: "bg-orange-500",
      DELETE: "bg-red-500",
    };
    return colors[method] || "bg-gray-500";
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      userRole: "",
      endpointType: "",
      requestMethod: "",
      responseStatus: "",
      errorType: "",
    });
    setSearchInput("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Remove the old effect since we now have debounced search

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Requests</div>
          <div className="text-2xl font-bold mt-1">{stats.totalRequests}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Avg Response Time</div>
          <div className="text-2xl font-bold mt-1">
            {formatDuration(stats.avgResponseTime)}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Errors</div>
          <div className="text-2xl font-bold mt-1 text-red-500">
            {stats.errorCount}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search (path, email, action, user ID, status code)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            value={filters.userRole || "all"}
            onValueChange={(value) =>
              handleFilterChange("userRole", value === "all" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="User Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="root">Root</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.endpointType || "all"}
            onValueChange={(value) =>
              handleFilterChange("endpointType", value === "all" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Endpoint Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="api">API</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="checkout">Checkout</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.requestMethod || "all"}
            onValueChange={(value) =>
              handleFilterChange("requestMethod", value === "all" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="HTTP Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.responseStatus || "all"}
            onValueChange={(value) =>
              handleFilterChange("responseStatus", value === "all" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Response Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="200">200 OK</SelectItem>
              <SelectItem value="400">400 Bad Request</SelectItem>
              <SelectItem value="401">401 Unauthorized</SelectItem>
              <SelectItem value="403">403 Forbidden</SelectItem>
              <SelectItem value="404">404 Not Found</SelectItem>
              <SelectItem value="500">500 Server Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSearch}>Apply Filters</Button>
          <Button variant="outline" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewDetails(log)}
                >
                  <TableCell className="font-mono text-xs">
                    {format(new Date(log.createdAt), "MMM dd, HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {log.userEmail || "Guest"}
                      </span>
                      {log.userRole && (
                        <Badge variant="outline" className="w-fit text-xs">
                          {log.userRole}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${getMethodColor(
                        log.requestMethod
                      )} text-white`}
                    >
                      {log.requestMethod}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-xs truncate">
                    {log.requestPath}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${getStatusColor(
                        log.responseStatus
                      )} text-white`}
                    >
                      {log.responseStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatDuration(log.responseTimeMs)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} results
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={pagination.page === 1}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={pagination.page === pagination.totalPages}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Request made at{" "}
              {selectedLog && format(new Date(selectedLog.createdAt), "PPpp")}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Request</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Method:</span>{" "}
                      <Badge
                        className={getMethodColor(selectedLog.requestMethod)}
                      >
                        {selectedLog.requestMethod}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Path:</span>{" "}
                      <code className="bg-muted px-2 py-1 rounded">
                        {selectedLog.requestPath}
                      </code>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <Badge
                        className={getStatusColor(selectedLog.responseStatus)}
                      >
                        {selectedLog.responseStatus}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>{" "}
                      {formatDuration(selectedLog.responseTimeMs)}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">User</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email:</span>{" "}
                      {selectedLog.userEmail || "Guest"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Role:</span>{" "}
                      {selectedLog.userRole || "N/A"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">IP:</span>{" "}
                      {selectedLog.ipAddress || "N/A"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Endpoint:</span>{" "}
                      {selectedLog.endpointType || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {selectedLog.action && (
                <div>
                  <h4 className="font-semibold mb-2">Action</h4>
                  <Badge variant="outline">{selectedLog.action}</Badge>
                </div>
              )}

              {selectedLog.requestQuery && (
                <div>
                  <h4 className="font-semibold mb-2">Query Parameters</h4>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.requestQuery, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.requestBody && (
                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.requestBody, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.errorType && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-500">Error</h4>
                  <div className="bg-red-50 border border-red-200 p-3 rounded">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Type:</span>{" "}
                      {selectedLog.errorType}
                    </div>
                    {selectedLog.errorMessage && (
                      <div className="text-sm mt-1">
                        <span className="text-muted-foreground">Message:</span>{" "}
                        {selectedLog.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <h4 className="font-semibold mb-2">User Agent</h4>
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    {selectedLog.userAgent}
                  </code>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <h4 className="font-semibold mb-2">Metadata</h4>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
