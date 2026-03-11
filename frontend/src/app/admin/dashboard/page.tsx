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

  // Feedback
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
    try {
      const res = await adminApi.get("/admin/stats");
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchJobs = async () => {
    try {
      const res = await adminApi.get("/admin/jobs");
      setJobs(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchDisputes = async () => {
    try {
      const res = await adminApi.get("/admin/disputes");
      setDisputes(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTransactions = async () => {
    try {
      const res = await adminApi.get("/admin/transactions");
      setTransactions(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchStats();
    fetchJobs();
    fetchDisputes();
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (activeTab === "overview")     fetchStats();
    if (activeTab === "jobs")         fetchJobs();
    if (activeTab === "disputes")     fetchDisputes();
    if (activeTab === "transactions") fetchTransactions();
  }, [activeTab]);

  // ── Resolve Dispute ──────────────────────────────────
  const resolveDispute = async (jobId: number, inFavourOf: "freelancer" | "client") => {
    setActionError(null);
    setActionSuccess(null);
    setResolvingId(jobId);
    try {
      const res = await adminApi.post("/admin/resolve", { jobId, inFavourOf });
      setActionSuccess(res.data.message);
      fetchDisputes();
      fetchStats();
      fetchTransactions();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ?? err?.message ?? "Failed to resolve dispute"
      );
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
    <div className="p-10 space-y-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Super admin portal</p>
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-500 border px-4 py-2 rounded hover:bg-gray-100"
        >
          Logout
        </button>
      </div>

      {/* Action feedback */}
      {actionError && (
        <div className="bg-red-50 border border-red-300 text-red-700 text-sm p-3 rounded">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="bg-green-50 border border-green-300 text-green-700 text-sm p-3 rounded">
          {actionSuccess}
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

          {/* ── Row 1: Core stats ── */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="border rounded shadow p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Users</p>
              <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
            </div>
            <div className="border rounded shadow p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Jobs</p>
              <p className="text-3xl font-bold mt-1">{stats.totalJobs}</p>
            </div>
            <div className="border rounded shadow p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Escrow Volume</p>
              <p className="text-3xl font-bold mt-1">${stats.totalEscrowVolume.toFixed(2)}</p>
            </div>
            <div className="border rounded shadow p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Released</p>
              <p className="text-3xl font-bold mt-1">${stats.totalReleased.toFixed(2)}</p>
            </div>
          </div>

          {/* ── Row 2: Revenue ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded shadow p-5 bg-black text-white">
              <p className="text-xs uppercase tracking-wide opacity-60">Platform Revenue</p>
              <p className="text-3xl font-bold mt-1">
                ${stats.totalPlatformFees.toFixed(2)}
              </p>
              <p className="text-xs opacity-50 mt-1">
                {stats.platformFeePercent}% fee on all released escrows
              </p>
            </div>
            <div className="border rounded shadow p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Fee per Job</p>
              <p className="text-3xl font-bold mt-1">
                ${
                  stats.totalReleased > 0
                    ? (stats.totalPlatformFees / (stats.jobsByStatus["released"] ?? 1)).toFixed(2)
                    : "0.00"
                }
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Across {stats.jobsByStatus["released"] ?? 0} completed job{stats.jobsByStatus["released"] === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {/* ── Jobs by status ── */}
          <div className="border rounded shadow p-5 space-y-3">
            <h2 className="font-semibold">Jobs by Status</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.jobsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── Jobs Tab ── */}
      {activeTab === "jobs" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{jobs.length} total jobs</p>

          {jobs.length === 0 && (
            <p className="text-gray-500 text-sm">No jobs found.</p>
          )}

          {jobs.map((job) => (
            <div key={job.id} className="border rounded shadow p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{job.title}</h3>
                <StatusBadge status={job.status} />
              </div>
              <p className="text-sm text-gray-500">{job.description}</p>
              <div className="flex gap-6 text-sm text-gray-600 flex-wrap">
                <span>Budget: <span className="font-medium">${Number(job.budget).toFixed(2)}</span></span>
                <span>Client: <span className="font-medium">{job.client_name}</span></span>
                {job.freelancer_name && (
                  <span>Freelancer: <span className="font-medium">{job.freelancer_name}</span></span>
                )}
                <span className="text-xs text-gray-400">
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
            <p className="text-gray-500 text-sm">No active disputes.</p>
          )}

          {disputes.map((dispute) => (
            <div key={dispute.id} className="border border-red-200 rounded shadow p-5 space-y-3 bg-red-50">

              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{dispute.title}</h3>
                <StatusBadge status={dispute.status} />
              </div>

              <p className="text-sm text-gray-600">{dispute.description}</p>

              <div className="flex gap-6 text-sm text-gray-600 flex-wrap">
                <span>Escrow: <span className="font-bold">${Number(dispute.escrow_amount).toFixed(2)}</span></span>
                <span>Client: <span className="font-medium">{dispute.client_name}</span></span>
                <span>Freelancer: <span className="font-medium">{dispute.freelancer_name ?? "—"}</span></span>
              </div>

              {/* Fee notice */}
              <p className="text-xs text-gray-500">
                Note: a {stats?.platformFeePercent ?? 10}% platform fee will apply if resolved in favour of the freelancer.
              </p>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => resolveDispute(dispute.id, "freelancer")}
                  disabled={resolvingId === dispute.id}
                  className="bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Release to Freelancer
                </button>
                <button
                  onClick={() => resolveDispute(dispute.id, "client")}
                  disabled={resolvingId === dispute.id}
                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Refund to Client
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── Transactions Tab ── */}
      {activeTab === "transactions" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{transactions.length} total transactions</p>

          {transactions.length === 0 && (
            <p className="text-gray-500 text-sm">No transactions yet.</p>
          )}

          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="border rounded p-4 flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <TxnBadge type={txn.type} />
                  <span className="text-sm font-medium">{txn.user_name}</span>
                  <span className="text-xs text-gray-400">{txn.user_email}</span>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(txn.created_at).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <p className="font-bold text-lg">
                ${Number(txn.amount).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
