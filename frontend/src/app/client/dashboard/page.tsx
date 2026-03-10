"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";

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
    deposit:        { label: "Deposit",        colour: "bg-green-100 text-green-700"  },
    escrow_funding: { label: "Escrow Funded",  colour: "bg-yellow-100 text-yellow-700" },
    escrow_release: { label: "Escrow Release", colour: "bg-blue-100 text-blue-700"   },
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
  if (type === "deposit" || type === "refund") return "credit";
  return "debit";
};

// ── Main Component ─────────────────────────────────────
export default function Dashboard() {

  const [balance, setBalance]             = useState<number | null>(null);
  const [jobs, setJobs]                   = useState<Job[]>([]);
  const [applications, setApplications]   = useState<Record<number, Application[]>>({});
  const [expandedJob, setExpandedJob]     = useState<number | null>(null);
  const [transactions, setTransactions]   = useState<Transaction[]>([]);
  const [activeTab, setActiveTab]         = useState<"jobs" | "transactions">("jobs");

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

  // ── Fetch client's jobs ──────────────────────────────
  const fetchJobs = async () => {
    try {
      const res = await api.get("/jobs/my-jobs");
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Fetch applications for a job ─────────────────────
  const fetchApplications = async (jobId: number) => {
    try {
      const res = await api.get(`/jobs/${jobId}/applications`);
      setApplications((prev) => ({ ...prev, [jobId]: res.data }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWallet();
    fetchJobs();
    fetchTransactions();
  }, []);

  // ── Refresh transactions when tab switches ───────────
  useEffect(() => {
    if (activeTab === "transactions") fetchTransactions();
  }, [activeTab]);

  // ── Toggle job applications ──────────────────────────
  const toggleApplications = (jobId: number) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
    } else {
      setExpandedJob(jobId);
      if (!applications[jobId]) fetchApplications(jobId);
    }
  };

  // ── Deposit Funds ────────────────────────────────────
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
      setDepositError(
        err?.response?.data?.message ?? err?.message ?? "Deposit failed"
      );
    } finally {
      setDepositLoading(false);
    }
  };

  // ── Create Job ───────────────────────────────────────
  const createJob = async () => {
    setCreateError(null);
    setCreateSuccess(false);

    if (!title.trim()) return setCreateError("Job title is required");
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
      setTitle("");
      setDescription("");
      setBudget("");
      fetchJobs();

    } catch (err: any) {
      setCreateError(
        err?.response?.data?.message ?? err?.message ?? "Failed to create job"
      );
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Fund Job ─────────────────────────────────────────
  const fundJob = async (jobId: number) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.post("/escrow/fund", { jobId });
      setActionSuccess("Job funded successfully! Escrow is holding the funds.");
      fetchWallet();
      fetchJobs();
      fetchTransactions();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ?? err?.message ?? "Failed to fund job"
      );
    }
  };

  // ── Accept Application ───────────────────────────────
  const acceptApplication = async (applicationId: number, jobId: number) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.post("/jobs/accept", { applicationId });
      setActionSuccess("Freelancer accepted! Job is now in progress.");
      fetchJobs();
      fetchApplications(jobId);
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ?? err?.message ?? "Failed to accept application"
      );
    }
  };

  // ── Approve Work ─────────────────────────────────────
  const approveJob = async (jobId: number) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.post("/jobs/approve", { jobId });
      setActionSuccess("Work approved! Escrow released to freelancer.");
      fetchWallet();
      fetchJobs();
      fetchTransactions();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ?? err?.message ?? "Failed to approve job"
      );
    }
  };

  // ── Render ───────────────────────────────────────────
  return (
    <div className="p-10 space-y-10 max-w-4xl mx-auto">

      <h1 className="text-3xl font-bold">Client Dashboard</h1>

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

      {/* ── Wallet & Top Up ── */}
      <div className="flex gap-6 flex-wrap">

        {/* Balance */}
        <div className="border p-6 w-72 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Wallet Balance</h2>
          <p className="text-2xl font-bold">
            ${balance !== null ? Number(balance).toFixed(2) : "Loading..."}
          </p>
        </div>

        {/* Top Up */}
        <div className="border p-6 w-72 rounded shadow space-y-3">
          <h2 className="text-lg font-semibold">Top Up Wallet</h2>

          {depositError && (
            <div className="bg-red-50 border border-red-300 text-red-700 text-sm p-3 rounded">
              {depositError}
            </div>
          )}
          {depositSuccess && (
            <div className="bg-green-50 border border-green-300 text-green-700 text-sm p-3 rounded">
              Funds added successfully!
            </div>
          )}

          <input
            className="w-full border p-2 rounded"
            placeholder="Amount (e.g. 1000)"
            type="number"
            min="1"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <button
            onClick={depositFunds}
            disabled={depositLoading}
            className="w-full bg-black text-white p-2 rounded disabled:opacity-50"
          >
            {depositLoading ? "Processing..." : "Add Funds"}
          </button>
        </div>

      </div>

      {/* ── Create Job Form ── */}
      <div className="border p-6 rounded shadow space-y-4 max-w-lg">
        <h2 className="text-xl font-bold">Post a New Job</h2>

        {createError && (
          <div className="bg-red-50 border border-red-300 text-red-700 text-sm p-3 rounded">
            {createError}
          </div>
        )}
        {createSuccess && (
          <div className="bg-green-50 border border-green-300 text-green-700 text-sm p-3 rounded">
            Job posted! Fund it below to open it to freelancers.
          </div>
        )}

        <input
          className="w-full border p-2 rounded"
          placeholder="Job Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full border p-2 rounded"
          placeholder="Description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Budget (e.g. 500)"
          type="number"
          min="1"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
        <button
          onClick={createJob}
          disabled={createLoading}
          className="w-full bg-black text-white p-2 rounded disabled:opacity-50"
        >
          {createLoading ? "Posting..." : "Post Job"}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("jobs")}
          className={`pb-2 text-sm font-medium ${
            activeTab === "jobs"
              ? "border-b-2 border-black text-black"
              : "text-gray-400 hover:text-black"
          }`}
        >
          My Jobs
          {jobs.length > 0 && (
            <span className="ml-2 bg-black text-white text-xs px-2 py-0.5 rounded-full">
              {jobs.length}
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
          Transaction History
          {transactions.length > 0 && (
            <span className="ml-2 bg-black text-white text-xs px-2 py-0.5 rounded-full">
              {transactions.length}
            </span>
          )}
        </button>
      </div>

      {/* ── My Jobs Tab ── */}
      {activeTab === "jobs" && (
        <div className="space-y-4">
          {jobs.length === 0 && (
            <p className="text-gray-500 text-sm">
              No jobs yet. Post your first job above.
            </p>
          )}

          {jobs.map((job) => (
            <div key={job.id} className="border rounded shadow p-5 space-y-3">

              {/* Job header */}
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

              {/* Freelancer name */}
              {(job.status === "assigned" || job.status === "submitted") && job.freelancer_name && (
                <p className="text-sm text-gray-600">
                  Freelancer: <span className="font-medium">{job.freelancer_name}</span>
                </p>
              )}

              {/* ── Actions per status ── */}
              <div className="flex gap-2 flex-wrap">

                {job.status === "open" && (
                  <button
                    onClick={() => fundJob(job.id)}
                    className="bg-yellow-500 text-white text-sm px-4 py-2 rounded hover:bg-yellow-600"
                  >
                    Fund Escrow
                  </button>
                )}

                {job.status === "funded" && (
                  <button
                    onClick={() => toggleApplications(job.id)}
                    className="bg-blue-500 text-white text-sm px-4 py-2 rounded hover:bg-blue-600"
                  >
                    {expandedJob === job.id ? "Hide Applications" : "View Applications"}
                  </button>
                )}

                {job.status === "assigned" && (
                  <span className="text-purple-600 text-sm font-medium">
                    ⏳ Waiting for freelancer to submit work
                  </span>
                )}

                {job.status === "submitted" && (
                  <button
                    onClick={() => approveJob(job.id)}
                    className="bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700"
                  >
                    Approve & Release Payment
                  </button>
                )}

                {job.status === "disputed" && (
                  <span className="text-red-600 text-sm font-medium">
                    ⚠ Dispute in progress — awaiting admin resolution
                  </span>
                )}

                {job.status === "released" && (
                  <span className="text-green-600 text-sm font-medium">
                    ✓ Completed & paid
                  </span>
                )}

              </div>

              {/* ── Applications list ── */}
              {expandedJob === job.id && (
                <div className="mt-3 border-t pt-3 space-y-3">
                  <h4 className="font-semibold text-sm">Applications</h4>

                  {!applications[job.id] && (
                    <p className="text-sm text-gray-400">Loading...</p>
                  )}

                  {applications[job.id]?.length === 0 && (
                    <p className="text-sm text-gray-400">No applications yet.</p>
                  )}

                  {applications[job.id]?.map((app) => (
                    <div
                      key={app.id}
                      className="border rounded p-3 space-y-2 bg-gray-50"
                    >
                      {app.freelancer_name && (
                        <p className="text-sm font-medium">{app.freelancer_name}</p>
                      )}
                      <p className="text-sm">
                        <span className="font-medium">Proposal: </span>
                        {app.proposal}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Status: {app.status}
                        </span>
                        {app.status === "pending" && (
                          <button
                            onClick={() => acceptApplication(app.id, job.id)}
                            className="bg-black text-white text-xs px-3 py-1 rounded hover:bg-gray-800"
                          >
                            Accept
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* ── Transactions Tab ── */}
      {activeTab === "transactions" && (
        <div className="space-y-3">

          {transactions.length === 0 && (
            <p className="text-gray-500 text-sm">No transactions yet.</p>
          )}

          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="border rounded p-4 flex items-center justify-between"
            >
              {/* Left — type + date */}
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

              {/* Right — amount */}
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