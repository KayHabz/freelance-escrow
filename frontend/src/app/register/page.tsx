"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]       = useState<"client" | "freelancer">("client");
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const register = async () => {
    setError(null);

    if (!name.trim())                    return setError("Name is required");
    if (!email.trim())                   return setError("Email is required");
    if (!password || password.length < 6) return setError("Password must be at least 6 characters");

    setLoading(true);
    try {
      await api.post("/auth/register", { name, email, password, role });
      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Registration failed");
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
          Already have an account?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-black font-medium underline underline-offset-2"
          >
            Sign in
          </button>
        </p>
      </nav>

      {/* ── Form ── */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="bg-white border rounded shadow p-8 w-full max-w-sm space-y-5">

          <div>
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-sm text-gray-500 mt-1">Join TrustWork — free to sign up</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 text-sm p-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-3">

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Full name</label>
              <input
                className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && register()}
              />
            </div>

            {/* ── Role selector ── */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">I want to</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setRole("client")}
                  className={`border rounded p-3 text-sm font-medium text-left transition-all ${
                    role === "client"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  <span className="block text-lg mb-1">💼</span>
                  Hire freelancers
                </button>
                <button
                  onClick={() => setRole("freelancer")}
                  className={`border rounded p-3 text-sm font-medium text-left transition-all ${
                    role === "freelancer"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  <span className="block text-lg mb-1">🛠️</span>
                  Find work
                </button>
              </div>
            </div>

          </div>

          <button
            onClick={register}
            disabled={loading}
            className="w-full bg-black text-white p-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="text-xs text-center text-gray-400">
            By registering you agree to our terms of service.
          </p>

        </div>
      </div>

    </div>
  );
}