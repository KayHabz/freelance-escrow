"use client";

import { useState } from "react";
import api from "@/services/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      const res = await api.post("/auth/login", {
        email,
        password
      });

      localStorage.setItem("token", res.data.token);

      alert("Login successful");

    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert("Login failed: " + msg);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center">

      <div className="w-96 space-y-4">

        <h1 className="text-2xl font-bold">Login</h1>

        <input
          className="w-full border p-2"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full border p-2"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full bg-black text-white p-2"
        >
          Login
        </button>

      </div>

    </div>
  );
}