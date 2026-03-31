"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const STATS = [
  { value: "100%", label: "of vibe-coded apps have OWASP vulnerabilities", source: "Columbia University" },
  { value: "19%", label: "slower â AI tools actually slow experienced devs", source: "METR Study (RCT)" },
  { value: "91%", label: "longer PR review times with AI adoption", source: "Faros AI, 10K devs" },
  { value: "0", label: "existing platforms that gate code quality before shipping", source: "Market Gap" },
];

const PIPELINE_STEPS = [
  {
    icon: "ð¯", title: "Spec Engine", desc: "Force structured requirements before AI writes a single line. No more 'build me an app' prompts.",
    color: "#6366f1", detail: "9-step wizard: project type, tech stack, data models, auth, API endpoints, security requirements, edge cases, deployment config.",
  },
  {
    icon: "â¡", title: "Generate", desc: "Use any AI model â Claude, GPT, Gemini, Cursor, local models. We're the orchestrator, not the generator.",
    color: "#8b5cf6", detail: "Your spec becomes a JSON contract. Paste it into any AI. The model doesn't guess â it follows your spec.",
  },
  {
    icon: "ð¡ï¸", title: "Security Scan", desc: "25+ OWASP-aligned rules catch what every other platform misses. Hardcoded secrets, SQL injection, XSS, SSRF.",
    color: "#ef4444", detail: "Every finding: exact line number, severity, explanation, and a concrete fix. Zero CRITICAL vulns or it doesn't ship.",
  },
  {
    icon: "ð", title: "Code Review", desc: "Senior-developer-level automated review. Logic errors, code smell, tech debt, N+1 queries, anti-patterns.",
    color: "#ec4899", detail: "30+ rules across 7 categories. Code metrics dashboard. The 91% review bottleneck â eliminated.",
  },
  {
    icon: "ð", title: "Ship Gate", desc: "Overall score. Pre-ship checklist. Either 'CLEARED FOR DEPLOYMENT' or 'DO NOT SHIP'. No middle ground.",
    color: "#22c55e", detail: "Weighted score: 50% security, 30% code quality, 20% spec completeness. Your code earns the right to deploy.",
  },
];

const COMPETITORS = [
  { name: "Cursor", spec: false, secScan: false, codeReview: false, shipGate: false, price: "$20/mo" },
  { name: "Bolt", spec: false, secScan: false, codeReview: false, shipGate: false, price: "$20/mo" },
  { name: "Lovable", spec: false, secScan: "Partial", codeReview: false, shipGate: false, price: "$20/mo" },
  { name: "Replit", spec: false, secScan: false, codeReview: false, shipGate: false, price: "$25/mo" },
  { name: "v0", spec: false, secScan: false, codeReview: false, shipGate: false, price: "$20/mo" },
  { name: "GodMode", spec: true, secScan: true, codeReview: true, shipGate: true, price: "Free" },
];

function AnimatedCounter({ target, suffix = "" }: { target: string; suffix?: string }) {
  const [display, setDisplay] = useState(target);
  return <span>{display}{suffix}</span>;
}

export default function LandingPage() {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Nav */}
      <nav className="border-b border-[#1e293b] px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-pink-500 to-red-500 flex items-center justify-center text-sm">â¡</div>
            <span className="text-lg font-extrabold bg-gradient-to-r from-indigo-400 via-pink-400 to-red-400 bg-clip-text text-transparent">GodMode</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition">Dashboard</Link>
            <Link href="/auth" className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition">
              Get Started â Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-semibold mb-6 tracking-wide">
            100% of vibe-coded apps have security vulnerabilities â Columbia University
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI-Generated Code
            </span>
            <br />
            <span className="text-white">That Actually Ships.</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Every other AI coding tool generates fast, broken code. GodMode is the first platform
            with a built-in quality pipeline: Spec â Generate â Security Scan â Code Review â Ship Gate.
            Your code earns the right to deploy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard" className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base transition shadow-lg shadow-indigo-500/25">
              Launch Dashboard â
            </Link>
            <Link href="/scanner" className="px-8 py-3.5 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold text-base transition">
              Try Security Scanner
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-12 border-t border-b border-[#1e293b]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-extrabold text-white mb-1">{stat.value}</div>
              <div className="text-xs text-slate-400 leading-relaxed mb-1">{stat.label}</div>
              <div className="text-[10px] text-slate-600">{stat.source}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-3 text-white">The 5-Stage Pipeline</h2>
          <p className="text-center text-slate-400 mb-12 text-sm">Every stage must pass. No shortcuts. No excuses.</p>
          <div className="space-y-3">
            {PIPELINE_STEPS.map((step, i) => (
              <button
                key={i}
                onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                className="w-full text-left"
              >
                <div
                  className="rounded-xl border p-5 transition-all"
                  style={{
                    borderColor: expandedStep === i ? step.color + "60" : "#1e293b",
                    background: expandedStep === i ? step.color + "08" : "#0f172a",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                      style={{ background: step.color + "20", border: `2px solid ${step.color}40` }}
                    >
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500">STAGE {i + 1}</span>
                        <h3 className="text-base font-bold text-white">{step.title}</h3>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{step.desc}</p>
                    </div>
                    <span className="text-slate-500 text-lg">{expandedStep === i ? "â" : "+"}</span>
                  </div>
                  {expandedStep === i && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: step.color + "20" }}>
                      <p className="text-sm leading-relaxed" style={{ color: step.color }}>{step.detail}</p>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-6 py-20 border-t border-[#1e293b]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-3 text-white">vs. Every Other Tool</h2>
          <p className="text-center text-slate-400 mb-10 text-sm">They generate code. We ensure it works.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e293b]">
                  <th className="text-left py-3 px-4 text-slate-500 font-semibold">Platform</th>
                  <th className="text-center py-3 px-4 text-slate-500 font-semibold">Spec Engine</th>
                  <th className="text-center py-3 px-4 text-slate-500 font-semibold">Security Scan</th>
                  <th className="text-center py-3 px-4 text-slate-500 font-semibold">Code Review</th>
                  <th className="text-center py-3 px-4 text-slate-500 font-semibold">Ship Gate</th>
                  <th className="text-center py-3 px-4 text-slate-500 font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c, i) => (
                  <tr
                    key={c.name}
                    className={`border-b border-[#1e293b] ${c.name === "GodMode" ? "bg-indigo-500/5" : ""}`}
                  >
                    <td className={`py-3 px-4 font-semibold ${c.name === "GodMode" ? "text-indigo-400" : "text-slate-300"}`}>
                      {c.name === "GodMode" ? "â¡ " : ""}{c.name}
                    </td>
                    {[c.spec, c.secScan, c.codeReview, c.shipGate].map((val, j) => (
                      <td key={j} className="text-center py-3 px-4">
                        {val === true ? <span className="text-green-400">â</span> :
                         val === "Partial" ? <span className="text-yellow-400">â ï¸</span> :
                         <span className="text-red-400">â</span>}
                      </td>
                    ))}
                    <td className={`text-center py-3 px-4 font-semibold ${c.name === "GodMode" ? "text-green-400" : "text-slate-400"}`}>
                      {c.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 border-t border-[#1e293b]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">Stop Shipping Broken Code.</h2>
          <p className="text-slate-400 mb-8">Every other AI tool promises speed. GodMode promises code that works.</p>
          <Link href="/dashboard" className="inline-block px-10 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg transition shadow-lg shadow-indigo-500/25">
            Start Building â It&apos;s Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e293b] px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">â¡</span>
            <span className="text-sm font-bold text-slate-500">GodMode v1.0</span>
          </div>
          <div className="flex gap-6 text-xs text-slate-600">
            <Link href="/dashboard" className="hover:text-slate-400 transition">Dashboard</Link>
            <Link href="/scanner" className="hover:text-slate-400 transition">Scanner</Link>
            <Link href="/reviewer" className="hover:text-slate-400 transition">Reviewer</Link>
            <Link href="/spec" className="hover:text-slate-400 transition">Spec Engine</Link>
          </div>
          <div className="text-xs text-slate-700">Built with $0. Powered by research, not hype.</div>
        </div>
      </footer>
    </div>
  );
}
