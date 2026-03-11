"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";

interface NavbarProps {
  role: "client" | "freelancer";
  onLogout: () => void;
}

export default function Navbar({ role, onLogout }: NavbarProps) {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    api.get("/wallet/balance")
      .then((res) => setBalance(res.data.balance))
      .catch(console.error);
  }, []);

  return (
    <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">

      {/* Left — logo */}
      <button
        onClick={() => router.push("/")}
        className="text-xl font-bold tracking-tight hover:opacity-70"
      >
        TrustWork
      </button>

      {/* Right — role + balance + logout */}
      <div className="flex items-center gap-4">

        {/* Role badge */}
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
          role === "client"
            ? "bg-blue-100 text-blue-700"
            : "bg-purple-100 text-purple-700"
        }`}>
          {role.toUpperCase()}
        </span>

        {/* Wallet balance */}
        <div className="text-sm text-gray-600 border rounded px-3 py-1">
          {balance !== null
            ? <span><span className="text-gray-400">Balance </span><span className="font-semibold text-black">${Number(balance).toFixed(2)}</span></span>
            : <span className="text-gray-400">Loading...</span>
          }
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="text-sm text-gray-500 border px-4 py-1.5 rounded hover:bg-gray-100"
        >
          Logout
        </button>

      </div>
    </nav>
  );
}