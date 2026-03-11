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
  freelancer_name?: string;
}

interface Application {
  id: number;
  job_id: number;
  freelancer_id: string;
  proposal: string;
  status: string;
  freelancer_name?: string;
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
  if (type === "deposit" || type === "refund") return "credit";
  return "debit";
};

// ── Status meta ───────────────────────────────────────
const statusMeta: Record<string, { label: string; hint: string }> = {
  open:      { label: "Awaiting escrow",   hint: "Fund escrow to open this job to freelancers." },
  funded:    { label: "Accepting bids",    hint: "Freelancers can now apply. Review applications below." },
  assigned:  { label: "In progress",       hint: "Your freelancer is working on this job." },
  submitted: { label: "Ready to review",   hint: "The freelancer has submitted their work. Review and approve." },
  released:  { label: "Completed",         hint: "Work approved and payment released." },
  disputed:  { label: "Disputed",          hint: "An admin is reviewing this dispute." },
};

// ── Main Component ─────────────────────────────────────
export default function ClientDashboard() {

  const router = useRouter();

  const [balance, setBalance]             = useState<number | null>(null);
  const [jobs, setJobs]                   = useState<Job[]>([]);
  const [applications, setApplications]   = useState<Record<number, Application[]>>({});
  const [expandedJob, setExpandedJob]     = useState<number | null>(null);
  const [transactions, setTransactions]   = useState<Transaction[]>([]);
  const [activeTab, setActiveTab]         = useState<"jobs" | "transactions">("jobs");
  const [showPostJob, setShowPostJob]     = useState(false);

  // Create job form
  const [title, setTitle]                 = useState("");
  const [description, setDescription]     = useState("");
  const [budget, setBudget]               = useState("");
  const [createError, setCreateError]     = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Deposit form
  const [depositAmount, setDepositAmount]   = useState("");
  const [depositError, setDepositError]     = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);

  // Action feedback
  const [actionError, setActionError]     = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // ── Auth guard ───────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    if (!token || role !== "client") router.push("/login");
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

  const fetchJobs = async () => {
    try {
      const res = await api.get("/jobs/my-jobs");
      setJobs(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchApplications = async (jobId: number) => {
    try {
      const res = await api.get(`/jobs/${jobId}/applications`);
      setApplications((prev) => ({ ...prev, [jobId]: res.data }));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchWallet();
    fetchJobs();
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (activeTab === "transactions") fetchTransactions();
  }, [activeTab]);

  // ── Toggle applications ──────────────────────────────
  const toggleApplications = (jobId: number) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
    } else {
      setExpandedJob(jobId);
      if (!applications[jobId]) fetchApplications(jobId);
    }
  };

  // ── Deposit ──────────────────────────────────────────
  const depositFunds = async () => {
    setDepositError(null);
    setDepositSuccess(false);
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0)
      return setDepositError("Enter a valid amount");
    setDepositLoading(true);
    try {
      await api.post("/wallet/deposit", { amount: Number(depositAmount) });
      setDepositSuccess(true);
      setDepositAmount("");
      fetchWallet();
      fetchTransactions();
    } catch (err: any) {
      setDepositError(err?.response?.data?.message ?? err?.message ?? "Deposit failed");
    } finally {
      setDepositLoading(false);
    }
  };

  // ── Create Job ───────────────────────────────────────
  const createJob = async () => {
    setCreateError(null);
    setCreateSuccess(false);
    if (!title.trim())       return setCreateError("Job title is required");
    if (!description.trim()) return setCreateError("Description is required");
    if (!budget || isNaN(Number(budget)) || Number(budget) <= 0)
      return setCreateError("A valid budget is required");
    setCreateLoading(true);
    try {
      await api.post("/jobs", {
        title: title.trim(),
        description: description.trim(),
        budget: Number(budget),
      });
      setCreateSuccess(true);
      setTitle(""); setDescription(""); setBudget("");
      fetchJobs();
      setTimeout(() => setShowPostJob(false), 1500);
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? err?.message ?? "Failed to create job");
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Fund Job ─────────────────────────────────────────
  const fundJob = async (jobId: number) => {
    setActionError(null); setActionSuccess(null);
    try {
      await api.post("/escrow/fund", { jobId });
      setActionSuccess("Job funded! Escrow is holding the funds.");
      fetchWallet(); fetchJobs(); fetchTransactions();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? "Failed to fund job");
    }
  };

  // ── Accept Application ───────────────────────────────
  const acceptApplication = async (applicationId: number, jobId: number) => {
    setActionError(null); setActionSuccess(null);
    try {
      await api.post("/jobs/accept", { applicationId });
      setActionSuccess("Freelancer accepted! Job is now in progress.");
      fetchJobs(); fetchApplications(jobId);
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? "Failed to accept application");
    }
  };

  // ── Approve Work ─────────────────────────────────────
  const approveJob = async (jobId: number) => {
    setActionError(null); setActionSuccess(null);
    try {
      await api.post("/jobs/approve", { jobId });
      setActionSuccess("Work approved! Escrow released to freelancer.");
      fetchWallet(); fetchJobs(); fetchTransactions();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? "Failed to approve job");
    }
  };

  // ── Render ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <Navbar role="client" onLogout={logout} />

      <div className="px-6 py-8 space-y-8 max-w-4xl mx-auto w-full">

        {/* ── Page heading ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your jobs and payments</p>
          </div>
          <button
            onClick={() => setShowPostJob((v) => !v)}
            className="bg-black text-white text-sm px-4 py-2 rounded hover:bg-gray-800"
          >
            {showPostJob ? "Cancel" : "+ Post a Job"}
          </button>
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

        {/* ── Wallet row ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* Balance card */}
          <div className="bg-black text-white rounded-xl p-6 space-y-1">
            <p className="text-xs uppercase tracking-widest opacity-50">Available Balance</p>
            <p className="text-4xl font-bold">
              ${balance !== null ? Number(balance).toFixed(2) : "—"}
            </p>
            <p className="text-xs opacity-40 pt-1">Funds held in escrow are not shown here</p>
          </div>

          {/* Top up card */}
          <div className="bg-white border rounded-xl p-6 space-y-3">
            <p className="text-sm font-semibold">Add Funds</p>
            {depositError && (
              <p className="text-xs text-red-600">{depositError}</p>
            )}
            {depositSuccess && (
              <p className="text-xs text-green-600">✓ Funds added successfully</p>
            )}
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Amount (e.g. 1000)"
                type="number"
                min="1"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && depositFunds()}
              />
              <button
                onClick={depositFunds}
                disabled={depositLoading}
                className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
              >
                {depositLoading ? "..." : "Add"}
              </button>
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDepositAmount(String(preset))}
                  className="flex-1 border rounded-lg py-1.5 text-xs text-gray-500 hover:border-black hover:text-black"
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ── Post Job panel (collapsible) ── */}
        {showPostJob && (
          <div className="bg-white border rounded-xl p-6 space-y-4">
            <h2 className="text-base font-semibold">Post a New Job</h2>

            {createError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {createError}
              </p>
            )}
            {createSuccess && (
              <p className="text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                ✓ Job posted! Fund it below to open it to freelancers.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Job title</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="e.g. Build a landing page"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Description</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Describe the work in detail..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Budget ($)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="e.g. 500"
                  type="number"
                  min="1"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={createJob}
                  disabled={createLoading}
                  className="w-full bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {createLoading ? "Posting..." : "Post Job"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-6 border-b">
          {(["jobs", "transactions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium ${
                activeTab === tab
                  ? "border-b-2 border-black text-black"
                  : "text-gray-400 hover:text-black"
              }`}
            >
              {tab === "jobs" ? "My Jobs" : "Transactions"}
              {tab === "jobs" && jobs.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {jobs.length}
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

        {/* ── My Jobs ── */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            {jobs.length === 0 && (
              <div className="bg-white border border-dashed rounded-xl p-10 text-center space-y-2">
                <p className="text-gray-400 text-sm">No jobs yet.</p>
                <button
                  onClick={() => setShowPostJob(true)}
                  className="text-sm text-black underline underline-offset-2"
                >
                  Post your first job
                </button>
              </div>
            )}

            {jobs.map((job) => {
              const meta = statusMeta[job.status];
              return (
                <div
                  key={job.id}
                  className={`bg-white border rounded-xl overflow-hidden ${
                    job.status === "disputed" ? "border-red-200" :
                    job.status === "submitted" ? "border-orange-200" : "border-gray-200"
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
                      job.status === "disputed"  ? "bg-red-50 border-red-100 text-red-700" :
                      job.status === "submitted" ? "bg-orange-50 border-orange-100 text-orange-700" :
                      job.status === "released"  ? "bg-green-50 border-green-100 text-green-700" :
                      "bg-gray-50 border-gray-100 text-gray-500"
                    }`}>
                      <span>{meta.hint}</span>
                      {job.freelancer_name && (
                        <span className="shrink-0 font-medium text-gray-700">
                          👤 {job.freelancer_name}
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
                      {job.status === "open" && (
                        <button
                          onClick={() => fundJob(job.id)}
                          className="bg-yellow-500 text-white text-xs px-4 py-2 rounded-lg hover:bg-yellow-600 font-medium"
                        >
                          Fund Escrow
                        </button>
                      )}

                      {job.status === "funded" && (
                        <button
                          onClick={() => toggleApplications(job.id)}
                          className="bg-blue-500 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-600 font-medium"
                        >
                          {expandedJob === job.id ? "Hide Applications" : "View Applications"}
                        </button>
                      )}

                      {job.status === "submitted" && (
                        <button
                          onClick={() => approveJob(job.id)}
                          className="bg-green-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
                        >
                          Approve & Release Payment
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Applications drawer */}
                  {expandedJob === job.id && (
                    <div className="border-t px-5 py-4 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Applications
                      </h4>

                      {!applications[job.id] && (
                        <p className="text-sm text-gray-400">Loading...</p>
                      )}
                      {applications[job.id]?.length === 0 && (
                        <p className="text-sm text-gray-400">No applications yet.</p>
                      )}

                      {applications[job.id]?.map((app) => (
                        <div
                          key={app.id}
                          className="border rounded-lg p-4 space-y-2 bg-white"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">
                              {app.freelancer_name ?? "Freelancer"}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              app.status === "accepted"
                                ? "bg-green-100 text-green-700"
                                : app.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {app.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{app.proposal}</p>
                          {app.status === "pending" && (
                            <button
                              onClick={() => acceptApplication(app.id, job.id)}
                              className="bg-black text-white text-xs px-4 py-1.5 rounded-lg hover:bg-gray-800 font-medium"
                            >
                              Accept this freelancer
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

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