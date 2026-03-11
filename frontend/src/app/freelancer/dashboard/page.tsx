"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import Navbar from "@/components/Navbar";

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
    platform_fee:   { label: "Platform Fee",   colour: "bg-gray-100 text-gray-600"    },
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

// ── Work status meta ──────────────────────────────────
const workMeta: Record<string, { hint: string }> = {
  assigned:  { hint: "You've been hired. Complete the work and submit when ready." },
  submitted: { hint: "Work submitted. Waiting for the client to approve and release payment." },
  released:  { hint: "Payment has been released to your wallet. Well done!" },
  disputed:  { hint: "A dispute has been raised. An admin is reviewing this job." },
};

// ── Main Component ─────────────────────────────────────
export default function FreelancerDashboard() {

  const router = useRouter();

  const [balance, setBalance]             = useState<number | null>(null);
  const [openJobs, setOpenJobs]           = useState<Job[]>([]);
  const [assignedJobs, setAssignedJobs]   = useState<AssignedJob[]>([]);
  const [transactions, setTransactions]   = useState<Transaction[]>([]);
  const [activeTab, setActiveTab]         = useState<"browse" | "my-work" | "transactions">("browse");
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  const [proposalMap, setProposalMap]       = useState<Record<number, string>>({});
  const [applyingJobId, setApplyingJobId]   = useState<number | null>(null);

  const [actionError, setActionError]     = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // ── Auth guard ───────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    if (!token || role !== "freelancer") router.push("/login");
  }, []);

  // ── Logout ───────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  // ── Fetchers ─────────────────────────────────────────
  const fetchWallet = async () => {
    try {
      const res = await api.get("/wallet/balance");
      setBalance(res.data.balance);
    } catch (err) { console.error(err); }
  };

  const fetchTransactions = async () => {
    try {
      const res = await api.get("/wallet/transactions");
      setTransactions(res.data.transactions);
    } catch (err) { console.error(err); }
  };

  const fetchOpenJobs = async () => {
    try {
      const res = await api.get("/jobs");
      setOpenJobs(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchAssignedJobs = async () => {
    try {
      const res = await api.get("/jobs/my-work");
      setAssignedJobs(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchWallet();
    fetchOpenJobs();
    fetchAssignedJobs();
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (activeTab === "transactions") fetchTransactions();
    if (activeTab === "my-work")      fetchAssignedJobs();
    if (activeTab === "browse")       fetchOpenJobs();
  }, [activeTab]);

  // ── Apply to Job ─────────────────────────────────────
  const applyToJob = async (jobId: number) => {
    setActionError(null); setActionSuccess(null);
    const proposal = proposalMap[jobId]?.trim();
    if (!proposal) return setActionError("Please write a proposal before applying");
    setApplyingJobId(jobId);
    try {
      await api.post("/jobs/apply", { jobId, proposal });
      setActionSuccess("Application submitted!");
      setProposalMap((prev) => ({ ...prev, [jobId]: "" }));
      setExpandedJobId(null);
      fetchOpenJobs();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? "Failed to apply");
    } finally {
      setApplyingJobId(null);
    }
  };

  // ── Submit Work ──────────────────────────────────────
  const submitWork = async (jobId: number) => {
    setActionError(null); setActionSuccess(null);
    try {
      await api.post("/jobs/complete", { jobId });
      setActionSuccess("Work submitted! Awaiting client approval.");
      fetchAssignedJobs(); fetchWallet(); fetchTransactions();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? "Failed to submit work");
    }
  };

  // ── Raise Dispute ────────────────────────────────────
  const raiseDispute = async (jobId: number) => {
    setActionError(null); setActionSuccess(null);
    const reason = window.prompt("Please describe the reason for your dispute:");
    if (!reason?.trim()) return;
    try {
      await api.post("/jobs/dispute", { jobId, reason });
      setActionSuccess("Dispute raised. An admin will review shortly.");
      fetchAssignedJobs();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? "Failed to raise dispute");
    }
  };

  // ── Render ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <Navbar role="freelancer" onLogout={logout} />

      <div className="px-6 py-8 space-y-8 max-w-4xl mx-auto w-full">

        {/* ── Page heading ── */}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Find work and manage your jobs</p>
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

        {/* ── Earnings card ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2 bg-black text-white rounded-xl p-6 space-y-1">
            <p className="text-xs uppercase tracking-widest opacity-50">Available Earnings</p>
            <p className="text-4xl font-bold">
              ${balance !== null ? Number(balance).toFixed(2) : "—"}
            </p>
            <p className="text-xs opacity-40 pt-1">
              Credited here when clients approve your submitted work
            </p>
          </div>
          <div className="bg-white border rounded-xl p-6 flex flex-col justify-between space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active Jobs</p>
              <p className="text-4xl font-bold mt-1">
                {assignedJobs.filter(j => j.status === "assigned" || j.status === "submitted").length}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("my-work")}
              className="text-xs text-gray-500 underline underline-offset-2 text-left hover:text-black"
            >
              View my work →
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-6 border-b">
          {(["browse", "my-work", "transactions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium ${
                activeTab === tab
                  ? "border-b-2 border-black text-black"
                  : "text-gray-400 hover:text-black"
              }`}
            >
              {tab === "browse" ? "Browse Jobs" : tab === "my-work" ? "My Work" : "Transactions"}
              {tab === "my-work" && assignedJobs.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {assignedJobs.length}
                </span>
              )}
              {tab === "transactions" && transactions.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {transactions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Browse Jobs ── */}
        {activeTab === "browse" && (
          <div className="space-y-4">
            {openJobs.length === 0 && (
              <div className="bg-white border border-dashed rounded-xl p-10 text-center">
                <p className="text-gray-400 text-sm">No funded jobs available right now.</p>
                <p className="text-gray-400 text-xs mt-1">Check back soon — new jobs appear here once escrow is funded.</p>
              </div>
            )}

            {openJobs.map((job) => {
              const isExpanded = expandedJobId === job.id;
              return (
                <div
                  key={job.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                >
                  {/* Job header */}
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base">{job.title}</h3>
                        <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                          Escrow secured
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{job.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold">${Number(job.budget).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">budget</p>
                    </div>
                  </div>

                  {/* Proposal drawer */}
                  {isExpanded && (
                    <div className="border-t px-5 py-4 space-y-3 bg-gray-50">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Your Proposal
                      </p>
                      <textarea
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                        rows={3}
                        placeholder="Describe why you're the right person for this job..."
                        value={proposalMap[job.id] ?? ""}
                        onChange={(e) =>
                          setProposalMap((prev) => ({ ...prev, [job.id]: e.target.value }))
                        }
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => applyToJob(job.id)}
                          disabled={applyingJobId === job.id}
                          className="bg-black text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
                        >
                          {applyingJobId === job.id ? "Submitting..." : "Submit Proposal"}
                        </button>
                        <button
                          onClick={() => setExpandedJobId(null)}
                          className="text-sm px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {new Date(job.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </p>
                    {!isExpanded && (
                      <button
                        onClick={() => setExpandedJobId(job.id)}
                        className="bg-black text-white text-xs px-4 py-2 rounded-lg hover:bg-gray-800 font-medium"
                      >
                        Apply
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* ── My Work ── */}
        {activeTab === "my-work" && (
          <div className="space-y-4">
            {assignedJobs.length === 0 && (
              <div className="bg-white border border-dashed rounded-xl p-10 text-center space-y-2">
                <p className="text-gray-400 text-sm">No jobs assigned yet.</p>
                <button
                  onClick={() => setActiveTab("browse")}
                  className="text-sm text-black underline underline-offset-2"
                >
                  Browse available jobs
                </button>
              </div>
            )}

            {assignedJobs.map((job) => {
              const meta = workMeta[job.status];
              return (
                <div
                  key={job.id}
                  className={`bg-white border rounded-xl overflow-hidden ${
                    job.status === "disputed"  ? "border-red-200"    :
                    job.status === "submitted" ? "border-orange-200" :
                    job.status === "released"  ? "border-green-200"  :
                    "border-gray-200"
                  }`}
                >
                  {/* Card header */}
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base">{job.title}</h3>
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{job.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold">${Number(job.budget).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">budget</p>
                    </div>
                  </div>

                  {/* Status hint bar */}
                  {meta && (
                    <div className={`px-5 py-2.5 border-t text-xs flex items-center justify-between gap-4 ${
                      job.status === "disputed"  ? "bg-red-50 border-red-100 text-red-700"       :
                      job.status === "submitted" ? "bg-orange-50 border-orange-100 text-orange-700" :
                      job.status === "released"  ? "bg-green-50 border-green-100 text-green-700" :
                      "bg-gray-50 border-gray-100 text-gray-500"
                    }`}>
                      <span>{meta.hint}</span>
                      {job.client_name && (
                        <span className="shrink-0 font-medium text-gray-700">
                          👤 {job.client_name}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action footer */}
                  <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-gray-400">
                      {new Date(job.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </p>
                    <div className="flex gap-2">
                      {job.status === "assigned" && (
                        <button
                          onClick={() => submitWork(job.id)}
                          className="bg-black text-white text-xs px-4 py-2 rounded-lg hover:bg-gray-800 font-medium"
                        >
                          Submit Work
                        </button>
                      )}

                      {job.status === "submitted" && (
                        <button
                          onClick={() => raiseDispute(job.id)}
                          className="bg-red-500 text-white text-xs px-4 py-2 rounded-lg hover:bg-red-600 font-medium"
                        >
                          Raise Dispute
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* ── Transactions ── */}
        {activeTab === "transactions" && (
          <div className="space-y-2">
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
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${
                    txnDirection(txn.type) === "credit"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {txnDirection(txn.type) === "credit" ? "↓" : "↑"}
                  </div>
                  <div>
                    <TxnBadge type={txn.type} />
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(txn.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <p className={`font-bold text-base ${
                  txnDirection(txn.type) === "credit" ? "text-green-600" : "text-red-500"
                }`}>
                  {txnDirection(txn.type) === "credit" ? "+" : "−"}${Number(txn.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}