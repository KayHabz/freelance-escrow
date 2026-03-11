"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);

  // ── Show success message if redirected from register ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("registered") === "true") setSuccess(true);
  }, []);

  const login = async () => {
    setError(null);

    if (!email.trim()) return setError("Email is required");
    if (!password)     return setError("Password is required");

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role ?? "client");

      if (res.data.role === "freelancer") {
        router.push("/freelancer/dashboard");
      } else {
        router.push("/client/dashboard");
      }

    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Navbar ── */}
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b">
        <button
          onClick={() => router.push("/")}
          className="text-xl font-bold tracking-tight hover:opacity-70"
        >
          TrustWork
        </button>
        <p className="text-sm text-gray-500">
          Don't have an account?{" "}
          <button
            onClick={() => router.push("/register")}
            className="text-black font-medium underline underline-offset-2"
          >
            Sign up
          </button>
        </p>
      </nav>

      {/* ── Form ── */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="bg-white border rounded shadow p-8 w-full max-w-sm space-y-5">

          <div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your TrustWork account</p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-300 text-green-700 text-sm p-3 rounded">
              Account created! You can now log in.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 text-sm p-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
              />
            </div>
          </div>

          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-black text-white p-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-xs text-center text-gray-400">
            By signing in you agree to our terms of service.
          </p>

        </div>
      </div>

    </div>
  );
}