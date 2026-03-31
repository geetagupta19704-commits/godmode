import { useState, useCallback, useMemo } from "react";

const STEPS = [
  { id: "project", title: "Project Overview", icon: "ð¯" },
  { id: "stack", title: "Tech Stack", icon: "âï¸" },
  { id: "data", title: "Data Models", icon: "ðï¸" },
  { id: "auth", title: "Authentication", icon: "ð" },
  { id: "api", title: "API Endpoints", icon: "ð" },
  { id: "security", title: "Security", icon: "ð¡ï¸" },
  { id: "edge", title: "Edge Cases", icon: "â¡" },
  { id: "deploy", title: "Deployment", icon: "ð" },
  { id: "review", title: "Review & Export", icon: "ð" },
];

const PROJECT_TYPES = [
  "Web Application", "REST API", "Mobile App (React Native)", "CLI Tool",
  "Chrome Extension", "Full-Stack SaaS", "E-Commerce Platform", "Dashboard / Admin Panel",
  "Real-Time Chat App", "Marketplace", "Blog / CMS", "Portfolio / Landing Page",
];

const TECH_OPTIONS = {
  frontend: ["React", "Next.js", "Vue", "Svelte", "Angular", "Astro", "Vanilla JS"],
  backend: ["Node.js / Express", "Python / FastAPI", "Python / Django", "Go / Gin", "Ruby on Rails", "Java / Spring", "Rust / Actix"],
  database: ["PostgreSQL", "MySQL", "MongoDB", "SQLite", "Supabase", "PlanetScale", "Firebase"],
  styling: ["Tailwind CSS", "CSS Modules", "Styled Components", "Sass/SCSS", "Chakra UI", "shadcn/ui", "Material UI"],
  hosting: ["Vercel", "Netlify", "Railway", "Fly.io", "AWS", "Google Cloud", "Self-hosted"],
};

const AUTH_METHODS = [
  "Email / Password", "OAuth (Google)", "OAuth (GitHub)", "Magic Link",
  "Phone / OTP", "SSO / SAML", "API Key", "JWT", "Session-based", "None",
];

const SECURITY_CHECKS = [
  { id: "csrf", label: "CSRF Protection", desc: "Prevent cross-site request forgery" },
  { id: "xss", label: "XSS Prevention", desc: "Sanitize all user inputs" },
  { id: "sqli", label: "SQL Injection Prevention", desc: "Parameterized queries only" },
  { id: "ratelimit", label: "Rate Limiting", desc: "Prevent API abuse" },
  { id: "cors", label: "CORS Configuration", desc: "Restrict allowed origins" },
  { id: "helmet", label: "Security Headers", desc: "Helmet.js / security headers" },
  { id: "encryption", label: "Data Encryption", desc: "Encrypt sensitive data at rest" },
  { id: "audit", label: "Audit Logging", desc: "Log all sensitive operations" },
  { id: "rbac", label: "Role-Based Access", desc: "RBAC permission system" },
  { id: "secrets", label: "Secret Management", desc: "Environment variables, no hardcoded keys" },
  { id: "deps", label: "Dependency Scanning", desc: "Check for vulnerable packages" },
  { id: "ssrf", label: "SSRF Prevention", desc: "Validate external URL requests" },
];

const Badge = ({ children, color = "blue", onClick, selected }: any) => (
  <button
    onClick={onClick}
    style={{
      display: "inline-flex", alignItems: "center", padding: "6px 14px",
      borderRadius: "20px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
      border: selected ? "2px solid" : "1px solid",
      borderColor: selected ? (color === "blue" ? "#6366f1" : color === "green" ? "#22c55e" : "#f59e0b") : "#334155",
      background: selected ? (color === "blue" ? "#6366f115" : color === "green" ? "#22c55e15" : "#f59e0b15") : "transparent",
      color: selected ? (color === "blue" ? "#818cf8" : color === "green" ? "#4ade80" : "#fbbf24") : "#94a3b8",
      transition: "all 0.2s",
    }}
  >
    {children}
  </button>
);

const TextInput = ({ label, value, onChange, placeholder, multiline }: any) => (
  <div style={{ marginBottom: "16px" }}>
    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </label>
    {multiline ? (
      <textarea
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        rows={4}
        style={{
          width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #334155",
          background: "#0f172a", color: "#e2e8f0", fontSize: "14px", resize: "vertical",
          outline: "none", fontFamily: "inherit",
        }}
      />
    ) : (
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #334155",
          background: "#0f172a", color: "#e2e8f0", fontSize: "14px", outline: "none",
        }}
      />
    )}
  </div>
);

const DataModelEditor = ({ models, setModels }: any) => {
  const addModel = () => setModels([...models, { name: "", fields: [{ name: "", type: "String", required: true }] }]);
  const removeModel = (i: any) => setModels(models.filter((_: any, idx: any) => idx !== i));
  const updateModel = (i: any, key: any, val: any) => {
    const updated = [...models];
    updated[i] = { ...updated[i], [key]: val };
    setModels(updated);
  };
  const addField = (i: any) => {
    const updated = [...models];
    updated[i].fields = [...updated[i].fields, { name: "", type: "String", required: false }];
    setModels(updated);
  };
  const updateField = (mi: any, fi: any, key: any, val: any) => {
    const updated = [...models];
    updated[mi].fields = updated[mi].fields.map((f: any, idx: any) => idx === fi ? { ...f, [key]: val } : f);
    setModels(updated);
  };
  const removeField = (mi: any, fi: any) => {
    const updated = [...models];
    updated[mi].fields = updated[mi].fields.filter((_: any, idx: any) => idx !== fi);
    setModels(updated);
  };
  const FIELD_TYPES = ["String", "Number", "Boolean", "Date", "Email", "URL", "UUID", "JSON", "Array", "Enum", "Relation"];

  return (
    <div>
      {models.map((model: any, mi: any) => (
        <div key={mi} style={{ background: "#0f172a", borderRadius: "10px", padding: "16px", marginBottom: "12px", border: "1px solid #1e293b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <input
              value={model.name} onChange={(e: any) => updateModel(mi, "name", e.target.value)}
              placeholder="Model name (e.g., User, Product, Order)"
              style={{ background: "transparent", border: "none", color: "#e2e8f0", fontSize: "16px", fontWeight: 600, outline: "none", flex: 1 }}
            />
            <button onClick={() => removeModel(mi)} style={{ background: "#ef444420", color: "#f87171", border: "none", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "12px" }}>Remove</button>
          </div>
          {model.fields.map((field: any, fi: any) => (
            <div key={fi} style={{ display: "flex", gap: "8px", marginBottom: "6px", alignItems: "center" }}>
              <input
                value={field.name} onChange={(e: any) => updateField(mi, fi, "name", e.target.value)}
                placeholder="field name"
                style={{ flex: 2, background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", padding: "6px 10px", color: "#e2e8f0", fontSize: "13px", outline: "none" }}
              />
              <select
                value={field.type} onChange={e => updateField(mi, fi, "type", e.target.value)}
                style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", padding: "6px 10px", color: "#e2e8f0", fontSize: "13px", outline: "none" }}
              >
                {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: "4px", color: "#94a3b8", fontSize: "12px", whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={field.required} onChange={e => updateField(mi, fi, "required", e.target.checked)} />
                Req
              </label>
              <button onClick={() => removeField(mi, fi)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "16px" }}>Ã</button>
            </div>
          ))}
          <button onClick={() => addField(mi)} style={{ background: "none", border: "1px dashed #334155", color: "#64748b", borderRadius: "6px", padding: "4px 12px", cursor: "pointer", fontSize: "12px", marginTop: "4px" }}>+ Add Field</button>
        </div>
      ))}
      <button onClick={addModel} style={{
        width: "100%", padding: "10px", borderRadius: "8px", border: "1px dashed #334155",
        background: "transparent", color: "#64748b", cursor: "pointer", fontSize: "13px",
      }}>
        + Add Data Model
      </button>
    </div>
  );
};

const EndpointEditor = ({ endpoints, setEndpoints }: any) => {
  const addEndpoint = () => setEndpoints([...endpoints, { method: "GET", path: "", description: "", auth: true }]);
  const updateEndpoint = (i: any, key: any, val: any) => {
    const updated = [...endpoints];
    updated[i] = { ...updated[i], [key]: val };
    setEndpoints(updated);
  };
  const removeEndpoint = (i: any) => setEndpoints(endpoints.filter((_: any, idx: any) => idx !== i));
  const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  const METHOD_COLORS = { GET: "#22c55e", POST: "#3b82f6", PUT: "#f59e0b", PATCH: "#a855f7", DELETE: "#ef4444" };

  return (
    <div>
      {endpoints.map((ep: any, i: any) => (
        <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
          <select
            value={ep.method} onChange={(e: any) => updateEndpoint(i, "method", e.target.value)}
            style={{ width: "90px", background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", padding: "8px", color: METHOD_COLORS[ep.method as keyof typeof METHOD_COLORS], fontSize: "12px", fontWeight: 700, outline: "none" }}
          >
            {METHODS.map((m: any) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            value={ep.path} onChange={(e: any) => updateEndpoint(i, "path", e.target.value)}
            placeholder="/api/v1/..."
            style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", padding: "8px", color: "#e2e8f0", fontSize: "13px", fontFamily: "monospace", outline: "none" }}
          />
          <input
            value={ep.description} onChange={(e: any) => updateEndpoint(i, "description", e.target.value)}
            placeholder="Description"
            style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", padding: "8px", color: "#e2e8f0", fontSize: "13px", outline: "none" }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: "4px", color: "#94a3b8", fontSize: "12px", whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={ep.auth} onChange={e => updateEndpoint(i, "auth", e.target.checked)} />
            Auth
          </label>
          <button onClick={() => removeEndpoint(i)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "16px" }}>Ã</button>
        </div>
      ))}
      <button onClick={addEndpoint} style={{
        width: "100%", padding: "10px", borderRadius: "8px", border: "1px dashed #334155",
        background: "transparent", color: "#64748b", cursor: "pointer", fontSize: "13px",
      }}>
        + Add Endpoint
      </button>
    </div>
  );
};

export default function SpecEngine() {
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [spec, setSpec] = useState({
    projectName: "",
    projectType: "",
    description: "",
    targetUsers: "",
    frontend: "",
    backend: "",
    database: "",
    styling: "",
    hosting: "",
    models: [{ name: "User", fields: [{ name: "id", type: "UUID", required: true }, { name: "email", type: "Email", required: true }, { name: "name", type: "String", required: true }, { name: "createdAt", type: "Date", required: true }] }],
    authMethods: [] as string[],
    authNotes: "",
    endpoints: [{ method: "GET", path: "/api/health", description: "Health check", auth: false }],
    securityChecks: ["csrf", "xss", "sqli", "ratelimit", "cors", "secrets"],
    securityNotes: "",
    edgeCases: "",
    errorHandling: "",
    scalingNotes: "",
    envVars: "",
    deployNotes: "",
  });

  const update = useCallback((key: any, val: any) => setSpec(prev => ({ ...prev, [key]: val })), []);
  const toggleArray = useCallback((key: any, val: any) => {
    setSpec(prev => ({
      ...prev,
      [key]: (prev as any)[key].includes(val) ? (prev as any)[key].filter((v: any) => v !== val) : [...(prev as any)[key], val],
    }));
  }, []);

  const completionScore = useMemo(() => {
    let score = 0, total = 0;
    const check = (val: any, weight = 1) => { total += weight; if (val && (typeof val === "string" ? val.trim() : val.length > 0)) score += weight; };
    check(spec.projectName); check(spec.projectType); check(spec.description);
    check(spec.frontend); check(spec.backend); check(spec.database);
    check(spec.models.length > 0 && spec.models[0].name); check(spec.authMethods, 1);
    check(spec.endpoints.length > 1); check(spec.securityChecks, 2);
    check(spec.edgeCases); check(spec.errorHandling);
    return Math.round((score / total) * 100);
  }, [spec]);

  const generateJSON = useCallback(() => {
    const output = {
      _meta: { generator: "GodMode Spec Engine v1.0", generatedAt: new Date().toISOString(), completionScore: completionScore + "%" },
      project: { name: spec.projectName, type: spec.projectType, description: spec.description, targetUsers: spec.targetUsers },
      techStack: { frontend: spec.frontend, backend: spec.backend, database: spec.database, styling: spec.styling, hosting: spec.hosting },
      dataModels: spec.models.filter(m => m.name).map(m => ({ name: m.name, fields: m.fields.filter(f => f.name).map(f => ({ name: f.name, type: f.type, required: f.required })) })),
      authentication: { methods: spec.authMethods, notes: spec.authNotes },
      api: { endpoints: spec.endpoints.filter(e => e.path).map(e => ({ method: e.method, path: e.path, description: e.description, requiresAuth: e.auth })) },
      security: { enabledChecks: spec.securityChecks, notes: spec.securityNotes },
      resilience: { edgeCases: spec.edgeCases, errorHandling: spec.errorHandling, scalingNotes: spec.scalingNotes },
      deployment: { environmentVariables: spec.envVars, notes: spec.deployNotes },
    };
    return JSON.stringify(output, null, 2);
  }, [spec, completionScore]);

  const copySpec = useCallback(() => {
    const text = generateJSON();
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [generateJSON]);

  const renderStep = () => {
    switch (currentStep) {
      case 0: return (
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>Project Overview</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>Define what you're building and who it's for. This is the foundation of your spec â AI will use this to understand the full context.</p>
          <TextInput label="Project Name" value={spec.projectName} onChange={(v: any) => update("projectName", v)} placeholder="e.g., TaskFlow, ShopEasy, DevBoard" />
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Project Type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {PROJECT_TYPES.map(t => <Badge key={t} onClick={() => update("projectType", t)} selected={spec.projectType === t}>{t}</Badge>)}
            </div>
          </div>
          <TextInput label="Description" value={spec.description} onChange={(v: any) => update("description", v)} placeholder="Describe what the application does in 2-3 sentences..." multiline />
          <TextInput label="Target Users" value={spec.targetUsers} onChange={(v: any) => update("targetUsers", v)} placeholder="Who will use this? e.g., Small business owners, developers, students..." />
        </div>
      );
      case 1: return (
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>Tech Stack</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>Choose your technology stack. This ensures AI generates code for the right frameworks instead of guessing.</p>
          {Object.entries(TECH_OPTIONS).map(([category, options]: any) => (
            <div key={category} style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{category}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {options.map((o: any) => <Badge key={o} color="green" onClick={() => update(category, o)} selected={(spec as any)[category] === o}>{o}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      );
      case 2: return (
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>Data Models</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>Define your database schema. Every model, every field, every type â specified upfront so AI doesn't hallucinate your data structure.</p>
          <DataModelEditor models={spec.models} setModels={(v: any) => update("models", v)} />
        </div>
      );
      case 3: return (
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>Authentication</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>100% of vibe-coded apps tested had auth vulnerabilities. Specifying auth upfront prevents the #1 security failure.</p>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Auth Methods</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {AUTH_METHODS.map((m: any) => <Badge key={m} color="blue" onClick={() => toggleArray("authMethods", m)} selected={spec.authMethods.includes(m)}>{m}</Badge>)}
            </div>
          </div>
          <TextInput label="Auth Notes" value={spec.authNotes} onChange={(v: any) => update("authNotes", v)} placeholder="Any specific auth requirements? Role hierarchy, token expiry, refresh strategy..." multiline />
        </div>
      );
      case 4: return (
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>API Endpoints</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>Define every API route. No more "just figure it out" â every endpoint is a contract between your frontend and backend.</p>
          <EndpointEditor endpoints={spec.endpoints} setEndpoints={(v: any) => update("endpoints", v)} />
        </div>
      );
      case 5: return (
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>Security Requirements</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>OWASP Top 10 vulnerabilities appear in every vibe-coded app. Select which protections your app MUST have. Pre-selected defaults cover critical risks.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
            {SECURITY_CHECKS.map(check => (
              <button key={check.id} onClick={() => toggleArray("securityChecks", check.id)}
                style={{
                  display: "flex", flexDirection: "column", padding: "12px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                  border: spec.securityChecks.includes(check.id) ? "2px solid #22c55e" : "1px solid #334155",
                  background: spec.securityChecks.includes(check.id) ? "#22c55e10" : "transparent",
                }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: spec.securityChecks.includes(check.id) ? "#4ade80" : "#94a3b8" }}>{check.label}</span>
                <span style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{check.desc}</span>
              </button>
            ))}
          </div>
          <TextInput label="Additional Security Notes" value={spec.securityNotes} onChange={(v: any) => update("securityNotes", v)} placeholder="Any additional security requirements..." multiline />
        </div>
      );
      case 6: return (
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>Edge Cases & Error Handling</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>This is where vibe-coded apps fall apart â the 20% that nobody specifies. Define it now, or debug it forever.</p>
          <TextInput label="Edge Cases" value={spec.edgeCases} onChange={(v: any) => update("edgeCases", v)} placeholder="What could go wrong? e.g., empty states, concurrent edits, rate limits hit, invalid input, network timeout..." multiline />
          <TextInput label="Error Handling Strategy" value={spec.errorHandling} onChange={(v: any) => update("errorHandling", v)} placeholder="How should errors be handled? e.g., retry logic, user-friendly messages, error boundaries, logging..." multiline />
          <TextInput label="Scaling Considerations" value={spec.scalingNotes} onChange={(v: any) => update("scalingNotes", v)} placeholder="Expected load? Caching strategy? Database indexing? Pagination approach?" multiline />
        </div>
      );
      case 7: return (
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>Deployment</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>Specify your deployment environment and configuration. No hardcoded secrets, no guessing infrastructure.</p>
          <TextInput label="Environment Variables" value={spec.envVars} onChange={(v: any) => update("envVars", v)} placeholder="List required env vars, e.g., DATABASE_URL, JWT_SECRET, STRIPE_KEY, REDIS_URL..." multiline />
          <TextInput label="Deployment Notes" value={spec.deployNotes} onChange={(v: any) => update("deployNotes", v)} placeholder="CI/CD pipeline? Docker? Staging environment? Health checks? Monitoring?" multiline />
        </div>
      );
      case 8: return (
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" }}>Review & Export</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>Your structured spec is ready. Copy the JSON and paste it into any AI coding tool â it will generate dramatically better code than a one-line prompt.</p>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{
              height: "8px", flex: 1, borderRadius: "4px", background: "#1e293b", overflow: "hidden",
            }}>
              <div style={{ height: "100%", width: completionScore + "%", borderRadius: "4px", background: completionScore > 80 ? "#22c55e" : completionScore > 50 ? "#f59e0b" : "#ef4444", transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: "14px", fontWeight: 700, color: completionScore > 80 ? "#4ade80" : completionScore > 50 ? "#fbbf24" : "#f87171" }}>
              {completionScore}% Complete
            </span>
          </div>
          {completionScore < 60 && (
            <div style={{ background: "#f59e0b15", border: "1px solid #f59e0b40", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
              <p style={{ color: "#fbbf24", fontSize: "13px", margin: 0 }}>Your spec is under 60% complete. AI will fill in the gaps with guesses â which is exactly how security vulnerabilities and bugs happen. Go back and fill in more details for production-ready code.</p>
            </div>
          )}
          <div style={{ position: "relative" }}>
            <button onClick={copySpec} style={{
              position: "absolute", top: "8px", right: "8px", padding: "6px 14px", borderRadius: "6px",
              background: copied ? "#22c55e" : "#6366f1", color: "white", border: "none", cursor: "pointer",
              fontSize: "12px", fontWeight: 600, zIndex: 1, transition: "background 0.2s",
            }}>
              {copied ? "Copied!" : "Copy JSON"}
            </button>
            <pre style={{
              background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px",
              padding: "16px", color: "#94a3b8", fontSize: "11px", fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              overflow: "auto", maxHeight: "400px", margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap",
            }}>
              {generateJSON()}
            </pre>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#020617", color: "#e2e8f0",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px 20px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: "18px",
            }}>â¡</div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              GodMode Spec Engine
            </h1>
          </div>
          <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
            Define specs before you generate. Kill the 80/20 wall before it kills your project.
          </p>
        </div>

        {/* Step Navigation */}
        <div style={{ display: "flex", gap: "2px", marginBottom: "24px", overflowX: "auto", paddingBottom: "4px" }}>
          {STEPS.map((step, i) => (
            <button
              key={step.id} onClick={() => setCurrentStep(i)}
              style={{
                flex: 1, minWidth: "80px", padding: "8px 4px", borderRadius: "8px", cursor: "pointer",
                border: i === currentStep ? "1px solid #6366f1" : "1px solid transparent",
                background: i === currentStep ? "#6366f115" : i < currentStep ? "#22c55e08" : "transparent",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "16px" }}>{step.icon}</span>
              <span style={{ fontSize: "10px", color: i === currentStep ? "#818cf8" : i < currentStep ? "#4ade80" : "#475569", fontWeight: i === currentStep ? 700 : 500 }}>
                {step.title}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          background: "#0f172a80", borderRadius: "12px", border: "1px solid #1e293b",
          padding: "24px", marginBottom: "16px", minHeight: "400px",
        }}>
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            style={{
              padding: "10px 24px", borderRadius: "8px", border: "1px solid #334155",
              background: "transparent", color: currentStep === 0 ? "#334155" : "#94a3b8",
              cursor: currentStep === 0 ? "default" : "pointer", fontSize: "14px", fontWeight: 600,
            }}
          >
            â Back
          </button>
          <button
            onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
            disabled={currentStep === STEPS.length - 1}
            style={{
              padding: "10px 24px", borderRadius: "8px", border: "none",
              background: currentStep === STEPS.length - 1 ? "#334155" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white", cursor: currentStep === STEPS.length - 1 ? "default" : "pointer",
              fontSize: "14px", fontWeight: 600,
            }}
          >
            Next â
          </button>
        </div>

        <p style={{ textAlign: "center", color: "#334155", fontSize: "11px", marginTop: "24px" }}>
          Built with zero budget. Powered by research, not hype.
        </p>
      </div>
    </div>
  );
}
