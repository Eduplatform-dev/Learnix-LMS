import { useEffect, useState, useCallback } from "react";
import { Shield, Search, RefreshCw, Download, User, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
  const t = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

type Log = {
  _id: string;
  actor: { _id: string; username: string; email: string; role: string } | null;
  actorEmail: string; actorRole: string; action: string; resource: string;
  resourceId: string; details: string; metadata: any; ip: string;
  status: "success" | "failure" | "warning";
  createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  CREATE:  "bg-green-100 text-green-700",
  UPDATE:  "bg-blue-100 text-blue-700",
  DELETE:  "bg-red-100 text-red-700",
  LOGIN:   "bg-indigo-100 text-indigo-700",
  PUBLISH: "bg-purple-100 text-purple-700",
  ISSUE:   "bg-amber-100 text-amber-700",
};

const getActionColor = (action: string) => {
  const prefix = Object.keys(ACTION_COLORS).find(k => action.startsWith(k));
  return prefix ? ACTION_COLORS[prefix] : "bg-gray-100 text-gray-600";
};

const STATUS_ICON = {
  success: <CheckCircle className="w-4 h-4 text-green-500" />,
  failure: <AlertCircle className="w-4 h-4 text-red-500" />,
  warning: <Info className="w-4 h-4 text-amber-500" />,
};

// Export to CSV
function exportCSV(logs: Log[]) {
  const rows = [
    ["Timestamp","Actor","Role","Action","Resource","Details","Status"],
    ...logs.map(l => [
      new Date(l.createdAt).toLocaleString(),
      l.actor?.username || l.actorEmail || "—",
      l.actor?.role || l.actorRole || "—",
      l.action,
      l.resource,
      l.details.replace(/,/g, ";"),
      l.status,
    ]),
  ];
  const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminAuditLogs() {
  const [logs,    setLogs]    = useState<Log[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [action,  setAction]  = useState("");
  const [resource,setResource]= useState("");
  const [status,  setStatus]  = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams({ page: String(page), limit: "50" });
      if (action)   qs.set("action",   action);
      if (resource) qs.set("resource", resource);
      if (status)   qs.set("status",   status);

      const res  = await fetch(`${API_BASE_URL}/api/audit-logs?${qs}`, { headers: authHeader() });
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } finally { setLoading(false); }
  }, [page, action, resource, status]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? logs.filter(l =>
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.resource.toLowerCase().includes(search.toLowerCase()) ||
        l.details.toLowerCase().includes(search.toLowerCase()) ||
        (l.actor?.username || l.actorEmail || "").toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const uniqueActions   = [...new Set(logs.map(l => l.action))];
  const uniqueResources = [...new Set(logs.map(l => l.resource))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />Audit Logs
          </h1>
          <p className="text-gray-500 text-sm mt-1">Complete activity trail of all administrative actions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportCSV(filtered)}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
          <Button variant="outline" onClick={load}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Events",  value: total,                                        color: "text-gray-900" },
          { label: "Successful",    value: logs.filter(l => l.status === "success").length, color: "text-green-600" },
          { label: "Failed",        value: logs.filter(l => l.status === "failure").length, color: "text-red-600"   },
          { label: "Warnings",      value: logs.filter(l => l.status === "warning").length, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-lg px-3 py-2 text-sm" value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm" value={resource} onChange={e => { setResource(e.target.value); setPage(1); }}>
          <option value="">All Resources</option>
          {uniqueResources.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="warning">Warning</option>
        </select>
      </div>

      {/* Logs table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No audit logs found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["","Timestamp","Actor","Action","Resource","Details","Status"].map(h =>
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(log => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">{STATUS_ICON[log.status]}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{log.actor?.username || log.actorEmail || "System"}</p>
                        <p className="text-xs text-gray-400 capitalize">{log.actor?.role || log.actorRole}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${getActionColor(log.action)}`}>{log.action.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{log.resource}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[250px]">
                        <p className="truncate" title={log.details}>{log.details || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${log.status === "success" ? "bg-green-100 text-green-700" : log.status === "failure" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {log.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Showing {filtered.length} of {total} logs</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <Button size="sm" variant="outline" disabled={filtered.length < 50} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
