"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";

// ── Types ──────────────────────────────────────────────
interface Job {
  id: number;
  title: string;
  description: string;
  budget: number;
  status: string;
  created_at: string;
}

interface AssignedJob {
  id: number;
  title: string;
  description: string;
  budget: number;
  status: string;
  created_at: string;
  client_name?: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  created_at: string;
}

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

// ── Transaction Badge ──────────────────────────────────
const TxnBadge = ({ type }: { type: string }) => {
  const styles: Record<string, { label: string; colour: string }> = {
    deposit:        { label: "Deposit",        colour: "bg-green-100 text-green-700"   },
    escrow_funding: { label: "Escrow Funded",  colour: "bg-yellow-100 text-yellow-700" },
    escrow_release: { label: "Escrow Release", colour: "bg-blue-100 text-blue-700"    },
    refund:         { label: "Refund",         colour: "bg-purple-100 text-purple-700" },
  };
  const style = styles[type] ?? { label: type, colour: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${style.colour}`}>
      {style.label}
    </span>
  );
};

// ── Direction indicator ────────────────────────────────
const txnDirection = (type: string): "debit" | "credit" => {
  if (type === "escrow_release" || type === "deposit" || type === "refund") return "credit";
  return "debit";
};

// ── Main Component ─────────────────────────────────────
export default function FreelancerDashboard() {

  const router = useRouter();

  const [balance, setBalance]             = useState<number | null>(null);
  const [openJobs, setOpenJobs]           = useState<Job[]>([]);
  const [assignedJobs, setAssignedJobs]   = useState<AssignedJob[]>([]);
  const [transactions, setTransactions]   = useState<Transaction[]>([]);
  const [activeTab, setActiveTab]         = useState<"browse" | "my-work" | "transactions">("browse");

  // Apply form
  const [proposalMap, setProposalMap]     = useState<Record<number, string>>({});
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);

  // Feedback
  const [actionError, setActionError]     = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // ── Auth guard ───────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    if (!token || role !== "freelancer") {
      router.push("/login");
    }
  }, []);

  // ── Logout ───────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  // ── Fetch wallet balance ─────────────────────────────
  const fetchWallet = async () => {
    try {
      const res = await api.get("/wallet/balance");
      setBalance(res.data.balance);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Fetch transactions ───────────────────────────────
  const fetchTransactions = async () => {
    try {
      const res = await api.get("/wallet/transactions");
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Fetch open jobs to browse ────────────────────────
  const fetchOpenJobs = async () => {
    try {
      const res = await api.get("/jobs");
      setOpenJobs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Fetch jobs assigned to this freelancer ───────────
  const fetchAssignedJobs = async () => {
    try {
      const res = await api.get("/jobs/my-work");
      setAssignedJobs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWallet();
    fetchOpenJobs();
    fetchAssignedJobs();
    fetchTransactions();
  }, []);

  // ── Refresh transactions when tab switches ───────────
  useEffect(() => {
    if (activeTab === "transactions") fetchTransactions();
  }, [activeTab]);

  // ── Apply to Job ─────────────────────────────────────
  const applyToJob = async (jobId: number) => {
    setActionError(null);
    setActionSuccess(null);

    const proposal = proposalMap[jobId]?.trim();
    if (!proposal) return setActionError("Please write a proposal before applying");

    setApplyingJobId(jobId);
    try {
      await api.post("/jobs/apply", { jobId, proposal });
      setActionSuccess("Application submitted successfully!");
      setProposalMap((prev) => ({ ...prev, [jobId]: "" }));
      fetchOpenJobs();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ?? err?.message ?? "Failed to apply"
      );
    } finally {
      setApplyingJobId(null);
    }
  };

  // ── Submit Work ──────────────────────────────────────
  const submitWork = async (jobId: number) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.post("/jobs/complete", { jobId });
      setActionSuccess("Work submitted! Awaiting client approval.");
      fetchAssignedJobs();
      fetchWallet();
      fetchTransactions();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ?? err?.message ?? "Failed to submit work"
      );
    }
  };

  // ── Raise Dispute ────────────────────────────────────
  const raiseDispute = async (jobId: number) => {
    setActionError(null);
    setActionSuccess(null);
    const reason = window.prompt("Please describe the reason for your dispute:");
    if (!reason?.trim()) return;
    try {
      await api.post("/jobs/dispute", { jobId, reason });
      setActionSuccess("Dispute raised. An admin will review shortly.");
      fetchAssignedJobs();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ?? err?.message ?? "Failed to raise dispute"
      );
    }
  };

  // ── Render ───────────────────────────────────────────
  return (
    <div className="p-10 space-y-8 max-w-4xl mx-auto">

      {/* ── Header with logout ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Freelancer Dashboard</h1>
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

      {/* ── Wallet Balance ── */}
      <div className="border p-6 w-72 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Wallet Balance</h2>
        <p className="text-2xl font-bold">
          ${balance !== null ? Number(balance).toFixed(2) : "Loading..."}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Earnings are credited here when clients approve your work.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("browse")}
          className={`pb-2 text-sm font-medium ${
            activeTab === "browse"
              ? "border-b-2 border-black text-black"
              : "text-gray-400 hover:text-black"
          }`}
        >
          Browse Jobs
        </button>
        <button
          onClick={() => setActiveTab("my-work")}
          className={`pb-2 text-sm font-medium ${
            activeTab === "my-work"
              ? "border-b-2 border-black text-black"
              : "text-gray-400 hover:text-black"
          }`}
        >
          My Work
          {assignedJobs.length > 0 && (
            <span className="ml-2 bg-black text-white text-xs px-2 py-0.5 rounded-full">
              {assignedJobs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`pb-2 text-sm font-medium ${
            activeTab === "transactions"
              ? "border-b-2 border-black text-black"
              : "text-gray-400 hover:text-black"
          }`}
        >
          Transactions
          {transactions.length > 0 && (
            <span className="ml-2 bg-black text-white text-xs px-2 py-0.5 rounded-full">
              {transactions.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Browse Jobs Tab ── */}
      {activeTab === "browse" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Open Jobs</h2>

          {openJobs.length === 0 && (
            <p className="text-gray-500 text-sm">No open jobs available right now.</p>
          )}

          {openJobs.map((job) => (
            <div key={job.id} className="border rounded shadow p-5 space-y-3">

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <p className="text-sm text-gray-500">{job.description}</p>
                </div>
                <StatusBadge status={job.status} />
              </div>

              <p className="text-sm font-medium">
                Budget: <span className="font-bold">${Number(job.budget).toFixed(2)}</span>
              </p>

              <div className="space-y-2">
                <textarea
                  className="w-full border p-2 rounded text-sm"
                  rows={2}
                  placeholder="Write your proposal..."
                  value={proposalMap[job.id] ?? ""}
                  onChange={(e) =>
                    setProposalMap((prev) => ({ ...prev, [job.id]: e.target.value }))
                  }
                />
                <button
                  onClick={() => applyToJob(job.id)}
                  disabled={applyingJobId === job.id}
                  className="bg-black text-white text-sm px-4 py-2 rounded disabled:opacity-50 hover:bg-gray-800"
                >
                  {applyingJobId === job.id ? "Applying..." : "Apply"}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── My Work Tab ── */}
      {activeTab === "my-work" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">My Assigned Jobs</h2>

          {assignedJobs.length === 0 && (
            <p className="text-gray-500 text-sm">
              No jobs assigned yet. Apply to open jobs to get started.
            </p>
          )}

          {assignedJobs.map((job) => (
            <div key={job.id} className="border rounded shadow p-5 space-y-3">

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <p className="text-sm text-gray-500">{job.description}</p>
                </div>
                <StatusBadge status={job.status} />
              </div>

              <p className="text-sm font-medium">
                Budget: <span className="font-bold">${Number(job.budget).toFixed(2)}</span>
              </p>

              {job.client_name && (
                <p className="text-sm text-gray-600">
                  Client: <span className="font-medium">{job.client_name}</span>
                </p>
              )}

              <div className="flex gap-2 flex-wrap items-center">

                {job.status === "assigned" && (
                  <button
                    onClick={() => submitWork(job.id)}
                    className="bg-black text-white text-sm px-4 py-2 rounded hover:bg-gray-800"
                  >
                    Submit Work
                  </button>
                )}

                {job.status === "submitted" && (
                  <>
                    <span className="text-orange-600 text-sm font-medium">
                      ⏳ Awaiting client approval
                    </span>
                    <button
                      onClick={() => raiseDispute(job.id)}
                      className="bg-red-500 text-white text-sm px-4 py-2 rounded hover:bg-red-600"
                    >
                      Raise Dispute
                    </button>
                  </>
                )}

                {job.status === "released" && (
                  <div className="space-y-1">
                    <p className="text-green-600 text-sm font-medium">
                      ✓ Completed — ${Number(job.budget).toFixed(2)} paid to your wallet
                    </p>
                    <p className="text-xs text-gray-400">
                      Check your wallet balance above to confirm.
                    </p>
                  </div>
                )}

                {job.status === "disputed" && (
                  <span className="text-red-600 text-sm font-medium">
                    ⚠ Dispute in progress — awaiting admin resolution
                  </span>
                )}

              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── Transactions Tab ── */}
      {activeTab === "transactions" && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Transaction History</h2>

          {transactions.length === 0 && (
            <p className="text-gray-500 text-sm">No transactions yet.</p>
          )}

          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="border rounded p-4 flex items-center justify-between"
            >
              <div className="space-y-1">
                <TxnBadge type={txn.type} />
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(txn.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <p className={`font-bold text-lg ${
                txnDirection(txn.type) === "credit"
                  ? "text-green-600"
                  : "text-red-600"
              }`}>
                {txnDirection(txn.type) === "credit" ? "+" : "-"}
                ${Number(txn.amount).toFixed(2)}
              </p>
            </div>
          ))}

        </div>
      )}

    </div>
  );
}