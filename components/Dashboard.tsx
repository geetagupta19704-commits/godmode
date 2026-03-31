import { useState, useCallback, useMemo } from "react";

// ============================================================
// GODMODE DASHBOARD v1.0
// The unified command center. Spec → Generate → Scan → Review → Ship.
// One pipeline. Zero excuses. Production-ready or don't ship.
// ============================================================

// ==================== PIPELINE STAGES ====================
const PIPELINE = [
  { id: "spec", label: "Spec", icon: "🎯", color: "#6366f1", desc: "Define requirements" },
  { id: "generate", label: "Generate", icon: "⚡", color: "#8b5cf6", desc: "AI writes code" },
  { id: "security", label: "Security", icon: "🛡️", color: "#ef4444", desc: "OWASP scan" },
  { id: "review", label: "Review", icon: "🔍", color: "#ec4899", desc: "Code quality" },
  { id: "ship", label: "Ship", icon: "🚀", color: "#22c55e", desc: "Deploy" },
];

// ==================== SECURITY RULES ====================
const SEC_RULES = [
  { id: "hc-key", p: /(["'`])(sk[-_]|pk[-_]|api[-_]?key|apikey)\w{8,}/gi, sev: "CRIT", t: "Hardcoded API Key", f: "Use process.env.API_KEY" },
  { id: "hc-pwd", p: /(password|passwd|secret|token)\s*[:=]\s*["'`][^"'`]{4,}["'`]/gi, sev: "CRIT", t: "Hardcoded Password/Secret", f: "Use environment variables or secret manager" },
  { id: "jwt-hc", p: /jwt\.sign\s*\([^)]*,\s*["'`][^"'`]{4,}["'`]/gi, sev: "CRIT", t: "JWT Secret Hardcoded", f: "Use process.env.JWT_SECRET" },
  { id: "sqli-tpl", p: /(query|execute|raw)\s*\(\s*(`[^`]*\$\{|["'][^"']*["']\s*\+)/gi, sev: "CRIT", t: "SQL Injection Risk", f: "Use parameterized queries" },
  { id: "sqli-cat", p: /["']SELECT\s+.*FROM\s+.*["']\s*\+/gi, sev: "CRIT", t: "SQL String Concatenation", f: "Use ORM or parameterized queries" },
  { id: "xss-inner", p: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html/g, sev: "CRIT", t: "dangerouslySetInnerHTML (XSS)", f: "Use DOMPurify.sanitize()" },
  { id: "eval", p: /\beval\s*\(/g, sev: "CRIT", t: "eval() — Code Injection", f: "Use JSON.parse or safer alternatives" },
  { id: "doc-write", p: /document\.write\s*\(/g, sev: "CRIT", t: "document.write() (XSS)", f: "Use DOM methods or React JSX" },
  { id: "innerHTML", p: /\.innerHTML\s*=\s*[^"'`\s]/g, sev: "HIGH", t: "Direct innerHTML Assignment", f: "Use textContent or DOMPurify" },
  { id: "cors-wild", p: /cors\s*\(\s*\)|['"]\*['"]\s*.*(?:origin|Access-Control)/gi, sev: "HIGH", t: "CORS Wildcard (*)", f: "Specify exact allowed origins" },
  { id: "md5", p: /createHash\s*\(\s*["'`]md5["'`]\)/g, sev: "HIGH", t: "MD5 Hash (Broken)", f: "Use bcrypt/argon2 for passwords, SHA-256 for hashing" },
  { id: "console-sens", p: /console\.(log|debug)\s*\([^)]*(?:password|token|secret|key|auth)/gi, sev: "HIGH", t: "Sensitive Data Logged", f: "Remove logging of sensitive data" },
  { id: "ssrf", p: /fetch\s*\(\s*(?:req|user|input|body|query)\b/gi, sev: "HIGH", t: "SSRF Risk — User URL in Fetch", f: "Validate/whitelist URLs, block private IPs" },
  { id: "http-url", p: /["'`]http:\/\/(?!localhost|127\.0\.0\.1)/g, sev: "MED", t: "HTTP (Not HTTPS)", f: "Always use HTTPS" },
  { id: "sel-star", p: /SELECT\s+\*\s+FROM/gi, sev: "MED", t: "SELECT * Over-Exposure", f: "Select only needed columns" },
  { id: "debug-on", p: /(?:debug|DEBUG)\s*[:=]\s*true/g, sev: "MED", t: "Debug Mode Enabled", f: "Disable in production" },
  { id: "no-rate", p: /app\.(post|put)\s*\(\s*["'`]\/(?:api\/)?(?:login|auth|register)/gi, sev: "MED", t: "Auth Without Rate Limiting", f: "Add express-rate-limit" },
  { id: "stack-exp", p: /res\.(json|send)\s*\([^)]*(?:stack|trace|error\.message)/gi, sev: "MED", t: "Stack Trace Exposed", f: "Return generic error messages" },
];

// ==================== CODE REVIEW RULES ====================
const REV_RULES = [
  { id: "loose-eq", p: /[^=!]==[^=]/g, cat: "LOGIC", imp: "MED", t: "Loose Equality (==)", s: "Use === for strict comparison" },
  { id: "assign-if", p: /if\s*\(\s*\w+\s*=[^=]/g, cat: "LOGIC", imp: "HIGH", t: "Assignment in Condition", s: "Use === for comparison" },
  { id: "empty-catch", p: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g, cat: "LOGIC", imp: "HIGH", t: "Empty Catch Block", s: "Log or handle the error" },
  { id: "no-catch", p: /\.then\s*\([^)]*\)(?!\s*\.catch)/g, cat: "LOGIC", imp: "HIGH", t: "Promise Without .catch()", s: "Add .catch() or use async/await with try/catch" },
  { id: "var-use", p: /\bvar\s+\w/g, cat: "PATTERN", imp: "MED", t: "`var` Used", s: "Use const/let instead" },
  { id: "todo", p: /\/\/\s*(?:TODO|FIXME|HACK|XXX)\b/gi, cat: "DEBT", imp: "MED", t: "TODO/FIXME Left", s: "Resolve before shipping" },
  { id: "dead-code", p: /\/\/\s*(?:const|let|var|function|if|return)\s+\w/g, cat: "DEBT", imp: "LOW", t: "Commented-Out Code", s: "Delete dead code, use git history" },
  { id: "ts-ignore", p: /@ts-ignore|@ts-nocheck/g, cat: "DEBT", imp: "HIGH", t: "@ts-ignore Used", s: "Fix the type error properly" },
  { id: "any-type", p: /:\s*any\b/g, cat: "DEBT", imp: "MED", t: "TypeScript `any`", s: "Use proper types or `unknown`" },
  { id: "n-plus-1", p: /(?:for|forEach|map)\s*\([^)]*\)\s*\{[^}]*(?:await\s+)?(?:fetch|query|findOne|get)\s*\(/g, cat: "PERF", imp: "HIGH", t: "N+1 Query in Loop", s: "Batch with WHERE IN or DataLoader" },
  { id: "sync-fs", p: /(?:readFileSync|writeFileSync|existsSync|mkdirSync)/g, cat: "PERF", imp: "HIGH", t: "Sync File Operation", s: "Use fs.promises async methods" },
  { id: "no-limit", p: /find\(\s*\{?\s*\}?\s*\)|SELECT\s+\*?\s+FROM\s+\w+(?!\s+LIMIT)/gi, cat: "PERF", imp: "HIGH", t: "No Pagination/Limit", s: "Add .limit() or LIMIT clause" },
  { id: "console-log", p: /console\.(log|debug|info)\s*\(/g, cat: "PATTERN", imp: "LOW", t: "console.log Left In", s: "Remove or use proper logging library" },
  { id: "5-params", p: /function\s+\w+\s*\(\s*\w+\s*,\s*\w+\s*,\s*\w+\s*,\s*\w+\s*,\s*\w+/g, cat: "SMELL", imp: "MED", t: "5+ Function Parameters", s: "Use options object pattern" },
  { id: "state-mut", p: /this\.state\.\w+\s*=/g, cat: "PATTERN", imp: "HIGH", t: "Direct State Mutation", s: "Use setState with new object" },
  { id: "hc-url", p: /(?:fetch|axios)\s*\(\s*["'`]https?:\/\/(?!localhost)/g, cat: "MAINT", imp: "MED", t: "Hardcoded URL", s: "Use environment variables" },
];

function runSecurityScan(code: any) {
  const findings = [];
  const lines = code.split("\n");
  for (const rule of SEC_RULES) {
    const regex = new RegExp(rule.p.source, rule.p.flags);
    let match;
    const seen = new Set();
    while ((match = regex.exec(code)) !== null) {
      const ln = code.substring(0, match.index).split("\n").length;
      if (seen.has(ln)) continue;
      seen.add(ln);
      findings.push({ ...rule, line: ln, lineContent: lines[ln - 1]?.trim() || "" });
      if (seen.size >= 3) break;
    }
  }
  return findings;
}

function runCodeReview(code: any) {
  const findings = [];
  const lines = code.split("\n");
  for (const rule of REV_RULES) {
    const regex = new RegExp(rule.p.source, rule.p.flags);
    let match;
    const seen = new Set();
    while ((match = regex.exec(code)) !== null) {
      const ln = code.substring(0, match.index).split("\n").length;
      const lc = lines[ln - 1]?.trim() || "";
      if (seen.has(ln) || lc.startsWith("//") || lc.startsWith("*")) continue;
      seen.add(ln);
      findings.push({ ...rule, line: ln, lineContent: lc });
      if (seen.size >= 4) break;
    }
  }
  return findings;
}

function getCodeMetrics(code: any) {
  const lines = code.split("\n");
  const total = lines.length;
  const codeLines = lines.filter((l: string) => l.trim() && !l.trim().startsWith("//")).length;
  const comments = lines.filter((l: string) => l.trim().startsWith("//") || l.trim().startsWith("*")).length;
  const fns = (code.match(/(?:function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function))/g) || []).length;
  return { total, codeLines, comments, fns, commentPct: total > 0 ? Math.round((comments / total) * 100) : 0 };
}

// ==================== SPEC ENGINE (MINI) ====================
const PROJECT_TYPES = ["Web App", "REST API", "SaaS", "E-Commerce", "Dashboard", "Mobile App", "CLI Tool", "Chat App"];
const TECH = {
  frontend: ["React", "Next.js", "Vue", "Svelte", "Angular"],
  backend: ["Node/Express", "Python/FastAPI", "Go/Gin", "Ruby on Rails", "Django"],
  database: ["PostgreSQL", "MongoDB", "MySQL", "Supabase", "SQLite"],
};
const AUTH_OPTS = ["Email/Password", "OAuth Google", "OAuth GitHub", "Magic Link", "JWT", "API Key", "None"];
const SEC_CHECKS = ["CSRF", "XSS Prevention", "SQL Injection", "Rate Limiting", "CORS Config", "Security Headers", "Encryption", "RBAC", "Secret Management", "Audit Logging"];

const Badge = ({ children, selected, color = "#6366f1", onClick }: any) => (
  <button onClick={onClick} style={{
    padding: "5px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 500, cursor: "pointer",
    border: selected ? `2px solid ${color}` : "1px solid #334155",
    background: selected ? color + "15" : "transparent",
    color: selected ? color : "#94a3b8", transition: "all 0.15s",
  }}>{children}</button>
);

// ==================== MAIN COMPONENT ====================
export default function GodModeDashboard() {
  const [activeStage, setActiveStage] = useState("spec");
  const [specComplete, setSpecComplete] = useState(false);
  const [code, setCode] = useState("");
  const [hasScanned, setHasScanned] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  // Spec state
  const [spec, setSpec] = useState({
    name: "", type: "", desc: "", frontend: "", backend: "", database: "",
    auth: [] as string[], security: ["CSRF", "XSS Prevention", "SQL Injection", "Rate Limiting", "Secret Management"],
    edgeCases: "", errorHandling: "",
  });

  const update = useCallback((k: any, v: any) => setSpec(p => ({ ...p, [k]: v })), []);
  const toggleArr = useCallback((k: any, v: any) => setSpec(p => ({
    ...p, [k]: (p as any)[k].includes(v) ? (p as any)[k].filter((x: any) => x !== v) : [...(p as any)[k], v],
  })), []);

  const specScore = useMemo(() => {
    let s = 0, t = 0;
    const c = (v: any, w = 1) => { t += w; if (v && (typeof v === "string" ? v.trim() : v.length)) s += w; };
    c(spec.name); c(spec.type); c(spec.desc); c(spec.frontend); c(spec.backend); c(spec.database);
    c(spec.auth); c(spec.security, 2); c(spec.edgeCases); c(spec.errorHandling);
    return Math.round((s / t) * 100);
  }, [spec]);

  const specJSON = useMemo(() => JSON.stringify({
    _meta: { generator: "GodMode v1.0", created: new Date().toISOString(), specScore: specScore + "%" },
    project: { name: spec.name, type: spec.type, description: spec.desc },
    stack: { frontend: spec.frontend, backend: spec.backend, database: spec.database },
    auth: spec.auth, security: spec.security,
    resilience: { edgeCases: spec.edgeCases, errorHandling: spec.errorHandling },
  }, null, 2), [spec, specScore]);

  // Scan results
  const secFindings = useMemo(() => hasScanned ? runSecurityScan(code) : [], [code, hasScanned]);
  const revFindings = useMemo(() => hasReviewed ? runCodeReview(code) : [], [code, hasReviewed]);
  const metrics = useMemo(() => (hasReviewed || hasScanned) ? getCodeMetrics(code) : null, [code, hasScanned, hasReviewed]);

  const secScore = useMemo(() => {
    let s = 100;
    secFindings.forEach(f => { if (f.sev === "CRIT") s -= 25; else if (f.sev === "HIGH") s -= 15; else s -= 8; });
    return Math.max(0, s);
  }, [secFindings]);

  const revScore = useMemo(() => {
    let s = 100;
    revFindings.forEach(f => { if (f.imp === "HIGH") s -= 12; else if (f.imp === "MED") s -= 6; else s -= 2; });
    return Math.max(0, Math.min(100, s));
  }, [revFindings]);

  const overallScore = useMemo(() => {
    if (!hasScanned && !hasReviewed) return null;
    return Math.round((secScore * 0.5 + revScore * 0.3 + specScore * 0.2));
  }, [secScore, revScore, specScore, hasScanned, hasReviewed]);

  const overallGrade = useMemo(() => {
    if (overallScore === null) return null;
    if (overallScore >= 90) return { g: "A", c: "#22c55e", l: "Ship It" };
    if (overallScore >= 75) return { g: "B", c: "#84cc16", l: "Almost Ready" };
    if (overallScore >= 60) return { g: "C", c: "#f59e0b", l: "Needs Work" };
    if (overallScore >= 40) return { g: "D", c: "#f97316", l: "Significant Issues" };
    return { g: "F", c: "#ef4444", l: "DO NOT SHIP" };
  }, [overallScore]);

  const [copied, setCopied] = useState(false);
  const copySpec = useCallback(() => {
    navigator.clipboard.writeText(specJSON).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [specJSON]);

  const sevColor = { CRIT: "#ef4444", HIGH: "#f97316", MED: "#f59e0b", LOW: "#3b82f6" };
  const catColor = { LOGIC: "#ef4444", PATTERN: "#ec4899", DEBT: "#f59e0b", PERF: "#a855f7", SMELL: "#f97316", MAINT: "#14b8a6" };
  const catIcon = { LOGIC: "🧠", PATTERN: "🚫", DEBT: "💳", PERF: "⚡", SMELL: "👃", MAINT: "🔧" };

  const canShip = overallScore !== null && overallScore >= 75 && secFindings.filter(f => f.sev === "CRIT").length === 0;

  // ==================== RENDER ====================
  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#e2e8f0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #6366f1, #ec4899, #ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>⚡</div>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, background: "linear-gradient(135deg, #818cf8, #f472b6, #f87171)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GodMode</h1>
              <p style={{ fontSize: "11px", color: "#475569", margin: 0 }}>Spec → Generate → Scan → Review → Ship</p>
            </div>
          </div>
          {overallGrade && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Overall</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: overallGrade.c }}>{overallGrade.l}</div>
              </div>
              <div style={{
                width: "48px", height: "48px", borderRadius: "50%", border: `3px solid ${overallGrade.c}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "20px", fontWeight: 800, color: overallGrade.c,
              }}>{overallGrade.g}</div>
            </div>
          )}
        </div>

        {/* Pipeline Nav */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", background: "#0f172a", borderRadius: "12px", padding: "10px 12px", border: "1px solid #1e293b" }}>
          {PIPELINE.map((stage, i) => {
            const isActive = activeStage === stage.id;
            const isDone = (stage.id === "spec" && specComplete) ||
              (stage.id === "security" && hasScanned) ||
              (stage.id === "review" && hasReviewed) ||
              (stage.id === "ship" && canShip);
            return (
              <div key={stage.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <button onClick={() => setActiveStage(stage.id)} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                  background: "none", border: "none", cursor: "pointer", flex: 1, padding: "6px",
                  borderRadius: "8px", transition: "all 0.15s",
                  outline: isActive ? `2px solid ${stage.color}` : "none",
                }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: "16px",
                    background: isDone ? "#22c55e20" : isActive ? stage.color + "20" : "#1e293b",
                    border: isDone ? "2px solid #22c55e" : isActive ? `2px solid ${stage.color}` : "1px solid #334155",
                  }}>{isDone ? "✅" : stage.icon}</div>
                  <span style={{ fontSize: "10px", fontWeight: isActive ? 700 : 500, color: isActive ? stage.color : isDone ? "#4ade80" : "#475569" }}>{stage.label}</span>
                </button>
                {i < PIPELINE.length - 1 && (
                  <div style={{ width: "20px", height: "2px", background: isDone ? "#22c55e" : "#1e293b", margin: "0 2px", marginBottom: "14px" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ==================== SPEC STAGE ==================== */}
        {activeStage === "spec" && (
          <div style={{ background: "#0f172a80", borderRadius: "12px", border: "1px solid #1e293b", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>🎯 Project Spec</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "80px", height: "6px", borderRadius: "3px", background: "#1e293b", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: specScore + "%", background: specScore > 70 ? "#22c55e" : specScore > 40 ? "#f59e0b" : "#ef4444", borderRadius: "3px", transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: specScore > 70 ? "#4ade80" : specScore > 40 ? "#fbbf24" : "#f87171" }}>{specScore}%</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>Project Name</label>
                <input value={spec.name} onChange={e => update("name", e.target.value)} placeholder="e.g., TaskFlow"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #334155", background: "#020617", color: "#e2e8f0", fontSize: "13px", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>Description</label>
                <input value={spec.desc} onChange={e => update("desc", e.target.value)} placeholder="What does it do?"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #334155", background: "#020617", color: "#e2e8f0", fontSize: "13px", outline: "none" }} />
              </div>
            </div>

            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Project Type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
              {PROJECT_TYPES.map(t => <Badge key={t} selected={spec.type === t} color="#6366f1" onClick={() => update("type", t)}>{t}</Badge>)}
            </div>

            {Object.entries(TECH).map(([cat, opts]) => (
              <div key={cat} style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>{cat}</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {opts.map((o: any) => <Badge key={o} selected={(spec as any)[cat] === o} color="#22c55e" onClick={() => update(cat, o)}>{o}</Badge>)}
                </div>
              </div>
            ))}

            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Authentication</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
              {AUTH_OPTS.map((a: any) => <Badge key={a} selected={spec.auth.includes(a)} color="#8b5cf6" onClick={() => toggleArr("auth", a)}>{a}</Badge>)}
            </div>

            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Security Requirements</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
              {SEC_CHECKS.map(s => <Badge key={s} selected={spec.security.includes(s)} color="#ef4444" onClick={() => toggleArr("security", s)}>{s}</Badge>)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>Edge Cases</label>
                <textarea value={spec.edgeCases} onChange={e => update("edgeCases", e.target.value)} placeholder="What could go wrong?"
                  rows={3} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #334155", background: "#020617", color: "#e2e8f0", fontSize: "13px", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>Error Handling</label>
                <textarea value={spec.errorHandling} onChange={e => update("errorHandling", e.target.value)} placeholder="How should errors be handled?"
                  rows={3} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #334155", background: "#020617", color: "#e2e8f0", fontSize: "13px", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>

            <button onClick={() => { setSpecComplete(true); setActiveStage("generate"); }} style={{
              width: "100%", padding: "12px", borderRadius: "10px", border: "none",
              background: specScore >= 50 ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#334155",
              color: "white", fontSize: "14px", fontWeight: 700, cursor: specScore >= 50 ? "pointer" : "default",
            }}>
              {specScore >= 50 ? "Lock Spec & Continue to Generate →" : `Spec ${specScore}% complete — fill more fields`}
            </button>
          </div>
        )}

        {/* ==================== GENERATE STAGE ==================== */}
        {activeStage === "generate" && (
          <div style={{ background: "#0f172a80", borderRadius: "12px", border: "1px solid #1e293b", padding: "20px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px 0" }}>⚡ Generate Code</h2>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>Copy your spec JSON below and paste it into any AI tool (Claude, ChatGPT, Cursor, etc). Then paste the generated code back here for scanning.</p>

            <div style={{ position: "relative", marginBottom: "16px" }}>
              <button onClick={copySpec} style={{
                position: "absolute", top: "8px", right: "8px", padding: "5px 12px", borderRadius: "6px",
                background: copied ? "#22c55e" : "#6366f1", color: "white", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 600, zIndex: 1,
              }}>{copied ? "Copied!" : "Copy Spec JSON"}</button>
              <pre style={{
                background: "#020617", border: "1px solid #1e293b", borderRadius: "10px", padding: "14px",
                color: "#94a3b8", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace",
                overflow: "auto", maxHeight: "200px", margin: 0, lineHeight: 1.4,
              }}>{specJSON}</pre>
            </div>

            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Paste AI-Generated Code Here</label>
            <textarea value={code} onChange={e => { setCode(e.target.value); setHasScanned(false); setHasReviewed(false); }}
              placeholder="Paste the code that AI generated from your spec..."
              rows={12} style={{
                width: "100%", padding: "14px", borderRadius: "10px", border: "1px solid #1e293b",
                background: "#020617", color: "#e2e8f0", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace",
                resize: "vertical", outline: "none", lineHeight: 1.6, marginBottom: "12px",
              }} />

            <button onClick={() => { if (code.trim()) { setHasScanned(true); setActiveStage("security"); } }} disabled={!code.trim()} style={{
              width: "100%", padding: "12px", borderRadius: "10px", border: "none",
              background: code.trim() ? "linear-gradient(135deg, #8b5cf6, #ec4899)" : "#334155",
              color: "white", fontSize: "14px", fontWeight: 700, cursor: code.trim() ? "pointer" : "default",
            }}>
              Run Security Scan →
            </button>
          </div>
        )}

        {/* ==================== SECURITY STAGE ==================== */}
        {activeStage === "security" && (
          <div style={{ background: "#0f172a80", borderRadius: "12px", border: "1px solid #1e293b", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>🛡️ Security Scan</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Security Score:</span>
                <span style={{ fontSize: "18px", fontWeight: 800, color: secScore >= 75 ? "#22c55e" : secScore >= 50 ? "#f59e0b" : "#ef4444" }}>{secScore}/100</span>
              </div>
            </div>

            {secFindings.length === 0 ? (
              <div style={{ background: "#22c55e10", borderRadius: "10px", border: "1px solid #22c55e30", padding: "24px", textAlign: "center", marginBottom: "16px" }}>
                <div style={{ fontSize: "32px", marginBottom: "4px" }}>✅</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#4ade80" }}>No Security Vulnerabilities Detected</div>
              </div>
            ) : (
              <div style={{ marginBottom: "16px" }}>
                {/* Severity Summary */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  {["CRIT", "HIGH", "MED"].map((sev: any) => {
                    const count = secFindings.filter((f: any) => f.sev === sev).length;
                    return count > 0 ? (
                      <div key={sev} style={{ padding: "6px 14px", borderRadius: "8px", background: sevColor[sev as keyof typeof sevColor] + "15", border: `1px solid ${sevColor[sev as keyof typeof sevColor]}30` }}>
                        <span style={{ fontSize: "16px", fontWeight: 800, color: sevColor[sev as keyof typeof sevColor] }}>{count}</span>
                        <span style={{ fontSize: "11px", color: sevColor[sev as keyof typeof sevColor], marginLeft: "6px", fontWeight: 600 }}>{sev === "CRIT" ? "Critical" : sev === "HIGH" ? "High" : "Medium"}</span>
                      </div>
                    ) : null;
                  })}
                </div>

                {secFindings.map((f: any, i: any) => (
                  <div key={`${f.id}-${f.line}-${i}`} style={{
                    background: "#020617", borderRadius: "8px", borderLeft: `3px solid ${sevColor[f.sev as keyof typeof sevColor]}`,
                    padding: "12px 14px", marginBottom: "6px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, background: sevColor[f.sev as keyof typeof sevColor] + "20", color: sevColor[f.sev as keyof typeof sevColor] }}>{f.sev}</span>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>{f.t}</span>
                      </div>
                      <span style={{ fontSize: "11px", color: "#475569" }}>Ln {f.line}</span>
                    </div>
                    <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#f87171", background: "#0f172a", padding: "4px 8px", borderRadius: "4px", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.lineContent}
                    </div>
                    <div style={{ fontSize: "11px", color: "#4ade80" }}>Fix: {f.f}</div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => { setHasReviewed(true); setActiveStage("review"); }} style={{
              width: "100%", padding: "12px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
              color: "white", fontSize: "14px", fontWeight: 700, cursor: "pointer",
            }}>
              Run Code Review →
            </button>
          </div>
        )}

        {/* ==================== REVIEW STAGE ==================== */}
        {activeStage === "review" && (
          <div style={{ background: "#0f172a80", borderRadius: "12px", border: "1px solid #1e293b", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>🔍 Code Review</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Quality Score:</span>
                <span style={{ fontSize: "18px", fontWeight: 800, color: revScore >= 75 ? "#22c55e" : revScore >= 50 ? "#f59e0b" : "#ef4444" }}>{revScore}/100</span>
              </div>
            </div>

            {/* Metrics Row */}
            {metrics && (
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                {[
                  { l: "Lines", v: metrics.total, c: "#e2e8f0" },
                  { l: "Code", v: metrics.codeLines, c: "#4ade80" },
                  { l: "Comments", v: metrics.comments, c: "#fbbf24" },
                  { l: "Functions", v: metrics.fns, c: "#818cf8" },
                  { l: "Comment %", v: metrics.commentPct + "%", c: metrics.commentPct < 5 ? "#f87171" : "#4ade80" },
                ].map(m => (
                  <div key={m.l} style={{ background: "#020617", borderRadius: "8px", padding: "8px 14px", border: "1px solid #1e293b", textAlign: "center", minWidth: "70px" }}>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: m.c }}>{m.v}</div>
                    <div style={{ fontSize: "10px", color: "#475569" }}>{m.l}</div>
                  </div>
                ))}
              </div>
            )}

            {revFindings.length === 0 ? (
              <div style={{ background: "#22c55e10", borderRadius: "10px", border: "1px solid #22c55e30", padding: "24px", textAlign: "center", marginBottom: "16px" }}>
                <div style={{ fontSize: "32px", marginBottom: "4px" }}>✅</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#4ade80" }}>Clean Code — No Issues Found</div>
              </div>
            ) : (
              <div style={{ marginBottom: "16px" }}>
                {/* Category chips */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
                  {Object.entries(catColor).map(([cat, color]: any) => {
                    const count = revFindings.filter((f: any) => f.cat === cat).length;
                    return count > 0 ? (
                      <span key={cat} style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: color + "15", color, border: `1px solid ${color}30` }}>
                        {catIcon[cat as keyof typeof catIcon]} {cat} ({count})
                      </span>
                    ) : null;
                  })}
                </div>

                {revFindings.map((f: any, i: any) => (
                  <div key={`${f.id}-${f.line}-${i}`} style={{
                    background: "#020617", borderRadius: "8px", borderLeft: `3px solid ${catColor[f.cat as keyof typeof catColor]}`,
                    padding: "12px 14px", marginBottom: "6px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, background: catColor[f.cat as keyof typeof catColor] + "20", color: catColor[f.cat as keyof typeof catColor] }}>
                          {catIcon[f.cat as keyof typeof catIcon]} {f.cat}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>{f.t}</span>
                      </div>
                      <span style={{ fontSize: "11px", color: "#475569" }}>Ln {f.line}</span>
                    </div>
                    <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#fbbf24", background: "#0f172a", padding: "4px 8px", borderRadius: "4px", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.lineContent}
                    </div>
                    <div style={{ fontSize: "11px", color: "#c4b5fd" }}>Suggestion: {f.s}</div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setActiveStage("ship")} style={{
              width: "100%", padding: "12px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "white", fontSize: "14px", fontWeight: 700, cursor: "pointer",
            }}>
              View Ship Readiness →
            </button>
          </div>
        )}

        {/* ==================== SHIP STAGE ==================== */}
        {activeStage === "ship" && (
          <div style={{ background: "#0f172a80", borderRadius: "12px", border: "1px solid #1e293b", padding: "20px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px 0" }}>🚀 Ship Readiness Report</h2>

            {overallScore !== null ? (
              <>
                {/* Big Score */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      width: "100px", height: "100px", borderRadius: "50%", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: "42px", fontWeight: 800,
                      border: `4px solid ${overallGrade!.c}`, color: overallGrade!.c, margin: "0 auto 8px",
                    }}>{overallGrade!.g}</div>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: overallGrade!.c }}>{overallScore}/100</div>
                    <div style={{ fontSize: "14px", color: overallGrade!.c, fontWeight: 600 }}>{overallGrade!.l}</div>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                  {[
                    { label: "Spec Quality", score: specScore, weight: "20%", color: "#6366f1" },
                    { label: "Security", score: secScore, weight: "50%", color: "#ef4444" },
                    { label: "Code Quality", score: revScore, weight: "30%", color: "#ec4899" },
                  ].map(item => (
                    <div key={item.label} style={{ background: "#020617", borderRadius: "10px", padding: "14px", border: "1px solid #1e293b", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>{item.label} ({item.weight})</div>
                      <div style={{ fontSize: "24px", fontWeight: 800, color: item.score >= 75 ? "#22c55e" : item.score >= 50 ? "#f59e0b" : "#ef4444" }}>{item.score}</div>
                      <div style={{ height: "4px", borderRadius: "2px", background: "#1e293b", marginTop: "8px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: item.score + "%", background: item.color, borderRadius: "2px" }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checklist */}
                <div style={{ background: "#020617", borderRadius: "10px", padding: "16px", border: "1px solid #1e293b", marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "10px" }}>Pre-Ship Checklist</div>
                  {[
                    { check: specScore >= 50, label: "Spec is at least 50% complete" },
                    { check: secFindings.filter((f: any) => f.sev === "CRIT").length === 0, label: "Zero CRITICAL security vulnerabilities" },
                    { check: secFindings.filter((f: any) => f.sev === "HIGH").length === 0, label: "Zero HIGH security vulnerabilities" },
                    { check: secScore >= 75, label: "Security score 75+" },
                    { check: revScore >= 65, label: "Code quality score 65+" },
                    { check: revFindings.filter((f: any) => f.cat === "LOGIC" && f.imp === "HIGH").length === 0, label: "No high-impact logic errors" },
                    { check: (metrics?.commentPct ?? 0) >= 5, label: "Comment ratio above 5%" },
                    { check: overallScore >= 75, label: "Overall score 75+ (Ship Ready)" },
                  ].map((item: any, i: any) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0" }}>
                      <span style={{ fontSize: "14px" }}>{item.check ? "✅" : "❌"}</span>
                      <span style={{ fontSize: "13px", color: item.check ? "#4ade80" : "#f87171" }}>{item.label}</span>
                    </div>
                  ))}
                </div>

                {canShip ? (
                  <div style={{ background: "#22c55e10", borderRadius: "10px", border: "2px solid #22c55e40", padding: "20px", textAlign: "center" }}>
                    <div style={{ fontSize: "36px", marginBottom: "4px" }}>🚀</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#4ade80" }}>CLEARED FOR DEPLOYMENT</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Your code passed GodMode's pipeline. Ship with confidence.</div>
                  </div>
                ) : (
                  <div style={{ background: "#ef444410", borderRadius: "10px", border: "2px solid #ef444440", padding: "20px", textAlign: "center" }}>
                    <div style={{ fontSize: "36px", marginBottom: "4px" }}>🚫</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#f87171" }}>NOT READY TO SHIP</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Fix the failing checks above, then re-scan. Do not deploy code that fails GodMode's pipeline.</div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "40px", color: "#475569" }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>📋</div>
                <div style={{ fontSize: "14px" }}>Complete the pipeline first: Spec → Generate → Security → Review → Ship</div>
              </div>
            )}
          </div>
        )}

        <p style={{ textAlign: "center", color: "#1e293b", fontSize: "10px", marginTop: "20px" }}>
          GodMode v1.0 — The AI coding platform that refuses to ship bad code. Built with $0.
        </p>
      </div>
    </div>
  );
}
