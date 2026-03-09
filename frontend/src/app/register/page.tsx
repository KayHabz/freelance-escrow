"use client";

import { useState } from "react";
import api from "@/services/api";

export default function RegisterPage() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("client");

  const register = async () => {

    try {

      const res = await api.post("/auth/register", {
        name,
        email,
        password,
        role
      });

      alert("Registration successful");

    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert("Registration failed: " + msg);
    }

  };

  return (
    <div className="flex h-screen items-center justify-center">

      <div className="w-96 space-y-4">

        <h1 className="text-2xl font-bold">Register</h1>

        <input
          className="w-full border p-2"
          placeholder="Name"
          onChange={(e) => setName(e.target.value)}
        />

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

        <select
          className="w-full border p-2"
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="client">Client</option>
          <option value="freelancer">Freelancer</option>
        </select>

        <button
          onClick={register}
          className="w-full bg-black text-white p-2"
        >
          Register
        </button>

      </div>

    </div>
  );
}