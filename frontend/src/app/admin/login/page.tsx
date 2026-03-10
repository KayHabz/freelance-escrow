"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";

export default function AdminLogin() {

  const router = useRouter();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    setError(null);

    if (!email.trim())    return setError("Email is required");
    if (!password.trim()) return setError("Password is required");

    setLoading(true);
    try {
      const res = await api.post("/admin/login", { email, password });
      localStorage.setItem("adminToken", res.data.token);
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? err?.message ?? "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="border rounded shadow p-8 w-full max-w-sm space-y-5 bg-white">

        <div>
          <h1 className="text-2xl font-bold">Admin Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Restricted access only</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 text-sm p-3 rounded">
            {error}
          </div>
        )}

        <input
          className="w-full border p-2 rounded"
          placeholder="Admin Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-black text-white p-2 rounded disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

      </div>
    </div>
  );
}