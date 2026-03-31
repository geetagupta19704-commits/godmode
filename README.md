# ⚡ GodMode

**The AI coding platform that refuses to ship bad code.**

Spec → Generate → Security Scan → Code Review → Ship Gate.

Built with $0. Every line of code earns the right to deploy.

---

## Quick Start (5 minutes)

### 1. Install dependencies

```bash
cd godmode
npm install
```

### 2. Set up Supabase (free — optional for auth)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **Settings → API** and copy your URL and anon key
4. Create `.env.local`:

```bash
cp .env.local.example .env.local
```

5. Paste your Supabase URL and anon key into `.env.local`

6. In Supabase Dashboard → **Authentication → Providers**, enable:
   - Email (enabled by default)
   - Google OAuth (optional — needs Google Cloud Console credentials)
   - GitHub OAuth (optional — needs GitHub OAuth App)

**Skip this step entirely if you just want to test without auth.**

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel (free)

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit: GodMode v1.0"
git remote add origin https://github.com/YOUR_USERNAME/godmode.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click **"Import Project"** → select your GitHub repo
4. Add environment variables (from step 2) in Vercel dashboard
5. Click **Deploy**

Your platform is live. Free. Forever.

---

## Project Structure

```
godmode/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Landing page
│   ├── globals.css         # Global styles + Tailwind
│   ├── auth/
│   │   └── page.tsx        # Login / Signup (Supabase)
│   ├── dashboard/
│   │   └── page.tsx        # Unified pipeline dashboard
│   ├── spec/
│   │   └── page.tsx        # Standalone spec engine
│   ├── scanner/
│   │   └── page.tsx        # Standalone security scanner
│   └── reviewer/
│       └── page.tsx        # Standalone code reviewer
├── components/
│   ├── Dashboard.tsx       # Unified 5-stage pipeline
│   ├── SpecEngine.tsx      # 9-step spec wizard
│   ├── SecurityScanner.tsx # 25+ OWASP vulnerability rules
│   └── CodeReviewer.tsx    # 30+ code quality rules
├── lib/
│   └── supabase.ts         # Supabase client
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

---

## Routes

| Route | What it does |
|-------|-------------|
| `/` | Landing page |
| `/auth` | Sign up / Sign in |
| `/dashboard` | Full pipeline: Spec → Generate → Scan → Review → Ship |
| `/spec` | Standalone 9-step spec engine |
| `/scanner` | Standalone OWASP security scanner |
| `/reviewer` | Standalone code quality reviewer |

---

## What Each Tool Does

### Spec Engine (9 stages)
Project overview → Tech stack → Data models → Authentication → API endpoints → Security requirements → Edge cases → Deployment → Export JSON

### Security Scanner (25+ rules)
Hardcoded secrets → SQL injection → XSS (dangerouslySetInnerHTML, eval, innerHTML) → SSRF → CORS misconfiguration → Broken crypto (MD5/SHA1) → Missing rate limiting → Debug mode → Stack trace exposure → Sensitive data logging

### Code Reviewer (30+ rules, 7 categories)
Logic errors → Code smell → Tech debt → Performance → Anti-patterns → Style → Maintainability

### Ship Gate
Weighted score: 50% security + 30% code quality + 20% spec completeness. 8-point checklist. Pass or fail. No middle ground.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Auth**: Supabase (free tier)
- **Hosting**: Vercel (free tier)
- **Cost**: $0

---

## Roadmap

- [ ] SLM fine-tuning for smarter security scanning (Google Colab + QLoRA)
- [ ] Save/load specs and scan history (Supabase database)
- [ ] Team workspaces and shared dashboards
- [ ] CI/CD integration (GitHub Actions hook)
- [ ] VS Code extension
- [ ] Product Hunt launch

---

Built by a founder who read 15+ research papers, dug through 10,000-developer studies, and found that every AI coding platform ships broken code. This one doesn't.
