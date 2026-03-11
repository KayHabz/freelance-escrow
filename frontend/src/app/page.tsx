"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">

      {/* ── Navbar ── */}
      <nav className="flex items-center justify-between px-8 py-5 border-b">
        <span className="text-xl font-bold tracking-tight">TrustWork</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/login")}
            className="text-sm text-gray-600 hover:text-black"
          >
            Log in
          </button>
          <button
            onClick={() => router.push("/register")}
            className="text-sm bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Get started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32 space-y-6">
        <div className="inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
          Secure Freelance Payments
        </div>
        <h1 className="text-5xl font-bold leading-tight max-w-2xl">
          Get paid. Stay protected.
          <br />
          <span className="text-gray-400">Every time.</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-xl">
          TrustWork holds payment in escrow until the job is done.
          Clients only pay for completed work. Freelancers always get paid.
        </p>
        <div className="flex gap-4 pt-2">
          <button
            onClick={() => router.push("/register")}
            className="bg-black text-white px-6 py-3 rounded text-sm font-medium hover:bg-gray-800"
          >
            Start for free
          </button>
          <button
            onClick={() => router.push("/login")}
            className="border border-gray-300 text-black px-6 py-3 rounded text-sm font-medium hover:bg-gray-50"
          >
            Log in
          </button>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-gray-50 px-8 py-20">
        <div className="max-w-4xl mx-auto space-y-12">

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="text-gray-500">Three steps. Zero risk.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">

            <div className="bg-white border rounded shadow p-6 space-y-3">
              <div className="text-2xl font-bold text-gray-200">01</div>
              <h3 className="font-semibold text-lg">Client posts a job</h3>
              <p className="text-sm text-gray-500">
                Describe the work, set a budget, and fund the escrow. Your payment is held securely — not charged to the freelancer.
              </p>
            </div>

            <div className="bg-white border rounded shadow p-6 space-y-3">
              <div className="text-2xl font-bold text-gray-200">02</div>
              <h3 className="font-semibold text-lg">Freelancer applies & works</h3>
              <p className="text-sm text-gray-500">
                Freelancers browse funded jobs and submit proposals. Once accepted, they complete the work and submit for review.
              </p>
            </div>

            <div className="bg-white border rounded shadow p-6 space-y-3">
              <div className="text-2xl font-bold text-gray-200">03</div>
              <h3 className="font-semibold text-lg">Escrow released on approval</h3>
              <p className="text-sm text-gray-500">
                When the client approves the work, escrow is released instantly to the freelancer. Disputes are resolved by our admin team.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-8 py-20">
        <div className="max-w-4xl mx-auto space-y-12">

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Built for trust</h2>
            <p className="text-gray-500">Everything you need. Nothing you don't.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {[
              {
                title: "Escrow protection",
                description: "Funds are locked in escrow before work begins. Neither party can access them until the job is complete.",
              },
              {
                title: "Dispute resolution",
                description: "If something goes wrong, our admin team reviews the case and decides where the funds go.",
              },
              {
                title: "Full transaction history",
                description: "Every deposit, escrow funding and payment release is logged and visible to both parties.",
              },
              {
                title: "Role-based access",
                description: "Post jobs as a client or take on work as a freelancer — all from a single account.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="border rounded p-6 space-y-2 hover:shadow transition-shadow"
              >
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-black text-white px-8 py-20">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to work with confidence?</h2>
          <p className="text-gray-400">
            Join TrustWork today. Free to sign up, no credit card required.
          </p>
          <button
            onClick={() => router.push("/register")}
            className="bg-white text-black px-8 py-3 rounded text-sm font-medium hover:bg-gray-100"
          >
            Create your account
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t px-8 py-6 flex items-center justify-between text-xs text-gray-400">
        <span>© {new Date().getFullYear()} TrustWork. All rights reserved.</span>
        <span>Secure escrow payments for freelancers.</span>
      </footer>

    </div>
  );
}