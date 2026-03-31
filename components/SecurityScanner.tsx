"use client";
import { useState, useCallback, useMemo } from "react";

// ============================================================
// GODMODE SECURITY SCANNER v1.0
// Catches what Cursor, Bolt, Lovable, and Replit don't.
// Based on OWASP Top 10, CVE patterns, and real vibe-coding failures.
// ============================================================

const SEVERITY = {
  CRITICAL: { label: "CRITICAL", color: "#ef4444", bg: "#ef444418", icon: "ð´" },
  HIGH: { label: "HIGH", color: "#f97316", bg: "#f9731618", icon: "ð " },
  MEDIUM: { label: "MEDIUM", color: "#f59e0b", bg: "#f59e0b18", icon: "ð¡" },
  LOW: { label: "LOW", color: "#3b82f6", bg: "#3b82f618", icon: "ðµ" },
  INFO: { label: "INFO", color: "#64748b", bg: "#64748b18", icon: "âª" },
};

const VULNERABILITY_RULES = [
  // === CRITICAL: Hardcoded Secrets ===
  {
    id: "hardcoded-api-key",
    pattern: /(["'`])(sk[-_]|pk[-_]|api[-_]?key|apikey|api[-_]?secret)\w{8,}/gi,
    severity: "CRITICAL",
    title: "Hardcoded API Key Detected",
    description: "An API key or secret is hardcoded in the source code. This will be exposed in version control, client bundles, and build artifacts.",
    fix: "Move to environment variables: `process.env.API_KEY` or `.env` file. Never commit secrets to code.",
    owasp: "A07:2021 - Security Misconfiguration",
  },
  {
    id: "hardcoded-password",
    pattern: /(password|passwd|pwd|secret|token)\s*[:=]\s*["'`][^"'`]{4,}["'`]/gi,
    severity: "CRITICAL",
    title: "Hardcoded Password / Secret",
    description: "A password or secret value is directly embedded in the code.",
    fix: "Use environment variables or a secret manager (e.g., AWS Secrets Manager, Vault). Never store credentials in source code.",
    owasp: "A07:2021 - Security Misconfiguration",
  },
  {
    id: "private-key-exposed",
    pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
    severity: "CRITICAL",
    title: "Private Key Exposed in Source",
    description: "A private key is embedded directly in the code. This completely compromises encryption and authentication.",
    fix: "Remove immediately. Store private keys in secure key management systems, never in source code.",
    owasp: "A02:2021 - Cryptographic Failures",
  },
  {
    id: "jwt-secret-hardcoded",
    pattern: /jwt\.sign\s*\([^)]*,\s*["'`][^"'`]{4,}["'`]/gi,
    severity: "CRITICAL",
    title: "JWT Secret Hardcoded",
    description: "The JWT signing secret is hardcoded. Anyone with access to this code can forge authentication tokens.",
    fix: "Use `process.env.JWT_SECRET` and generate a strong random secret (256+ bits).",
    owasp: "A02:2021 - Cryptographic Failures",
  },

  // === CRITICAL: SQL Injection ===
  {
    id: "sql-injection-template",
    pattern: /(query|execute|raw|sql)\s*\(\s*(`[^`]*\$\{|["'][^"']*["']\s*\+)/gi,
    severity: "CRITICAL",
    title: "Potential SQL Injection",
    description: "SQL query is built using string concatenation or template literals with user input. This is the #1 database attack vector.",
    fix: "Use parameterized queries: `db.query('SELECT * FROM users WHERE id = $1', [userId])`. Never concatenate user input into SQL.",
    owasp: "A03:2021 - Injection",
  },
  {
    id: "sql-injection-concat",
    pattern: /["']SELECT\s+.*FROM\s+.*["']\s*\+/gi,
    severity: "CRITICAL",
    title: "SQL String Concatenation",
    description: "SQL query built with string concatenation. Even if current values are safe, future changes can introduce injection vulnerabilities.",
    fix: "Use an ORM (Prisma, Sequelize) or parameterized queries. Never build SQL with string concatenation.",
    owasp: "A03:2021 - Injection",
  },

  // === CRITICAL: XSS ===
  {
    id: "dangerously-set-innerHTML",
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html/g,
    severity: "CRITICAL",
    title: "dangerouslySetInnerHTML â XSS Risk",
    description: "Directly injecting HTML bypasses React's XSS protections. If any user-supplied data reaches this, attackers can execute arbitrary JavaScript.",
    fix: "Use a sanitizer like DOMPurify: `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}`. Better yet, avoid innerHTML entirely.",
    owasp: "A03:2021 - Injection",
  },
  {
    id: "document-write",
    pattern: /document\.write\s*\(/g,
    severity: "HIGH",
    title: "document.write() Used",
    description: "document.write() can inject unsanitized content into the DOM, creating XSS vulnerabilities.",
    fix: "Use DOM manipulation methods (createElement, textContent) or React's JSX rendering instead.",
    owasp: "A03:2021 - Injection",
  },
  {
    id: "innerhtml-assignment",
    pattern: /\.innerHTML\s*=\s*[^"'`\s]/g,
    severity: "HIGH",
    title: "Direct innerHTML Assignment",
    description: "Setting innerHTML with dynamic content enables XSS attacks. Any user input in this value can execute JavaScript.",
    fix: "Use textContent for text, or sanitize with DOMPurify before setting innerHTML.",
    owasp: "A03:2021 - Injection",
  },
  {
    id: "eval-usage",
    pattern: /\beval\s*\(/g,
    severity: "CRITICAL",
    title: "eval() Used â Code Injection Risk",
    description: "eval() executes arbitrary code. If any user input reaches eval, attackers gain full control.",
    fix: "Replace eval with JSON.parse for data, or use safer alternatives. There is almost never a legitimate need for eval().",
    owasp: "A03:2021 - Injection",
  },

  // === HIGH: Authentication & Session ===
  {
    id: "no-csrf-protection",
    pattern: /app\.(post|put|patch|delete)\s*\(\s*["'`]/g,
    severity: "MEDIUM",
    title: "State-Changing Route â Verify CSRF Protection",
    description: "POST/PUT/PATCH/DELETE routes modify data. Without CSRF tokens, attackers can forge requests from other sites.",
    fix: "Implement CSRF tokens (csurf middleware) or use SameSite cookie attributes. Verify Origin/Referer headers.",
    owasp: "A01:2021 - Broken Access Control",
  },
  {
    id: "cookie-no-httponly",
    pattern: /cookie\s*\([^)]*(?!httpOnly|httponly)[^)]*\)/gi,
    severity: "HIGH",
    title: "Cookie May Lack HttpOnly Flag",
    description: "Cookies without HttpOnly can be stolen via XSS attacks using document.cookie.",
    fix: "Set cookies with `httpOnly: true, secure: true, sameSite: 'strict'`.",
    owasp: "A05:2021 - Security Misconfiguration",
  },
  {
    id: "cors-wildcard",
    pattern: /cors\s*\(\s*\)|['"]\*['"]\s*.*(?:origin|Access-Control-Allow-Origin)/gi,
    severity: "HIGH",
    title: "CORS Wildcard (*) â Open to All Origins",
    description: "Allowing all origins means any website can make authenticated requests to your API.",
    fix: "Specify exact allowed origins: `cors({ origin: ['https://yourdomain.com'] })`.",
    owasp: "A05:2021 - Security Misconfiguration",
  },

  // === HIGH: Data Exposure ===
  {
    id: "console-log-sensitive",
    pattern: /console\.(log|debug|info)\s*\([^)]*(?:password|token|secret|key|auth|credential|ssn|credit)/gi,
    severity: "HIGH",
    title: "Sensitive Data in Console Log",
    description: "Logging passwords, tokens, or secrets exposes them in browser dev tools, server logs, and monitoring systems.",
    fix: "Remove all logging of sensitive data. Use structured logging that automatically redacts sensitive fields.",
    owasp: "A09:2021 - Security Logging & Monitoring Failures",
  },
  {
    id: "error-stack-exposed",
    pattern: /res\.(json|send)\s*\(\s*\{[^}]*(?:stack|trace|error\.message)/gi,
    severity: "MEDIUM",
    title: "Error Stack Trace Exposed to Client",
    description: "Sending stack traces to the client reveals internal paths, dependencies, and code structure to attackers.",
    fix: "Return generic error messages to clients. Log detailed errors server-side only: `res.json({ error: 'Something went wrong' })`.",
    owasp: "A05:2021 - Security Misconfiguration",
  },
  {
    id: "select-star",
    pattern: /SELECT\s+\*\s+FROM/gi,
    severity: "MEDIUM",
    title: "SELECT * â Potential Data Over-Exposure",
    description: "SELECT * returns all columns, potentially including sensitive fields (password hashes, tokens, PII) that the client doesn't need.",
    fix: "Select only needed columns: `SELECT id, name, email FROM users`. Never return password hashes or internal fields.",
    owasp: "A01:2021 - Broken Access Control",
  },

  // === MEDIUM: Input Validation ===
  {
    id: "no-input-validation",
    pattern: /req\.(body|query|params)\.\w+/g,
    severity: "MEDIUM",
    title: "User Input Used Without Validation",
    description: "Request data is accessed directly without validation or sanitization. All user input should be treated as untrusted.",
    fix: "Use a validation library (Zod, Joi, express-validator) to validate and sanitize all input before use.",
    owasp: "A03:2021 - Injection",
  },
  {
    id: "regex-dos",
    pattern: /new\s+RegExp\s*\(\s*(?:req|user|input|data|body|query|params)/gi,
    severity: "HIGH",
    title: "User Input in RegExp â ReDoS Risk",
    description: "Constructing regular expressions from user input can cause catastrophic backtracking (ReDoS), freezing your server.",
    fix: "Never pass user input directly to RegExp. Use a library like 're2' for safe regex, or escape special characters.",
    owasp: "A03:2021 - Injection",
  },

  // === MEDIUM: SSRF ===
  {
    id: "ssrf-fetch",
    pattern: /fetch\s*\(\s*(?:req|user|input|data|body|query|params|url)\b/gi,
    severity: "HIGH",
    title: "Potential SSRF â User-Controlled URL in Fetch",
    description: "Fetching a user-supplied URL allows attackers to access internal services, cloud metadata endpoints, or scan internal networks.",
    fix: "Validate and whitelist allowed URLs/domains. Block private IP ranges (10.x, 172.16.x, 192.168.x, 169.254.169.254).",
    owasp: "A10:2021 - SSRF",
  },

  // === MEDIUM: Crypto ===
  {
    id: "weak-hash-md5",
    pattern: /createHash\s*\(\s*["'`]md5["'`]\)/g,
    severity: "HIGH",
    title: "MD5 Hash â Cryptographically Broken",
    description: "MD5 is broken and can be cracked in seconds. Never use it for passwords, tokens, or security purposes.",
    fix: "Use bcrypt/scrypt/argon2 for passwords. Use SHA-256+ for integrity checks.",
    owasp: "A02:2021 - Cryptographic Failures",
  },
  {
    id: "weak-hash-sha1",
    pattern: /createHash\s*\(\s*["'`]sha1["'`]\)/g,
    severity: "MEDIUM",
    title: "SHA-1 Hash â Deprecated",
    description: "SHA-1 has known collision attacks. It should not be used for security-sensitive operations.",
    fix: "Use SHA-256 or SHA-3 for hashing. Use bcrypt/argon2 for passwords.",
    owasp: "A02:2021 - Cryptographic Failures",
  },

  // === LOW: Best Practices ===
  {
    id: "http-not-https",
    pattern: /["'`]http:\/\/(?!localhost|127\.0\.0\.1)/g,
    severity: "MEDIUM",
    title: "HTTP URL (Not HTTPS)",
    description: "HTTP connections are unencrypted. Data in transit can be intercepted, modified, or stolen.",
    fix: "Always use HTTPS for all external URLs. Set up TLS certificates (free via Let's Encrypt).",
    owasp: "A02:2021 - Cryptographic Failures",
  },
  {
    id: "no-rate-limit",
    pattern: /app\.(post|put)\s*\(\s*["'`]\/(?:api\/)?(?:login|auth|register|signup|reset|forgot)/gi,
    severity: "MEDIUM",
    title: "Auth Endpoint â Verify Rate Limiting",
    description: "Authentication endpoints without rate limiting are vulnerable to brute-force and credential stuffing attacks.",
    fix: "Add rate limiting: `express-rate-limit` or `rate-limiter-flexible`. Limit to 5-10 attempts per IP per minute on auth routes.",
    owasp: "A07:2021 - Identification & Authentication Failures",
  },
  {
    id: "todo-fixme-security",
    pattern: /\/\/\s*(?:TODO|FIXME|HACK|XXX)\s*:?\s*.*(?:security|auth|encrypt|password|token|secret|vulnerab)/gi,
    severity: "MEDIUM",
    title: "Security TODO/FIXME Found",
    description: "A developer marked a security issue as TODO but never fixed it. This is a known gap in your defenses.",
    fix: "Address all security-related TODOs before deploying. These are known vulnerabilities waiting to be exploited.",
    owasp: "A05:2021 - Security Misconfiguration",
  },
  {
    id: "debug-mode",
    pattern: /(?:debug|DEBUG|devMode|development)\s*[:=]\s*true/g,
    severity: "MEDIUM",
    title: "Debug Mode Enabled",
    description: "Debug mode often exposes verbose errors, stack traces, and internal data to end users.",
    fix: "Ensure debug mode is disabled in production. Use environment variables: `debug: process.env.NODE_ENV !== 'production'`.",
    owasp: "A05:2021 - Security Misconfiguration",
  },
  {
    id: "exposed-env-file",
    pattern: /require\s*\(\s*["'`]\.env["'`]\)|\.env\.(local|development|production)/g,
    severity: "LOW",
    title: "Direct .env Reference",
    description: "Ensure .env files are in .gitignore and never committed to version control.",
    fix: "Add `.env*` to .gitignore. Use `dotenv` package to load env files safely. Verify with `git status`.",
    owasp: "A05:2021 - Security Misconfiguration",
  },
  {
    id: "no-helmet",
    pattern: /app\s*=\s*express\s*\(\)/g,
    severity: "LOW",
    title: "Express App â Verify Security Headers (Helmet)",
    description: "Express apps without Helmet.js are missing critical security headers (CSP, X-Frame-Options, HSTS, etc.).",
    fix: "Add Helmet.js: `const helmet = require('helmet'); app.use(helmet());`. This adds 11 security headers in one line.",
    owasp: "A05:2021 - Security Misconfiguration",
  },
];

function scanCode(code: any) {
  const findings: any[] = [];
  const lines = code.split("\n");

  for (const rule of VULNERABILITY_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;
    while ((match = regex.exec(code)) !== null) {
      // Find line number
      const beforeMatch = code.substring(0, match.index);
      const lineNumber = beforeMatch.split("\n").length;
      const lineContent = lines[lineNumber - 1]?.trim() || "";

      // Avoid duplicate findings on same line for same rule
      const isDuplicate = findings.some(f => f.ruleId === rule.id && f.line === lineNumber);
      if (!isDuplicate) {
        findings.push({
          ruleId: rule.id,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          fix: rule.fix,
          owasp: rule.owasp,
          line: lineNumber,
          lineContent,
          matchedText: match[0].substring(0, 60),
        });
      }
    }
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  findings.sort((a: any, b: any) => severityOrder[a.severity] - severityOrder[b.severity]);
  return findings;
}

function getScore(findings: any) {
  let score = 100;
  for (const f of findings) {
    if (f.severity === "CRITICAL") score -= 25;
    else if (f.severity === "HIGH") score -= 15;
    else if (f.severity === "MEDIUM") score -= 8;
    else if (f.severity === "LOW") score -= 3;
  }
  return Math.max(0, score);
}

function getGrade(score: any) {
  if (score >= 90) return { grade: "A", color: "#22c55e", label: "Excellent â Production Ready" };
  if (score >= 75) return { grade: "B", color: "#84cc16", label: "Good â Minor Issues" };
  if (score >= 60) return { grade: "C", color: "#f59e0b", label: "Fair â Needs Attention" };
  if (score >= 40) return { grade: "D", color: "#f97316", label: "Poor â Significant Vulnerabilities" };
  return { grade: "F", color: "#ef4444", label: "Failing â Do NOT Deploy" };
}

const SAMPLE_CODE = `// Example: Typical vibe-coded Express app (paste your own code to scan)
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();

app.use(require('cors')());

const JWT_SECRET = "super-secret-key-12345";
const DB_PASSWORD = "admin123";

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.query(\`SELECT * FROM users WHERE email = '\${email}'\`);

  if (user && password === user.password) {
    const token = jwt.sign({ id: user.id, role: user.role }, "super-secret-key-12345");
    console.log("User logged in with token:", token);
    res.json({ token, user });
  } else {
    res.json({ error: err.message, stack: err.stack });
  }
});

// Profile page
app.get('/api/profile', (req, res) => {
  const userId = req.query.id;
  const result = await db.query("SELECT * FROM users WHERE id = " + userId);
  res.json(result);
});

// Webhook - fetches user-provided URL
app.post('/api/webhook', async (req, res) => {
  const data = await fetch(req.body.url);
  const html = await data.text();
  document.write(html);
  res.send(eval(req.body.template));
});

// TODO: add authentication check later
// FIXME: security headers not configured

app.listen(3000);`;

export default function SecurityScanner() {
  const [code, setCode] = useState("");
  const [hasScanned, setHasScanned] = useState(false);

  const findings = useMemo(() => hasScanned ? scanCode(code) : [], [code, hasScanned]);
  const score = useMemo(() => getScore(findings), [findings]);
  const grade = useMemo(() => getGrade(score), [score]);

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    findings.forEach((f: any) => counts[f.severity]++);
    return counts;
  }, [findings]);

  const handleScan = useCallback(() => {
    if (!code.trim()) return;
    setHasScanned(true);
  }, [code]);

  const loadSample = useCallback(() => {
    setCode(SAMPLE_CODE);
    setHasScanned(false);
  }, []);

  const handleCodeChange = useCallback((e: any) => {
    setCode(e.target.value);
    setHasScanned(false);
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "#020617", color: "#e2e8f0",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px 20px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "linear-gradient(135deg, #ef4444, #f97316)", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: "18px",
            }}>ð¡ï¸</div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, background: "linear-gradient(135deg, #f87171, #fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              GodMode Security Scanner
            </h1>
          </div>
          <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
            OWASP-aligned vulnerability detection for AI-generated code. Catches what Cursor, Bolt, and Lovable miss.
          </p>
        </div>

        {/* Code Input */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Paste Code to Scan
            </label>
            <button onClick={loadSample} style={{
              background: "none", border: "1px solid #334155", borderRadius: "6px",
              color: "#64748b", padding: "4px 12px", cursor: "pointer", fontSize: "12px",
            }}>
              Load Vulnerable Sample
            </button>
          </div>
          <textarea
            value={code} onChange={handleCodeChange}
            placeholder="Paste your AI-generated code here..."
            rows={14}
            style={{
              width: "100%", padding: "14px", borderRadius: "10px", border: "1px solid #1e293b",
              background: "#0f172a", color: "#e2e8f0", fontSize: "13px", fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              resize: "vertical", outline: "none", lineHeight: 1.6, tabSize: 2,
            }}
          />
        </div>

        {/* Scan Button */}
        <button onClick={handleScan} disabled={!code.trim()} style={{
          width: "100%", padding: "14px", borderRadius: "10px", border: "none",
          background: !code.trim() ? "#334155" : "linear-gradient(135deg, #ef4444, #f97316)",
          color: "white", fontSize: "16px", fontWeight: 700, cursor: !code.trim() ? "default" : "pointer",
          marginBottom: "24px", letterSpacing: "0.02em",
        }}>
          {hasScanned ? `Re-Scan Code (${findings.length} issues found)` : "Scan for Vulnerabilities"}
        </button>

        {/* Results */}
        {hasScanned && (
          <div>
            {/* Score Card */}
            <div style={{
              background: "#0f172a", borderRadius: "12px", border: "1px solid #1e293b",
              padding: "24px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "24px",
            }}>
              <div style={{
                width: "80px", height: "80px", borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "36px", fontWeight: 800,
                border: `3px solid ${grade.color}`, color: grade.color, flexShrink: 0,
              }}>
                {grade.grade}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "4px" }}>Security Score</div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: grade.color, marginBottom: "4px" }}>{score}/100</div>
                <div style={{ fontSize: "13px", color: grade.color }}>{grade.label}</div>
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {Object.entries(severityCounts).filter(([_, c]: any) => c > 0).map(([sev, count]: any) => (
                  <div key={sev} style={{
                    padding: "6px 12px", borderRadius: "8px", background: SEVERITY[sev as keyof typeof SEVERITY].bg,
                    border: `1px solid ${SEVERITY[sev as keyof typeof SEVERITY].color}30`, textAlign: "center",
                  }}>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: SEVERITY[sev as keyof typeof SEVERITY].color }}>{count}</div>
                    <div style={{ fontSize: "10px", color: SEVERITY[sev as keyof typeof SEVERITY].color, fontWeight: 600 }}>{sev}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Findings */}
            {findings.length === 0 ? (
              <div style={{
                background: "#22c55e10", borderRadius: "12px", border: "1px solid #22c55e30",
                padding: "32px", textAlign: "center",
              }}>
                <div style={{ fontSize: "40px", marginBottom: "8px" }}>â</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#4ade80" }}>No Vulnerabilities Detected</div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                  This doesn't guarantee safety â always conduct manual review and penetration testing before production deployment.
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                  Vulnerabilities Found ({findings.length})
                </h3>
                {findings.map((f: any, i: any) => (
                  <div key={`${f.ruleId}-${f.line}-${i}`} style={{
                    background: "#0f172a", borderRadius: "10px", border: `1px solid ${SEVERITY[f.severity as keyof typeof SEVERITY].color}25`,
                    padding: "16px", marginBottom: "8px", borderLeft: `3px solid ${SEVERITY[f.severity as keyof typeof SEVERITY].color}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700,
                          background: SEVERITY[f.severity as keyof typeof SEVERITY].bg, color: SEVERITY[f.severity as keyof typeof SEVERITY].color,
                        }}>
                          {SEVERITY[f.severity as keyof typeof SEVERITY].icon} {f.severity}
                        </span>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>{f.title}</span>
                      </div>
                      <span style={{ fontSize: "12px", color: "#475569", whiteSpace: "nowrap" }}>Line {f.line}</span>
                    </div>

                    {/* Matched code line */}
                    <div style={{
                      background: "#020617", borderRadius: "6px", padding: "8px 12px", marginBottom: "10px",
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "12px", color: "#f87171",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      <span style={{ color: "#475569", marginRight: "12px" }}>{f.line}</span>
                      {f.lineContent}
                    </div>

                    <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 10px 0", lineHeight: 1.5 }}>{f.description}</p>

                    <div style={{ background: "#22c55e08", borderRadius: "6px", padding: "10px 12px", border: "1px solid #22c55e20" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fix: </span>
                      <span style={{ fontSize: "12px", color: "#86efac", lineHeight: 1.5 }}>{f.fix}</span>
                    </div>

                    <div style={{ marginTop: "8px", fontSize: "11px", color: "#475569" }}>
                      {f.owasp}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            {findings.length > 0 && (
              <div style={{
                background: "#0f172a", borderRadius: "12px", border: "1px solid #1e293b",
                padding: "20px", marginTop: "16px",
              }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  OWASP Categories Hit
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {[...new Set(findings.map((f: any) => f.owasp))].map((cat: any) => (
                    <span key={cat} style={{
                      padding: "4px 10px", borderRadius: "6px", fontSize: "11px",
                      background: "#1e293b", color: "#94a3b8", border: "1px solid #334155",
                    }}>
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p style={{ textAlign: "center", color: "#334155", fontSize: "11px", marginTop: "24px" }}>
          GodMode Security Scanner v1.0 â 25+ OWASP-aligned rules. Zero cost. Zero excuses.
        </p>
      </div>
    </div>
  );
}
