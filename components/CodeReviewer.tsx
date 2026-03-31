import { useState, useCallback, useMemo } from "react";

// ============================================================
// GODMODE CODE REVIEWER v1.0
// Automated senior-developer-level code review.
// Catches logic errors, code smell, anti-patterns, tech debt.
// The piece that eliminates the 91% review bottleneck.
// ============================================================

const CATEGORY = {
  LOGIC: { label: "Logic Error", color: "#ef4444", bg: "#ef444415", icon: "ð§ " },
  SMELL: { label: "Code Smell", color: "#f97316", bg: "#f9731615", icon: "ð" },
  DEBT: { label: "Tech Debt", color: "#f59e0b", bg: "#f59e0b15", icon: "ð³" },
  PERF: { label: "Performance", color: "#a855f7", bg: "#a855f715", icon: "â¡" },
  PATTERN: { label: "Anti-Pattern", color: "#ec4899", bg: "#ec489915", icon: "ð«" },
  STYLE: { label: "Style", color: "#3b82f6", bg: "#3b82f615", icon: "â¨" },
  MAINT: { label: "Maintainability", color: "#14b8a6", bg: "#14b8a615", icon: "ð§" },
};

const IMPACT = {
  HIGH: { label: "High Impact", color: "#ef4444" },
  MEDIUM: { label: "Medium Impact", color: "#f59e0b" },
  LOW: { label: "Low Impact", color: "#3b82f6" },
};

const REVIEW_RULES = [
  // === LOGIC ERRORS ===
  {
    id: "loose-equality",
    pattern: /[^=!]==[^=]/g,
    category: "LOGIC",
    impact: "MEDIUM",
    title: "Loose Equality (==) Instead of Strict (===)",
    description: "Loose equality performs type coercion, leading to surprising behavior: `0 == ''` is true, `null == undefined` is true, `'1' == 1` is true.",
    suggestion: "Use `===` and `!==` for all comparisons. This prevents subtle type coercion bugs that are extremely hard to debug.",
  },
  {
    id: "assignment-in-condition",
    pattern: /if\s*\(\s*\w+\s*=[^=]/g,
    category: "LOGIC",
    impact: "HIGH",
    title: "Assignment Inside Condition (= instead of ==)",
    description: "This assigns a value inside an if-statement instead of comparing. The condition will always be truthy (unless assigning 0, null, etc.).",
    suggestion: "Use `===` for comparison. If assignment is intentional, wrap in extra parentheses: `if ((x = getValue()))`.",
  },
  {
    id: "async-no-await",
    pattern: /async\s+(?:function\s+\w+|\(\w*\)\s*=>|\w+\s*=\s*async)[^}]*\{[^}]*(?!await)[^}]*\}/g,
    category: "LOGIC",
    impact: "MEDIUM",
    title: "Async Function Without Await",
    description: "An async function that never uses await returns a Promise unnecessarily, adding overhead and confusion.",
    suggestion: "Remove `async` if no `await` is needed, or add proper await calls for asynchronous operations.",
  },
  {
    id: "floating-point-comparison",
    pattern: /(?:===|==)\s*(?:0\.1\s*\+\s*0\.2|parseFloat|\.toFixed)/g,
    category: "LOGIC",
    impact: "MEDIUM",
    title: "Floating Point Comparison",
    description: "Comparing floating point numbers directly fails: `0.1 + 0.2 !== 0.3` in JavaScript. This causes silent calculation errors.",
    suggestion: "Use an epsilon comparison: `Math.abs(a - b) < Number.EPSILON` or use integer arithmetic (cents instead of dollars).",
  },
  {
    id: "catch-swallowing",
    pattern: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g,
    category: "LOGIC",
    impact: "HIGH",
    title: "Empty Catch Block â Swallowing Errors",
    description: "Empty catch blocks silently hide errors. When something breaks, you'll have no idea what went wrong or where.",
    suggestion: "At minimum log the error: `catch (err) { console.error('Context:', err); }`. Better: handle the specific error or re-throw.",
  },
  {
    id: "promise-no-catch",
    pattern: /\.then\s*\([^)]*\)(?!\s*\.catch|\s*\.finally)/g,
    category: "LOGIC",
    impact: "HIGH",
    title: "Promise Without .catch()",
    description: "Unhandled promise rejections crash Node.js applications and cause silent failures in browsers.",
    suggestion: "Add `.catch()` to all promise chains, or use async/await with try/catch blocks.",
  },

  // === CODE SMELL ===
  {
    id: "magic-numbers",
    pattern: /(?:if|while|for|return|===|!==|>|<|>=|<=)\s*(?:[^0-1\s\n,;)}\]]\s*)?\b(?:[2-9]\d{2,}|\d{4,})\b/g,
    category: "SMELL",
    impact: "MEDIUM",
    title: "Magic Number Detected",
    description: "Hardcoded numbers without explanation make code unreadable. What does 86400 mean? (It's seconds in a day, but nobody will know that in 6 months.)",
    suggestion: "Extract to named constants: `const SECONDS_PER_DAY = 86400;` or `const MAX_RETRIES = 3;`.",
  },
  {
    id: "deeply-nested",
    pattern: /\{\s*(?:[^{}]*\{){4,}/g,
    category: "SMELL",
    impact: "MEDIUM",
    title: "Deeply Nested Code (4+ levels)",
    description: "Deep nesting makes code hard to read, test, and maintain. It's a sign that the function is doing too much.",
    suggestion: "Extract nested logic into separate functions. Use early returns (guard clauses) to reduce nesting depth.",
  },
  {
    id: "long-parameter-list",
    pattern: /function\s+\w+\s*\(\s*\w+\s*,\s*\w+\s*,\s*\w+\s*,\s*\w+\s*,\s*\w+/g,
    category: "SMELL",
    impact: "MEDIUM",
    title: "Too Many Function Parameters (5+)",
    description: "Functions with 5+ parameters are hard to call correctly and indicate the function has too many responsibilities.",
    suggestion: "Use an options object: `function createUser({ name, email, role, ...opts })` instead of positional parameters.",
  },
  {
    id: "duplicate-string-literal",
    pattern: /["'`]([^"'`]{8,})["'`][\s\S]{0,500}?\1/g,
    category: "SMELL",
    impact: "LOW",
    title: "Duplicate String Literal",
    description: "The same string appears multiple times. If it ever changes, you'll need to find and update every instance.",
    suggestion: "Extract to a constant: `const ERROR_MSG = 'Something went wrong';` and reference it everywhere.",
  },
  {
    id: "god-function",
    pattern: /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))[^]*?\n(?:[^\n]*\n){50,}?\}/g,
    category: "SMELL",
    impact: "HIGH",
    title: "Oversized Function (50+ lines)",
    description: "Functions longer than 50 lines are hard to understand, test, and maintain. They typically violate single-responsibility principle.",
    suggestion: "Break into smaller functions, each doing one thing. Aim for 20-30 lines max per function.",
  },

  // === TECH DEBT ===
  {
    id: "todo-in-code",
    pattern: /\/\/\s*(?:TODO|FIXME|HACK|XXX|TEMP|TEMPORARY)\b/gi,
    category: "DEBT",
    impact: "MEDIUM",
    title: "TODO/FIXME Left in Code",
    description: "Unresolved TODOs are technical debt markers. AI-generated code is full of these â they never get fixed.",
    suggestion: "Resolve the TODO now or create a tracked issue/ticket. Don't ship unresolved TODOs to production.",
  },
  {
    id: "commented-out-code",
    pattern: /\/\/\s*(?:const|let|var|function|if|for|while|return|import|export|class)\s+\w/g,
    category: "DEBT",
    impact: "LOW",
    title: "Commented-Out Code",
    description: "Dead code left as comments clutters the codebase and confuses future developers. Git history preserves old code.",
    suggestion: "Delete commented-out code. If you might need it later, git history has it. Ship clean code.",
  },
  {
    id: "any-type",
    pattern: /:\s*any\b/g,
    category: "DEBT",
    impact: "MEDIUM",
    title: "TypeScript `any` Type Used",
    description: "Using `any` defeats the purpose of TypeScript. It disables type checking and hides bugs that the compiler would catch.",
    suggestion: "Replace with proper types. Use `unknown` if the type is truly uncertain, then narrow with type guards.",
  },
  {
    id: "disable-eslint",
    pattern: /\/[/*]\s*eslint-disable(?!-next-line)/g,
    category: "DEBT",
    impact: "MEDIUM",
    title: "ESLint Rules Disabled",
    description: "Disabling linting rules hides issues instead of fixing them. AI tools often add these to make code 'pass' without actually fixing problems.",
    suggestion: "Fix the underlying issue instead of disabling the rule. If truly necessary, use eslint-disable-next-line for a single line with a comment explaining why.",
  },
  {
    id: "ts-ignore",
    pattern: /@ts-ignore|@ts-nocheck/g,
    category: "DEBT",
    impact: "HIGH",
    title: "TypeScript Checking Disabled (@ts-ignore)",
    description: "Suppressing TypeScript errors hides real bugs. AI generates these when it can't figure out the types.",
    suggestion: "Fix the type error properly. Use `@ts-expect-error` with a comment if truly unavoidable â it at least errors when the suppression is no longer needed.",
  },

  // === PERFORMANCE ===
  {
    id: "n-plus-one",
    pattern: /(?:for|forEach|map|while)\s*\([^)]*\)\s*\{[^}]*(?:await\s+)?(?:fetch|query|findOne|findById|get|request)\s*\(/g,
    category: "PERF",
    impact: "HIGH",
    title: "Potential N+1 Query Problem",
    description: "Database/API calls inside a loop cause N+1 queries. For 100 items, that's 101 separate calls instead of 1 batch call.",
    suggestion: "Batch the operation: fetch all items at once with `WHERE id IN (...)` or use DataLoader pattern. This can be 10-100x faster.",
  },
  {
    id: "missing-memo",
    pattern: /(?:const|function)\s+\w+\s*=?\s*(?:\([^)]*\)\s*=>|function)\s*[^{]*\{[^}]*(?:map|filter|reduce|sort|find)\s*\(/g,
    category: "PERF",
    impact: "LOW",
    title: "Expensive Computation â Consider Memoization",
    description: "Array operations (map, filter, reduce, sort) inside render functions re-execute on every render.",
    suggestion: "Wrap with `useMemo()` in React components, or cache results outside the render path.",
  },
  {
    id: "sync-fs-operation",
    pattern: /(?:readFileSync|writeFileSync|appendFileSync|existsSync|mkdirSync|readdirSync)/g,
    category: "PERF",
    impact: "HIGH",
    title: "Synchronous File System Operation",
    description: "Sync file operations block the entire Node.js event loop. During this time, your server can't handle ANY other requests.",
    suggestion: "Use async versions: `await fs.promises.readFile()` or `fs.readFile()` with callbacks.",
  },
  {
    id: "no-pagination",
    pattern: /find\(\s*\{?\s*\}?\s*\)(?!\s*\.limit)|findAll\(\s*\)(?!\s*\.limit)|SELECT\s+\*?\s+FROM\s+\w+(?!\s+LIMIT)/gi,
    category: "PERF",
    impact: "HIGH",
    title: "Query Without Pagination/Limit",
    description: "Fetching all records without LIMIT is a ticking time bomb. Works fine with 10 rows, crashes with 10 million.",
    suggestion: "Always add pagination: `.limit(50).offset(page * 50)` or `LIMIT 50 OFFSET ?`. Implement cursor-based pagination for large datasets.",
  },

  // === ANTI-PATTERNS ===
  {
    id: "var-usage",
    pattern: /\bvar\s+\w/g,
    category: "PATTERN",
    impact: "MEDIUM",
    title: "`var` Used Instead of `const`/`let`",
    description: "`var` has function scope and hoisting, causing bugs. It's a legacy keyword â modern JavaScript uses const/let.",
    suggestion: "Use `const` by default. Use `let` only when reassignment is needed. Never use `var`.",
  },
  {
    id: "callback-hell",
    pattern: /\(\s*(?:err|error)\s*(?:,\s*\w+)?\s*\)\s*=>\s*\{[^}]*\(\s*(?:err|error)\s*(?:,\s*\w+)?\s*\)\s*=>\s*\{/g,
    category: "PATTERN",
    impact: "MEDIUM",
    title: "Callback Nesting (Callback Hell)",
    description: "Nested callbacks create pyramid-shaped code that's nearly impossible to read, debug, or extend.",
    suggestion: "Refactor to async/await: `const data = await fetchData(); const result = await process(data);`.",
  },
  {
    id: "string-type-checking",
    pattern: /typeof\s+\w+\s*===?\s*["'`](?:string|number|boolean|object|function)["'`]/g,
    category: "PATTERN",
    impact: "LOW",
    title: "typeof Checking â Consider TypeScript",
    description: "Runtime type checking with typeof is fragile. TypeScript catches these errors at compile time.",
    suggestion: "If using TypeScript, use type guards. If not, consider migrating â it catches entire categories of bugs automatically.",
  },
  {
    id: "mutating-state-directly",
    pattern: /(?:this\.state\.\w+\s*=|setState\s*\(\s*\{[^}]*this\.state)/g,
    category: "PATTERN",
    impact: "HIGH",
    title: "Direct State Mutation (React)",
    description: "Mutating React state directly bypasses re-rendering and causes stale UI, lost updates, and impossible-to-debug issues.",
    suggestion: "Always use setState/useState setter with a new object: `setState(prev => ({ ...prev, field: newValue }))`.",
  },
  {
    id: "console-log-left",
    pattern: /console\.(log|debug|info|warn)\s*\(/g,
    category: "PATTERN",
    impact: "LOW",
    title: "console.log Left in Code",
    description: "Development console.logs shipped to production expose internal data and clutter browser consoles.",
    suggestion: "Remove before deploy, or use a logging library (winston, pino) with configurable log levels.",
  },

  // === STYLE / MAINTAINABILITY ===
  {
    id: "inconsistent-quotes",
    pattern: /["'][^"'\n]*["']/g,
    _customCheck: true,
    category: "STYLE",
    impact: "LOW",
    title: "Inconsistent Quote Style",
    description: "Mixing single and double quotes reduces readability and suggests code was assembled from multiple AI responses.",
    suggestion: "Pick one style (single quotes are most common in JS) and use it consistently. Configure Prettier to auto-format.",
  },
  {
    id: "no-error-types",
    pattern: /catch\s*\(\s*\w+\s*\)\s*\{(?![^}]*instanceof)/g,
    category: "MAINT",
    impact: "MEDIUM",
    title: "Catch Block Without Error Type Checking",
    description: "Catching all errors the same way means network errors, validation errors, and code bugs all get the same treatment.",
    suggestion: "Check error types: `if (err instanceof ValidationError) { ... } else if (err instanceof NetworkError) { ... }`.",
  },
  {
    id: "hardcoded-url",
    pattern: /(?:fetch|axios|http|request)\s*\(\s*["'`]https?:\/\/(?!localhost)/g,
    category: "MAINT",
    impact: "MEDIUM",
    title: "Hardcoded URL in Code",
    description: "Hardcoded URLs break when switching between dev/staging/production environments.",
    suggestion: "Use environment variables: `fetch(process.env.API_BASE_URL + '/endpoint')` or a config file.",
  },
  {
    id: "no-typescript-strict",
    pattern: /"strict"\s*:\s*false|"noImplicitAny"\s*:\s*false/g,
    category: "MAINT",
    impact: "MEDIUM",
    title: "TypeScript Strict Mode Disabled",
    description: "Non-strict TypeScript misses many bugs. It's like wearing a seatbelt but not buckling it.",
    suggestion: "Enable `\"strict\": true` in tsconfig.json. Fix the resulting errors â each one is a real potential bug.",
  },
];

function reviewCode(code: any) {
  const findings = [];
  const lines = code.split("\n");

  // Check for inconsistent quotes separately
  let singleCount = 0, doubleCount = 0;
  for (const line of lines) {
    const singles = (line.match(/'/g) || []).length;
    const doubles = (line.match(/"/g) || []).length;
    singleCount += singles;
    doubleCount += doubles;
  }
  const hasInconsistentQuotes = singleCount > 5 && doubleCount > 5 && Math.min(singleCount, doubleCount) / Math.max(singleCount, doubleCount) > 0.3;

  for (const rule of REVIEW_RULES) {
    if (rule._customCheck) {
      if (rule.id === "inconsistent-quotes" && hasInconsistentQuotes) {
        findings.push({
          ruleId: rule.id, category: rule.category, impact: rule.impact,
          title: rule.title, description: rule.description, suggestion: rule.suggestion,
          line: null, lineContent: `Found ${singleCount} single quotes and ${doubleCount} double quotes`,
        });
      }
      continue;
    }

    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;
    const seenLines = new Set();

    while ((match = regex.exec(code)) !== null) {
      const beforeMatch = code.substring(0, match.index);
      const lineNumber = beforeMatch.split("\n").length;

      if (seenLines.has(lineNumber)) continue;
      seenLines.add(lineNumber);

      const lineContent = lines[lineNumber - 1]?.trim() || "";

      // Skip if inside a comment
      if (lineContent.startsWith("//") || lineContent.startsWith("*") || lineContent.startsWith("/*")) continue;

      findings.push({
        ruleId: rule.id, category: rule.category, impact: rule.impact,
        title: rule.title, description: rule.description, suggestion: rule.suggestion,
        line: lineNumber, lineContent,
      });

      // Cap per rule
      if (seenLines.size >= 5) break;
    }
  }

  const impactOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  findings.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);
  return findings;
}

function getMetrics(code: any) {
  const lines = code.split("\n");
  const totalLines = lines.length;
  const codeLines = lines.filter((l: string) => l.trim() && !l.trim().startsWith("//") && !l.trim().startsWith("*")).length;
  const commentLines = lines.filter((l: string) => l.trim().startsWith("//") || l.trim().startsWith("*") || l.trim().startsWith("/*")).length;
  const blankLines = lines.filter((l: string) => !l.trim()).length;
  const functions = (code.match(/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function))/g) || []).length;
  const imports = (code.match(/(?:import\s+|require\s*\()/g) || []).length;
  const exports = (code.match(/(?:export\s+|module\.exports)/g) || []).length;
  const commentRatio = totalLines > 0 ? Math.round((commentLines / totalLines) * 100) : 0;

  return { totalLines, codeLines, commentLines, blankLines, functions, imports, exports, commentRatio };
}

function getHealthScore(findings: any, metrics: any) {
  let score = 100;
  for (const f of findings) {
    if (f.impact === "HIGH") score -= 12;
    else if (f.impact === "MEDIUM") score -= 6;
    else score -= 2;
  }
  // Bonus/penalty for metrics
  if (metrics.commentRatio < 5 && metrics.codeLines > 20) score -= 5;
  if (metrics.commentRatio >= 15) score += 3;
  return Math.max(0, Math.min(100, score));
}

function getHealthLabel(score: any) {
  if (score >= 85) return { label: "Healthy", color: "#22c55e", emoji: "ð" };
  if (score >= 65) return { label: "Needs Work", color: "#f59e0b", emoji: "ð" };
  if (score >= 40) return { label: "Unhealthy", color: "#f97316", emoji: "ð§¡" };
  return { label: "Critical", color: "#ef4444", emoji: "â¤ï¸âð©¹" };
}

const SAMPLE_CODE = `// Example: Typical AI-generated React + Express code
var express = require('express');
const app = express();

// TODO: add proper error handling later
// FIXME: this is a temporary workaround

const API_URL = "http://api.example.com/v2";

async function fetchUserData(userId, orgId, role, includeHistory, format) {
  try {
    var response = await fetch("https://api.myservice.com/users/" + userId);
    var data = await response.json();

    if (data.status == "active") {
      for (let i = 0; i < data.orders.length; i++) {
        const order = await fetch("https://api.myservice.com/orders/" + data.orders[i].id);
        const orderData = await order.json();
        console.log("Order data:", orderData);

        if (orderData.total > 1000) {
          if (orderData.items.length > 0) {
            if (orderData.status == "pending") {
              if (orderData.priority == 1) {
                // process high priority
                console.log("processing high priority order");
              }
            }
          }
        }
      }
    }

    return data;
  } catch (e) {}
}

// @ts-ignore
function processPayment(amount) {
  const tax = amount * 0.0825;
  const shipping = 599;
  const discount = amount > 10000 ? 500 : 0;
  const total = amount + tax + shipping - discount;

  fetch(API_URL + "/payments").then(res => res.json()).then(data => {
    this.state.paymentStatus = "complete";
    console.log(data);
  });

  return total;
}

// const oldFunction = function() { return "deprecated"; }

app.get('/api/users', async (req, res) => {
  const users = await db.find({});
  res.json(users);
});

var config = {
  debug: true,
  'apiKey': "sk-1234567890"
};

export default fetchUserData;`;

export default function CodeReviewer() {
  const [code, setCode] = useState("");
  const [hasReviewed, setHasReviewed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const findings = useMemo(() => hasReviewed ? reviewCode(code) : [], [code, hasReviewed]);
  const metrics = useMemo(() => hasReviewed ? getMetrics(code) : null, [code, hasReviewed]);
  const healthScore = useMemo(() => metrics ? getHealthScore(findings, metrics) : 0, [findings, metrics]);
  const healthLabel = useMemo(() => getHealthLabel(healthScore), [healthScore]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(CATEGORY).forEach(k => counts[k] = 0);
    findings.forEach((f: any) => counts[f.category]++);
    return counts;
  }, [findings]);

  const filteredFindings = useMemo(() => {
    if (!activeCategory) return findings;
    return findings.filter((f: any) => f.category === activeCategory);
  }, [findings, activeCategory]);

  const handleReview = useCallback(() => {
    if (!code.trim()) return;
    setHasReviewed(true);
    setActiveCategory(null);
  }, [code]);

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
              background: "linear-gradient(135deg, #8b5cf6, #ec4899)", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: "18px",
            }}>ð</div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, background: "linear-gradient(135deg, #a78bfa, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              GodMode Code Reviewer
            </h1>
          </div>
          <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
            Senior-developer-level code review. Catches logic errors, code smell, tech debt, and anti-patterns automatically.
          </p>
        </div>

        {/* Code Input */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Paste Code to Review
            </label>
            <button onClick={() => { setCode(SAMPLE_CODE); setHasReviewed(false); }} style={{
              background: "none", border: "1px solid #334155", borderRadius: "6px",
              color: "#64748b", padding: "4px 12px", cursor: "pointer", fontSize: "12px",
            }}>
              Load Sample Code
            </button>
          </div>
          <textarea
            value={code} onChange={e => { setCode(e.target.value); setHasReviewed(false); }}
            placeholder="Paste your AI-generated code here for senior-level review..."
            rows={14}
            style={{
              width: "100%", padding: "14px", borderRadius: "10px", border: "1px solid #1e293b",
              background: "#0f172a", color: "#e2e8f0", fontSize: "13px", fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              resize: "vertical", outline: "none", lineHeight: 1.6, tabSize: 2,
            }}
          />
        </div>

        {/* Review Button */}
        <button onClick={handleReview} disabled={!code.trim()} style={{
          width: "100%", padding: "14px", borderRadius: "10px", border: "none",
          background: !code.trim() ? "#334155" : "linear-gradient(135deg, #8b5cf6, #ec4899)",
          color: "white", fontSize: "16px", fontWeight: 700, cursor: !code.trim() ? "default" : "pointer",
          marginBottom: "24px",
        }}>
          {hasReviewed ? `Re-Review Code (${findings.length} findings)` : "Run Code Review"}
        </button>

        {hasReviewed && (
          <div>
            {/* Dashboard */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px",
            }}>
              {/* Health Score */}
              <div style={{
                background: "#0f172a", borderRadius: "12px", border: "1px solid #1e293b",
                padding: "20px", display: "flex", alignItems: "center", gap: "16px",
              }}>
                <div style={{
                  width: "64px", height: "64px", borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 800,
                  border: `3px solid ${healthLabel.color}`, color: healthLabel.color, flexShrink: 0,
                }}>
                  {healthScore}
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "2px" }}>Code Health</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: healthLabel.color }}>
                    {healthLabel.emoji} {healthLabel.label}
                  </div>
                  <div style={{ fontSize: "12px", color: "#475569" }}>{findings.length} issues found</div>
                </div>
              </div>

              {/* Metrics */}
              {metrics && (
                <div style={{
                  background: "#0f172a", borderRadius: "12px", border: "1px solid #1e293b",
                  padding: "20px",
                }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "10px" }}>Code Metrics</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    {[
                      { label: "Lines", value: metrics.totalLines, color: "#e2e8f0" },
                      { label: "Functions", value: metrics.functions, color: "#818cf8" },
                      { label: "Imports", value: metrics.imports, color: "#22d3ee" },
                      { label: "Code", value: metrics.codeLines, color: "#4ade80" },
                      { label: "Comments", value: metrics.commentLines, color: "#fbbf24" },
                      { label: "Comment %", value: metrics.commentRatio + "%", color: metrics.commentRatio < 5 ? "#f87171" : "#4ade80" },
                    ].map(m => (
                      <div key={m.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: m.color }}>{m.value}</div>
                        <div style={{ fontSize: "10px", color: "#475569" }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category Filters */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
              <button onClick={() => setActiveCategory(null)} style={{
                padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600,
                border: !activeCategory ? "1px solid #6366f1" : "1px solid #334155",
                background: !activeCategory ? "#6366f115" : "transparent",
                color: !activeCategory ? "#818cf8" : "#64748b",
              }}>
                All ({findings.length})
              </button>
              {Object.entries(CATEGORY).filter(([k]) => categoryCounts[k] > 0).map(([key, cat]) => (
                <button key={key} onClick={() => setActiveCategory(activeCategory === key ? null : key)} style={{
                  padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600,
                  border: activeCategory === key ? `1px solid ${cat.color}` : "1px solid #334155",
                  background: activeCategory === key ? cat.bg : "transparent",
                  color: activeCategory === key ? cat.color : "#64748b",
                }}>
                  {cat.icon} {cat.label} ({categoryCounts[key]})
                </button>
              ))}
            </div>

            {/* Findings */}
            {filteredFindings.length === 0 && findings.length === 0 ? (
              <div style={{
                background: "#22c55e10", borderRadius: "12px", border: "1px solid #22c55e30",
                padding: "32px", textAlign: "center",
              }}>
                <div style={{ fontSize: "40px", marginBottom: "8px" }}>â</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#4ade80" }}>Clean Code</div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                  No issues detected by automated review. Consider manual review for business logic correctness.
                </div>
              </div>
            ) : (
              filteredFindings.map((f, i) => (
                <div key={`${f.ruleId}-${f.line}-${i}`} style={{
                  background: "#0f172a", borderRadius: "10px",
                  border: `1px solid ${CATEGORY[f.category as keyof typeof CATEGORY].color}20`,
                  borderLeft: `3px solid ${CATEGORY[f.category as keyof typeof CATEGORY].color}`,
                  padding: "16px", marginBottom: "8px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700,
                        background: CATEGORY[f.category as keyof typeof CATEGORY].bg, color: CATEGORY[f.category as keyof typeof CATEGORY].color,
                      }}>
                        {CATEGORY[f.category as keyof typeof CATEGORY].icon} {CATEGORY[f.category as keyof typeof CATEGORY].label}
                      </span>
                      <span style={{
                        padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600,
                        background: IMPACT[f.impact as keyof typeof IMPACT].color + "15", color: IMPACT[f.impact as keyof typeof IMPACT].color,
                      }}>
                        {f.impact}
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>{f.title}</span>
                    </div>
                    {f.line && <span style={{ fontSize: "12px", color: "#475569", whiteSpace: "nowrap" }}>Line {f.line}</span>}
                  </div>

                  {f.lineContent && (
                    <div style={{
                      background: "#020617", borderRadius: "6px", padding: "8px 12px", marginBottom: "10px",
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "12px", color: "#fbbf24",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {f.line && <span style={{ color: "#475569", marginRight: "12px" }}>{f.line}</span>}
                      {f.lineContent}
                    </div>
                  )}

                  <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 10px 0", lineHeight: 1.5 }}>{f.description}</p>

                  <div style={{ background: "#8b5cf610", borderRadius: "6px", padding: "10px 12px", border: "1px solid #8b5cf620" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.05em" }}>Suggestion: </span>
                    <span style={{ fontSize: "12px", color: "#c4b5fd", lineHeight: 1.5 }}>{f.suggestion}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <p style={{ textAlign: "center", color: "#334155", fontSize: "11px", marginTop: "24px" }}>
          GodMode Code Reviewer v1.0 â Automated senior-developer review. Eliminates the 91% review bottleneck.
        </p>
      </div>
    </div>
  );
}
