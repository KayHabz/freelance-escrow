"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";

// ── Types ──────────────────────────────────────────────
interface Stats {
  totalUsers: number;
  totalJobs: number;
  jobsByStatus: Record<string, number>;
  totalEscrowVolume: number;
  totalReleased: number;
  totalPlatformFees: number;
  platformFeePercent: number;
}

interface Job {
  id: number;
  title: string;
  description: string;
  budget: number;
  status: string;
  client_name: string;
  freelancer_name?: string;
  created_at: string;
}

interface Dispute extends Job {
  escrow_amount: number;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  created_at: string;
  user_name: string;
  user_email: string;
}

// ── Transaction Badge ──────────────────────────────────
const TxnBadge = ({ type }: { type: string }) => {
  const styles: Record<string, { label: string; colour: string }> = {
    deposit:        { label: "Deposit",        colour: "bg-green-100 text-green-700"   },
    escrow_funding: { label: "Escrow Funded",  colour: "bg-yellow-100 text-yellow-700" },
    escrow_release: { label: "Escrow Release", colour: "bg-blue-100 text-blue-700"    },
    refund:         { label: "Refund",         colour: "bg-purple-100 text-purple-700" },
    platform_fee:   { label: "Platform Fee",   colour: "bg-gray-100 text-gray-700"    },
  };
  const style = styles[type] ?? { label: type, colour: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${style.colour}`}>
      {style.label}
    </span>
  );
};

// ── Status Badge ───────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const colours: Record<string, string> = {
    open:      "bg-blue-100 text-blue-700",
    funded:    "bg-yellow-100 text-yellow-700",
    assigned:  "bg-purple-100 text-purple-700",
    submitted: "bg-orange-100 text-orange-700",
    released:  "bg-green-100 text-green-700",
    disputed:  "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colours[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.toUpperCase()}
    </span>
  );
};

// ── Admin API helper ───────────────────────────────────
const adminApi = {
  get: (url: string) => {
    const token = localStorage.getItem("adminToken");
    return api.get(url, { headers: { Authorization: `Bearer ${token}` } });
  },
  post: (url: string, data: any) => {
    const token = localStorage.getItem("adminToken");
    return api.post(url, data, { headers: { Authorization: `Bearer ${token}` } });
  },
};

// ── Main Component ─────────────────────────────────────
export default function AdminDashboard() {

  const router = useRouter();

  const [activeTab, setActiveTab]       = useState<"overview" | "jobs" | "disputes" | "transactions">("overview");
  const [stats, setStats]               = useState<Stats | null>(null);
  const [jobs, setJobs]                 = useState<Job[]>([]);
  const [disputes, setDisputes]         = useState<Dispute[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [actionError, setActionError]     = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [resolvingId, setResolvingId]     = useState<number | null>(null);

  // ── Auth guard ───────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) router.push("/admin/login");
  }, []);

  // ── Fetchers ─────────────────────────────────────────
  const fetchStats = async () => {
    try { const res = await adminApi.get("/admin/stats"); setStats(res.data); }
    catch (err) { console.error(err); }
  };
  const fetchJobs = async () => {
    try { const res = await adminApi.get("/admin/jobs"); setJobs(res.data); }
    catch (err) { console.error(err); }
  };
  const fetchDisputes = async () => {
    try { const res = await adminApi.get("/admin/disputes"); setDisputes(res.data); }
    catch (err) { console.error(err); }
  };
  const fetchTransactions = async () => {
    try { const res = await adminApi.get("/admin/transactions"); setTransactions(res.data); }
    catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchStats(); fetchJobs(); fetchDisputes(); fetchTransactions();
  }, []);

  useEffect(() => {
    if (activeTab === "overview")     fetchStats();
    if (activeTab === "jobs")         fetchJobs();
    if (activeTab === "disputes")     fetchDisputes();
    if (activeTab === "transactions") fetchTransactions();
  }, [activeTab]);

  // ── Resolve Dispute ──────────────────────────────────
  const resolveDispute = async (jobId: number, inFavourOf: "freelancer" | "client") => {
    setActionError(null); setActionSuccess(null);
    setResolvingId(jobId);
    try {
      const res = await adminApi.post("/admin/resolve", { jobId, inFavourOf });
      setActionSuccess(res.data.message);
      fetchDisputes(); fetchStats(); fetchTransactions();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? "Failed to resolve dispute");
    } finally {
      setResolvingId(null);
    }
  };

  // ── Logout ───────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem("adminToken");
    router.push("/admin/login");
  };

  // ── Render ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Navbar ── */}
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight">TrustWork</span>
          <span className="text-xs font-semibold bg-black text-white px-2 py-0.5 rounded-full">
            ADMIN
          </span>
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-500 border px-4 py-1.5 rounded hover:bg-gray-100"
        >
          Logout
        </button>
      </nav>

      <div className="px-6 py-8 space-y-8 max-w-5xl mx-auto w-full">

        {/* ── Page heading ── */}
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform overview and dispute management</p>
        </div>

        {/* Action feedback */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <span>⚠</span> {actionError}
          </div>
        )}
        {actionSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <span>✓</span> {actionSuccess}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-6 border-b">
          {(["overview", "jobs", "disputes", "transactions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium capitalize ${
                activeTab === tab
                  ? "border-b-2 border-black text-black"
                  : "text-gray-400 hover:text-black"
              }`}
            >
              {tab}
              {tab === "disputes" && disputes.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {disputes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && stats && (
          <div className="space-y-6">

            {/* Row 1 — platform revenue hero */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2 bg-black text-white rounded-xl p-6 space-y-1">
                <p className="text-xs uppercase tracking-widest opacity-50">Platform Revenue</p>
                <p className="text-4xl font-bold">${stats.totalPlatformFees.toFixed(2)}</p>
                <p className="text-xs opacity-40 pt-1">
                  {stats.platformFeePercent}% fee on all released escrows
                </p>
              </div>
              <div className="bg-white border rounded-xl p-6 space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Fee / Job</p>
                <p className="text-4xl font-bold">
                  ${stats.totalReleased > 0
                    ? (stats.totalPlatformFees / (stats.jobsByStatus["released"] ?? 1)).toFixed(2)
                    : "0.00"}
                </p>
                <p className="text-xs text-gray-400 pt-1">
                  {stats.jobsByStatus["released"] ?? 0} completed job{stats.jobsByStatus["released"] === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {/* Row 2 — core stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "Total Users",     value: stats.totalUsers.toString() },
                { label: "Total Jobs",      value: stats.totalJobs.toString() },
                { label: "Escrow Volume",   value: `$${stats.totalEscrowVolume.toFixed(2)}` },
                { label: "Total Released",  value: `$${stats.totalReleased.toFixed(2)}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border rounded-xl p-5 space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>

            {/* Row 3 — jobs by status */}
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <p className="text-sm font-semibold">Jobs by Status</p>
              <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                {["open", "funded", "assigned", "submitted", "released", "disputed"].map((status) => (
                  <div key={status} className="text-center space-y-1">
                    <p className="text-2xl font-bold">
                      {stats.jobsByStatus[status] ?? 0}
                    </p>
                    <StatusBadge status={status} />
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ── Jobs Tab ── */}
        {activeTab === "jobs" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{jobs.length} total jobs</p>

            {jobs.length === 0 && (
              <div className="bg-white border border-dashed rounded-xl p-10 text-center">
                <p className="text-gray-400 text-sm">No jobs found.</p>
              </div>
            )}

            {jobs.map((job) => (
              <div key={job.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">

                {/* Header */}
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{job.title}</h3>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1">{job.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">${Number(job.budget).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">budget</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-500">
                  <div className="flex gap-4 flex-wrap">
                    <span>Client: <span className="font-medium text-gray-700">{job.client_name}</span></span>
                    {job.freelancer_name && (
                      <span>Freelancer: <span className="font-medium text-gray-700">{job.freelancer_name}</span></span>
                    )}
                  </div>
                  <span>
                    {new Date(job.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </span>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* ── Disputes Tab ── */}
        {activeTab === "disputes" && (
          <div className="space-y-4">

            {disputes.length === 0 && (
              <div className="bg-white border border-dashed rounded-xl p-10 text-center">
                <p className="text-gray-400 text-sm">No active disputes. 🎉</p>
              </div>
            )}

            {disputes.map((dispute) => (
              <div
                key={dispute.id}
                className="bg-white border border-red-200 rounded-xl overflow-hidden"
              >
                {/* Header */}
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{dispute.title}</h3>
                      <StatusBadge status={dispute.status} />
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{dispute.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">${Number(dispute.escrow_amount).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">in escrow</p>
                  </div>
                </div>

                {/* Parties */}
                <div className="px-5 py-3 border-t bg-red-50 flex gap-6 text-xs text-gray-600 flex-wrap">
                  <span>Client: <span className="font-semibold text-gray-800">{dispute.client_name}</span></span>
                  <span>Freelancer: <span className="font-semibold text-gray-800">{dispute.freelancer_name ?? "—"}</span></span>
                  <span className="text-gray-400 ml-auto">
                    {stats && (
                      <span className="text-orange-600 font-medium">
                        {stats.platformFeePercent}% fee applies if resolved for freelancer
                      </span>
                    )}
                  </span>
                </div>

                {/* Actions */}
                <div className="px-5 py-4 border-t bg-gray-50 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => resolveDispute(dispute.id, "freelancer")}
                    disabled={resolvingId === dispute.id}
                    className="bg-green-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    Release to Freelancer
                  </button>
                  <button
                    onClick={() => resolveDispute(dispute.id, "client")}
                    disabled={resolvingId === dispute.id}
                    className="bg-black text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
                  >
                    Refund to Client
                  </button>
                  {resolvingId === dispute.id && (
                    <span className="text-xs text-gray-400">Processing...</span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

        {/* ── Transactions Tab ── */}
        {activeTab === "transactions" && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{transactions.length} total transactions</p>

            {transactions.length === 0 && (
              <div className="bg-white border border-dashed rounded-xl p-10 text-center">
                <p className="text-gray-400 text-sm">No transactions yet.</p>
              </div>
            )}

            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="bg-white border rounded-xl px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm shrink-0 text-gray-500">
                    {txn.type === "deposit"        ? "↓" :
                     txn.type === "escrow_release" ? "↓" :
                     txn.type === "refund"         ? "↓" : "↑"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TxnBadge type={txn.type} />
                      <span className="text-sm font-medium">{txn.user_name}</span>
                      <span className="text-xs text-gray-400">{txn.user_email}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(txn.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-base">
                  ${Number(txn.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
