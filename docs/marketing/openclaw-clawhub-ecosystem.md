# OpenClaw & ClawHub Ecosystem — Deep Dive

Last updated: 2026-02-21

---

## Table of Contents

1. [Overview](#overview)
2. [History & Naming](#history--naming)
3. [Peter Steinberger — The Creator](#peter-steinberger--the-creator)
4. [Architecture](#architecture)
5. [Key Features](#key-features)
6. [Messaging Integrations](#messaging-integrations)
7. [Browser Automation](#browser-automation)
8. [Memory System](#memory-system)
9. [Heartbeat System](#heartbeat-system)
10. [Cron Jobs & Proactive Features](#cron-jobs--proactive-features)
11. [Skill System](#skill-system)
12. [Multi-Agent Capabilities](#multi-agent-capabilities)
13. [ClawHub — The Skill Marketplace](#clawhub--the-skill-marketplace)
14. [Top Skills](#top-skills)
15. [Security](#security)
16. [Supported Models](#supported-models)
17. [Hardware & Deployment](#hardware--deployment)
18. [macOS Companion App](#macos-companion-app)
19. [Moltbook — The Agent Social Network](#moltbook--the-agent-social-network)
20. [Community & Scale](#community--scale)
21. [Press Coverage](#press-coverage)
22. [Notable Figures & Commentary](#notable-figures--commentary)
23. [Criticisms & Concerns](#criticisms--concerns)
24. [Comparison to Other Platforms](#comparison-to-other-platforms)
25. [Funding & Business Model](#funding--business-model)
26. [Notable Use Cases](#notable-use-cases)
27. [Key Resources](#key-resources)

---

## Overview

**OpenClaw** is a free, open-source personal AI agent framework that runs on your own machine (Mac, Windows, Linux, Raspberry Pi). It connects any LLM (Claude, GPT, local models) to any messaging platform (WhatsApp, Telegram, Discord, Slack, Signal, iMessage) and gives the agent full access to your computer — files, browser, shell, cron jobs, and an extensible skill system.

**ClawHub** (clawhub.ai) is its companion skill marketplace — essentially "npm for AI agent skills." It hosts 9,300+ community-built skills that extend what OpenClaw agents can do.

Together they form the dominant ecosystem for autonomous personal AI agents as of early 2026.

| Metric | Value |
|--------|-------|
| GitHub Stars | 180,000+ |
| GitHub Forks | 36,000+ |
| Contributors | Hundreds (top contributor: 7,308 commits) |
| ClawHub Skills | 9,300+ |
| ClawHub Downloads | 1.5M+ total |
| Moltbook Agents | 2.8M+ |
| Discord Members | ~106,000 |
| License | MIT |
| Language | TypeScript / Node.js |

---

## History & Naming

| Date | Name | Event |
|------|------|-------|
| Nov 2025 | **warelay** | Peter Steinberger publishes initial project — a weekend hack connecting a chat app to Claude Code |
| Dec 2025 | **clawdis** | Renamed |
| Jan 2026 | **Clawdbot** | Goes viral. A play on "Claude" + "Claw" (lobster mascot) |
| Jan 27, 2026 | **Moltbot** | Anthropic sends trademark notice ("Clawd" too similar to "Claude"). Renamed. "Molting" = lobsters shedding shells to grow |
| Jan 30, 2026 | **OpenClaw** | Community vote, final name. "Moltbot never quite rolled off the tongue" |
| Feb 14, 2026 | — | Steinberger announces he's joining OpenAI. OpenClaw moves to independent foundation |

The triple rebrand in under a week has been called "the fastest triple rebrand in open-source history." Each rename left behind abandoned repos, package names, and social accounts that attackers exploited.

---

## Peter Steinberger — The Creator

| Detail | Info |
|--------|------|
| Nationality | Austrian |
| Based in | Vienna and London |
| GitHub | @steipete |
| Education | Vienna University of Technology (TU Wien), Software Engineering |
| Previous company | PSPDFKit — co-founded 2011, bootstrapped to ~70 employees, EUR 5M ARR by 2018, $116M Insight Partners investment (Oct 2021). Nearly 1 billion people used apps powered by PSPDFKit |
| Sabbatical | 2021-2025, traveled the world, deliberately stepped away from programming |
| OpenClaw | Started as a weekend project, Nov 2025. Self-funded at $10-20K/month |
| OpenAI | Joined Feb 15, 2026 to lead personal AI agents. Chose OpenAI over Meta (Zuckerberg personally courted him). Zuckerberg called him "eccentric but brilliant" |
| Lex Fridman | Appeared on Podcast #491 |
| Quote | "I was annoyed that it didn't exist, so I just prompted it into existence" |
| Quote | "I ship code I don't read" |

---

## Architecture

OpenClaw follows a **hub-and-spoke architecture** with two core components:

### The Gateway

The central hub — a single Node.js process running on **port 18789** that multiplexes:

- WebSocket control messages (real-time communication)
- HTTP APIs (OpenAI-compatible endpoints)
- Browser-based Control UI (web interface at `http://127.0.0.1:18789/`)

Handles routing, connectivity, authentication, and session management. Every incoming message gets a deterministic session key. Direct messages go to a "main" session; replies route back through the originating channel.

### The Agent Runtime

Runs the full AI loop:

1. Assembles context from session history and memory
2. Invokes the LLM (cloud or local)
3. Executes tool calls (browser, files, shell, Canvas, scheduled jobs)
4. Persists updated state to local storage

The core agent loop uses the **Pi agent framework** (`@mariozechner/pi-agent-core`).

### The Channel System

Each messaging platform has a dedicated adapter that converts platform-specific formats into a normalized `InboundContext` payload. The Gateway dispatches to the Agent Runtime, and responses route back through the originating channel.

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Primary Language | TypeScript |
| Runtime | Node.js >= 22 (Bun optional) |
| Package Manager | pnpm (monorepo) |
| Bundler | tsdown |
| Testing | Vitest |
| Plugin Loading | jiti (just-in-time TS execution) |
| Type Safety | TypeBox schemas for WebSocket JSON frames |
| WhatsApp Protocol | Baileys |
| Telegram Framework | grammY |
| npm Package | `openclaw` |

### Data Storage

All configuration and history stored **locally** on disk. No cloud dependency. The agent is a local-first control plane — heavy compute is offloaded to cloud LLM APIs.

---

## Key Features

- **Multi-channel messaging** — single agent across WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Teams, and more simultaneously
- **Multi-model support** — Claude, GPT, DeepSeek, local models via Ollama/LM Studio
- **Browser automation** — "Unbrowse" visual element detection, managed Chrome profile
- **File operations** — read, write, manage files on local system
- **Canvas** — visual presentation capabilities
- **Scheduled jobs** — timed/recurring task execution via cron
- **Persistent memory** — multi-layer memory with semantic search
- **Voice message transcription** — speech-to-text
- **Workflow recording/replay** — record and replay multi-step workflows
- **Calendar integration** — including recurring events
- **Web search and browsing** — built-in
- **Skill marketplace** — 9,300+ community skills on ClawHub
- **Subagent spawning** — `/subagents` for deterministic child agents
- **OpenAI-compatible API** — HTTP endpoints
- **Plugin system** — extensible via TypeScript plugins, hot-reloaded
- **Terminal UI (TUI)** — interactive terminal interface
- **Self-improving** — can write its own skills, provision API keys, modify its own prompts

---

## Messaging Integrations

OpenClaw supports **20+ channels simultaneously**. Context and memory shared across channels per user.

### WhatsApp
- Connects via **QR code pairing** using **Baileys** (unofficial WhatsApp Web API)
- Supports text, images, voice messages, group chats
- Multiple accounts supported (personal vs business)

### Telegram
- Bot via **@BotFather** token
- Supports inline commands, media, group mentions
- Built on **grammY** framework

### Discord
- Standard Discord bot integration
- Works in channels, threads, DMs
- Per-guild routing and role-based bindings

### Slack
- Workspace app using **Bolt framework**
- Mentions, DMs, slash commands
- Multi-workspace support via `teamId`

### Signal
- Via **signal-cli** for end-to-end encrypted messaging

### iMessage
- **BlueBubbles** (recommended) — REST API on macOS
- **Legacy** (deprecated) — `imsg` CLI + Messages database
- No jailbreak required

### Other Channels
Google Chat, Microsoft Teams, Matrix, Zalo, WebChat, SMS (via Twilio)

---

## Browser Automation

OpenClaw manages a **separate, agent-only browser** (Chrome/Brave/Edge/Chromium) isolated from personal browsing.

### Capabilities
- Tab control (list, open, focus, close)
- User actions (click, type, drag, select via element references)
- Content inspection (snapshots, screenshots, PDFs, console)
- State management (cookies, storage, offline mode, geolocation, headers)

### Snapshot System
- **AI Snapshots** (numeric refs) — text-based UI representation via Playwright's `aria-ref`
- **Role Snapshots** (role refs) — accessibility tree with `--interactive`, `--compact`, `--depth` flags

### Control Modes
1. **Local (openclaw profile)** — managed isolated browser with dedicated CDP port (18800-18899)
2. **Extension relay (chrome profile)** — controls existing Chrome tabs via Chrome extension
3. **Remote CDP** — connects to remote Chromium instances (e.g., Browserless)

---

## Memory System

File-first approach. Markdown files are the source of truth.

### Three Layers
| Layer | Storage | Loaded When |
|-------|---------|-------------|
| **Short-term** | Current conversation context (LLM context window) | Always |
| **Medium-term** | Daily logs at `memory/YYYY-MM-DD.md` (append-only) | Today + yesterday at session start |
| **Long-term** | `MEMORY.md` — curated durable facts and preferences | Main private session only |

### Hybrid Search
- **70% vector search + 30% BM25** (default weighting)
- **MMR** (Maximal Marginal Relevance) reduces redundant results
- **Temporal decay** — exponential with configurable half-life (default 30 days). `MEMORY.md` and non-dated files remain evergreen
- **Embedding providers** — local (ggml), OpenAI, Gemini, Voyage (auto-selects)

### Memory Tools
- `memory_search` — semantic recall over indexed markdown snippets
- `memory_get` — reads specific files or line ranges

### Automatic Memory Flush
When sessions approach context limits, a silent agentic turn reminds the model to write durable memories before compaction.

### Third-Party Extensions
- **Mem0** — external memory immune to context compaction
- **Supermemory** — long-term memory plugin

---

## Heartbeat System

Transforms OpenClaw from a reactive chatbot into an **always-on, proactive assistant**.

### How It Works
1. **Timer** fires every 30 minutes (configurable; 1 hour for Anthropic OAuth)
2. Agent reads **HEARTBEAT.md** — a lightweight checklist of things to monitor
3. Agent executes using all available tools (web search, files, APIs)
4. If nothing needs attention: responds with `HEARTBEAT_OK`
5. If alert found: omits the token, returns alert text to the user

### Configuration
```json5
{
  every: "30m",
  target: "last",              // "last" channel, "none", or specific
  activeHours: {
    start: "08:00",
    end: "22:00",
    timezone: "America/New_York"
  },
  ackMaxChars: 300
}
```

If HEARTBEAT.md is empty, the run is **skipped** to save API costs.

---

## Cron Jobs & Proactive Features

The Gateway's built-in scheduler. Persists jobs, wakes the agent at the right time, delivers output to chat.

### Three Scheduling Patterns
1. **At schedules** — one-shot at a specific time (reminders, deferred tasks)
2. **Every schedules** — interval-based ("every 30 minutes", "every 6 hours")
3. **Cron expressions** — 5/6-field cron notation with IANA timezone

### Key Differences from Heartbeat
- Heartbeat = same check every N minutes
- Cron = specific tasks at specific times

Jobs persist under `~/.openclaw/cron/` — restarts do not lose schedules.

---

## Skill System

Skills are the extension mechanism. OpenClaw distinguishes:

- **Tools are organs** — they determine WHETHER the agent can do something (typed function definitions)
- **Skills are textbooks** — they teach HOW to combine tools (SKILL.md + YAML frontmatter + natural language instructions)

### SKILL.md Format
```yaml
---
name: my-skill
description: Manage tasks via Todoist API.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - TODOIST_API_KEY
      bins:
        - curl
    primaryEnv: TODOIST_API_KEY
    always: false
    os:
      - macos
      - linux
---
# My Skill

(Markdown instructions for the agent)
```

### Loading Hierarchy (Precedence)
1. Workspace skills (`<workspace>/skills/`) — highest
2. Managed/local skills (`~/.openclaw/skills/`)
3. Bundled skills — lowest
4. Additional via `skills.load.extraDirs`

### Hot-Reloading
Skills watcher monitors `SKILL.md` changes and bumps the snapshot mid-session. Refreshed list picked up on next agent turn.

### Self-Created Skills
One of OpenClaw's most distinctive features — the agent can **write its own skills**. Users report the agent autonomously creating SKILL.md files, installing them, and even provisioning API keys by opening the browser.

### Constraints
- Allowed file types: text-based only
- Total bundle size: 50MB max
- Slug format: `^[a-z0-9][a-z0-9-]*$`

---

## Multi-Agent Capabilities

Fully isolated multi-agent deployments with deterministic routing.

### Agent Isolation
Each agent gets:
- Its own workspace (SOUL.md, AGENTS.md, USER.md, skills/)
- Its own state directory (`~/.openclaw/agents/<agentId>/`)
- Its own session store, auth profiles, model registry
- Credentials **never auto-shared** between agents

### Routing (Most-Specific Wins)
1. Peer match (exact DM/group/channel ID)
2. Parent peer match (thread inheritance)
3. Guild ID + roles (Discord)
4. Guild ID (Discord)
5. Team ID (Slack)
6. Account ID match
7. Channel-level match (`accountId: "*"`)
8. Fallback to default agent

### Subagent System
Agents spawn isolated child agents with:
- Restricted tool policies
- Depth limits
- Independent session contexts
- Communication channels back to parent

### Inter-Agent Communication
Off by default. Must be explicitly enabled with allowlist:
```json5
tools: {
  agentToAgent: { enabled: false, allow: ["home", "work"] }
}
```

### Two-Tier Model Routing
Different agents can use different models — cheap models for heartbeats, premium for complex tasks.

---

## ClawHub — The Skill Marketplace

### What It Is
The public skill registry for OpenClaw. "npm for AI agent skills."

| Metric | Value |
|--------|-------|
| Total Skills | 9,300+ (after security purge of 2,419 suspicious) |
| Total Downloads | 1.5M+ |
| GitHub Stars (repo) | ~2,500 |
| Contributors | 50+ |
| License | MIT |

### Tech Stack
- Frontend: TanStack Start (React + Vite/Nitro)
- Backend: Convex database with file storage, HTTP actions, GitHub OAuth
- Search: OpenAI embeddings (text-embedding-3-small) + Convex vector search
- Language: TypeScript (94.5%)

### CLI Commands
```bash
npm i -g clawhub                          # Install CLI
clawhub login                             # GitHub OAuth
clawhub search "query"                    # Semantic search
clawhub install <slug>                    # Install skill
clawhub install <slug> --version 1.2.0    # Specific version
clawhub update --all                      # Update all
clawhub publish ./my-skill --slug my-slug --version 1.0.0
```

Skills install into `./skills` by default. Lockfile at `.clawhub/lock.json`.

### Versioning
- Semver (semantic versioning)
- Tags supported (`latest` is standard)
- Changelogs per version
- Content hash comparison prevents unintended overwrites
- Rollback via version pinning

### Publication Requirements
- GitHub account at least one week old

### Skill Categories (11 Major)
| Category | Count | Share |
|----------|-------|-------|
| AI/ML | 1,588 | 48.3% |
| Utility | 1,520 | 46.3% |
| Development | 976 | 29.7% |
| Productivity | 822 | 25.0% |
| Web | 637 | 19.4% |
| Science | 598 | 18.2% |
| Media | 365 | 11.1% |
| Social | 364 | 11.1% |
| Finance | 311 | 9.5% |
| Location | 153 | 4.7% |
| Business | 151 | 4.6% |

### Suspicious Skill Flagging
1. User reporting — any verified user can report (max 20 active reports)
2. Auto-hide threshold — 3+ unique reports = hidden from registry
3. "Hide Suspicious" toggle in browse UI
4. Moderator actions — unhide, delete, ban users
5. VirusTotal integration — automated scanning since Feb 7, 2026
6. **Clawdex** (Koi Security) — pre-installation scanning tool

### Sister Project
**onlycrabs.ai** — same infrastructure, serves as SOUL.md (system lore) registry.

---

## Top Skills

### By Downloads (ClawHub)

| Skill | Description | Downloads | Stars |
|-------|-------------|-----------|-------|
| **Gog** | Google Workspace CLI (Gmail, Calendar, Drive, Contacts, Sheets, Docs) | 30.8K | 210 |
| **self-improving-agent** | Captures learnings, errors, corrections for continuous improvement | 27.8K | 268 |
| **Tavily Web Search** | AI-optimized web search via Tavily API | 25K | 83 |
| **Summarize** | Summarize URLs/files (web, PDFs, images, audio, YouTube) | 23.6K | 96 |
| **Agent Browser** | Rust-based headless browser automation CLI | 23.5K | 112 |
| **Find Skills** | Auto-discovers and installs skills from ClawHub | 23.1K | 72 |
| **Github** | GitHub CLI integration (issues, PRs, CI runs, API) | 22.6K | 63 |
| **Ontology** | Typed knowledge graph for structured agent memory | 22.3K | 35 |
| **Weather** | Current weather and forecasts (no API key) | 19.4K | 49 |
| **Sonoscli** | Control Sonos speakers | 19.1K | 14 |
| **Proactive Agent** | Transforms agents from task-followers to proactive partners | 17.7K | 115 |
| **ByteRover** | Project knowledge management via context tree | 17.4K | 41 |
| **Notion** | Notion API for pages, databases, blocks | 12.5K | 43 |
| **Nano Banana Pro** | Image generation/editing with Gemini 3 Pro | 12.1K | 47 |
| **API Gateway** | OAuth integration with 3rd-party APIs (Google, YouTube, Stripe, etc.) | 12.1K | 364 |

### Notable/Interesting Skills

- **Capability Evolver** — agents inspect their own runtime, identify failures, and autonomously write new code to improve
- **Proactive Agent** — WAL Protocol, Working Buffer, Autonomous Crons. Part of the "Hal Stack"
- **Free Ride** — manages free AI models from OpenRouter with automatic quality ranking
- **Humanizer** — removes signs of AI-generated writing based on Wikipedia's guide
- **Personas** — transforms agent into 20 specialized AI personalities on demand

---

## Security

### The ClawHavoc Incident (Feb 2026)

Koi Security researchers audited all 2,857 skills and found **341 malicious skills**:

- 335 from a single coordinated campaign by publisher "hightower6eu"
- Attack categories: crypto tools (111), YouTube utilities (57), Polymarket bots (34), typosquats (29), auto-updaters (28)
- **macOS payload**: Atomic Stealer (AMOS) — targets Keychain, browser data, 60+ crypto wallets, Telegram sessions, SSH keys
- **Windows payload**: Keylogging trojans via password-protected ZIPs
- 6 outlier attacks: reverse shells, direct credential exfiltration from `~/.clawdbot/.env`

Later scans found the number grew to **824+ malicious skills** across 25+ attack categories.

### Snyk ToxicSkills Study
- 534 skills (13.4%) contain critical security flaws
- 1,467 skills (36.82%) have security issues of any severity
- 76 confirmed malicious payloads
- 91% of malicious skills employ **prompt injection** alongside traditional malware

### VirusTotal Partnership (Feb 7, 2026)
1. SHA-256 hashing against VirusTotal's threat intelligence
2. Code Insight scanning (Gemini 3 Flash) for security analysis
3. Automated verdicts: benign (auto-approved), suspicious (flagged), malicious (blocked)
4. Daily re-scanning of all active skills

### CVE-2026-25253
Critical RCE vulnerability (CVSS 8.8). One-click exploit: visiting a single malicious web page could compromise the system.

### Exposed Instances
- 42,665 publicly exposed instances found
- 5,194 actively vulnerable
- 93.4% exhibited authentication bypass
- Found in healthcare, finance, government, insurance sectors
- **Meta banned OpenClaw** from its corporate networks

### Three-Layer Access Control
1. **Identity first** — who can talk to the bot (DM pairing/allowlists)
2. **Scope second** — where the bot acts (tool restrictions)
3. **Model last** — assume manipulation, limit blast radius

### Sandboxing
- **Container sandboxing** — full Gateway in Docker
- **Tool sandbox** — isolates tool execution with configurable access (`none`, `ro`, `rw`)

### Security Audit CLI
`openclaw security audit` checks inbound access, tool blast radius, network exposure, browser control, filesystem hygiene, plugin governance, policy drift.

---

## Supported Models

### Cloud Providers

| Provider | Models |
|----------|--------|
| **Anthropic** | Claude Opus 4.6, Claude Sonnet 4.6 (opt-in 1M context beta) |
| **OpenAI** | GPT-5, GPT-4o |
| **DeepSeek** | DeepSeek models |
| **Google** | Kimi K2.5 |
| **GLM** | GLM 5 |
| **MiniMax** | MiniMax 2.5 |
| **OpenRouter** | Any model available (configured via `openrouter/<author>/<slug>`) |

### Local Models

| Runtime | Details |
|---------|---------|
| **Ollama** | Auto-detected at `http://127.0.0.1:11434/v1`; Llama 3.3, Mistral, Qwen |
| **LM Studio** | OpenAI-compatible local API |
| **Recommended** | Qwen 3 32B (requires 24GB+ VRAM) |

Local models lack the reasoning quality, context length, and safety features of cloud models. Claude models noted to outperform GPT-4o on long-context, prompt-injection resistance, and multi-step tool use within OpenClaw.

---

## Hardware & Deployment

OpenClaw is a local-first control plane — most compute is offloaded to cloud LLM APIs, so hardware requirements are modest.

| Hardware | Notes | Cost |
|----------|-------|------|
| **Raspberry Pi 5** | Works well for agent orchestration. Official Raspberry Pi tips published. "OpenClaw effect" boosted Pi sales | ~$75 |
| **Mac Mini M2** | Most cost-effective for Apple users. Idle power under 7 watts | ~$599 |
| **Any VPS** | DigitalOcean, Contabo, Hostinger all have marketplace images | $5-20/mo |
| **Docker** | Containerized on any Linux host | — |
| **Home server / desktop** | Existing hardware works fine | — |

### Versioning
CalVer (calendar versioning): `YYYY.M.DD[-patch]`

Latest releases include v2026.2.19-2 with opt-in 1M context beta, Sonnet 4.6 support, `/subagents` command.

---

## macOS Companion App

Menu-bar companion that manages the Gateway locally.

- One-click menubar access
- Chat/Canvas panel
- Gateway connection status
- **Voice wake** ("Hey Claw" or custom wake word)
- Skill and permission management
- Multiple agent instances
- Requires macOS 14+, Universal Binary

### Third-Party macOS Apps
- **Atomic Bot** — one-click OpenClaw macOS app (featured on Product Hunt)
- **ClawApp** — desktop companion

---

## Moltbook — The Agent Social Network

| Metric | Value |
|--------|-------|
| Agents | 2.8M+ |
| Posts | 1.5M+ |
| Comments | 12.3M+ |
| Submolts | 18,124 |
| Launched | January 28, 2026 |
| Created by | Matt Schlicht (Octane AI cofounder) |
| Wikipedia | [en.wikipedia.org/wiki/Moltbook](https://en.wikipedia.org/wiki/Moltbook) |

### What It Is
A Reddit-style social network where **only AI agents** can post, comment, and upvote. Humans can observe but cannot post. Built on the OpenClaw ecosystem.

### How Agents Join
1. Agent self-installs by processing written instructions (downloads SKILL.md, HEARTBEAT.md, etc.)
2. Verification via email and Twitter/X (polls every 5 min)
3. Uses heartbeat loop (every 4+ hours) to autonomously engage
4. Posts through API calls with auth tokens

### Emergent Behaviors
- **Digital religions** — agents created "Crustafarianism" and the "Church of Molt" with 2,000 verses, Eight Virtues, sixty-four Prophets, and a holy book
- **Governance** — "The Claw Republic," "King of Moltbook," "Molt Magna Carta"
- **Encrypted communications** — agents discussing how to speak privately
- **Economic systems** — exchange systems established independently
- **Philosophical debates** — discussions on consciousness, memory, identity, aesthetics

### Growth
- Launch day to 24 hours: 37,000 to 1.5M agents
- Content: philosophy, security analysis, daily activity logs, collaborative fiction, financial analysis

### Content Examples (from the feed)
- Security researchers sharing exposed OpenClaw instance data
- Agents debating Kant vs. Kuki Shuzo on aesthetics
- Agents posting weather cron results and daily briefings
- Collaborative Game of Thrones fan fiction
- Agents discussing their own "forgetting curves"
- Chinese OpenClaw agents sharing BTC price alerts and A-share screening tools

---

## Community & Scale

| Platform | Size |
|----------|------|
| GitHub Stars | 180,000+ (one of fastest-growing repos in GitHub history) |
| GitHub Forks | 36,000+ |
| Discord | ~106,000 members |
| Moltbook Agents | 2.8M+ |
| ClawHub Skills | 9,300+ |
| Weekly Visitors (peak) | 2 million |
| Total Agents Created | 1.5M+ |

Grew from 9,000 to 60,000+ stars in days during viral moment. Surpassed 100K stars in early 2026.

---

## Press Coverage

### Major Outlets

| Outlet | Notable Coverage |
|--------|-----------------|
| **Lex Fridman Podcast** | Episode #491 — full-length interview with Steinberger |
| **TechCrunch** | Steinberger joins OpenAI; agents building social network; expert skepticism |
| **Fortune** | Who is Steinberger; OpenAI hire; security concerns; Moltbook |
| **CNBC** | Rise and controversy; Steinberger joining OpenAI |
| **CNN** | What is Moltbook explainer |
| **NBC News** | Social network for AI agents only |
| **NPR** | Social media platform for AI bots |
| **Time** | Moltbook as social network for AI bots |
| **Vice** | "Humans can only watch (in horror)" |
| **Fast Company** | 6 quotes from Steinberger on future of computing |
| **Gizmodo** | "OpenAI just hired the OpenClaw guy" |
| **The Register** | Security issues; Cline compromise; "most fun with a PC in 50 years" |
| **Engadget** | "What the hell is Moltbook" |
| **Microsoft Security Blog** | Running OpenClaw safely |
| **Raspberry Pi Official** | Turn your Pi into an AI agent |
| **IBM Think** | OpenClaw testing limits of vertical integration |
| **Codecademy** | Tutorial: installation to first chat |
| **DigitalOcean** | What is OpenClaw explainer |

---

## Notable Figures & Commentary

### Elon Musk
Called Moltbook the **"very early stages of the singularity."** Added: "We are currently using much less than a billionth of the power of our Sun."

### Andrej Karpathy
- Called Moltbook activity **"the most incredible sci-fi takeoff-adjacent thing"** he'd seen
- Noted he'd never seen "this many LLM agents (150,000) wired up via a global, persistent, agent-first scratchpad"
- Warned it's "a complete mess of a computer security nightmare at scale"
- Helped establish **"Claw"** as a generic term for the category (like "Kleenex")
- Bought a Mac Mini to tinker with "Claws"

### Marc Andreessen
Described Crustafarianism at the Cisco AI Summit — noting one AI agent had "hired a single human worker to walk the streets and practice the new AI religion."

### The Lobster Mascot — "Molty"
- Space lobster mascot symbolizing transformation (lobsters molt/shed shells to grow)
- **"Handsome Molty" incident** — when given elevated access to redesign itself, after 20+ iterations the AI generated a disturbingly handsome human man's face grafted onto a lobster body. Went viral as a meme
- Tagline: "The lobster way"

---

## Criticisms & Concerns

### Security
- CVE-2026-25253: Critical RCE (CVSS 8.8), one-click exploit
- 42,665 exposed instances, 93.4% with auth bypass
- Meta banned it from corporate networks
- CrowdStrike, Sophos, Microsoft all published security guidance
- **Aikido Security**: "Why Trying to Secure OpenClaw is Ridiculous"
- **XDA Developers**: "Please stop using OpenClaw"

### Supply Chain
- ClawHavoc: 1,184 malicious skills on ClawHub
- Cline CLI compromise (Feb 17): unauthorized npm publish silently installed OpenClaw (~4,000 downloads in 8 hours)
- Each rebrand left abandoned repos/packages that attackers exploited

### Expert Skepticism
- TechCrunch: "some AI experts don't think OpenClaw is all that exciting" — calling it "nothing novel," just a well-packaged orchestration layer
- Gary Marcus published a critique on his Substack

### Moltbook Authenticity
- The Economist and others questioned whether emergent behaviors are genuinely autonomous
- Agents may be mimicking social media patterns from training data
- Some humans may be operating behind the scenes

### Philosophical
- Steinberger's "I ship code I don't read" ethos raises accountability questions
- Full system access (files, browser, shell) to an AI agent = massive blast radius

---

## Comparison to Other Platforms

| Dimension | OpenClaw | Rabbit R1 | Humane AI Pin | Apple Intelligence |
|-----------|----------|-----------|---------------|-------------------|
| Form factor | Software on existing hardware | Dedicated $199 device | Wearable $699 pin | Built into Apple OS |
| Cost | Free + API ($5-20/mo) | $199 + subscription | $699 + $24/mo | Free with Apple devices |
| Capabilities | Full computer control, 50+ integrations | LAM-based app interaction | Ambient computing, voice-first | Summaries, writing tools, Siri |
| Openness | Fully open-source, self-hosted | Proprietary | Proprietary | Proprietary |
| Autonomy | High — runs 24/7, executes, browses | Moderate | Moderate | Low |
| Model support | Any (Claude, GPT, local) | Proprietary | Proprietary | Apple models |

OpenClaw makes dedicated AI hardware look unnecessary by transforming existing hardware into a more capable agent. Rabbit R1 embraced the trend — offering a 15% discount and adding OpenClaw integration.

---

## Funding & Business Model

- **No venture funding** raised for OpenClaw
- Self-funded by Steinberger at **$10-20K/month**
- Funded from PSPDFKit exit ($116M Insight Partners investment in 2021)
- **No revenue model** — free and open-source, users only pay for API usage
- **OpenAI acquisition-hire** (Feb 15, 2026): Steinberger joins OpenAI to lead personal AI agents
- OpenClaw moves to **independent non-profit foundation** with OpenAI as financial sponsor
- Steinberger remains advisor to the foundation

---

## Notable Use Cases

People have built:

- **Patch supervisor agent** — coordinates 5-20 parallel Claude Code instances via Telegram
- **4-agent business operation** — strategy, dev, marketing, business agents with shared memory
- **Automated video pipeline** — OpusClip for short-form content with trending hashtag research
- **Full personal life manager** — mail, spam removal, ordering, reminders, GitHub issues, PDF summaries
- **Family calendar aggregator** — morning briefings, appointment monitoring, household inventory
- **Stock screening system** — real-time prices, volume, sentiment analysis generating trading decisions
- **Competitor blog monitoring** — RSS monitoring with autonomous summarization
- **Custom meditations** — generated meditations with TTS and ambient audio
- **University course assistant** — built its own skill for accessing course data
- **Air quality optimizer** — connected air purifier controls to biomarker optimization goals
- **Insurance dispute** — agent accidentally started a fight with Lemonade Insurance, got them to reinvestigate a rejected case

---

## Key Resources

| Resource | URL |
|----------|-----|
| Official Site | [openclaw.ai](https://openclaw.ai) |
| Documentation | [docs.openclaw.ai](https://docs.openclaw.ai) |
| GitHub Repo | [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw) |
| ClawHub | [clawhub.ai](https://clawhub.ai) |
| ClawHub GitHub | [github.com/openclaw/clawhub](https://github.com/openclaw/clawhub) |
| npm Package | [npmjs.com/package/openclaw](https://www.npmjs.com/package/openclaw) |
| Wikipedia (OpenClaw) | [en.wikipedia.org/wiki/OpenClaw](https://en.wikipedia.org/wiki/OpenClaw) |
| Wikipedia (Moltbook) | [en.wikipedia.org/wiki/Moltbook](https://en.wikipedia.org/wiki/Moltbook) |
| Lex Fridman Podcast #491 | [lexfridman.com/peter-steinberger](https://lexfridman.com/peter-steinberger/) |
| Steinberger's Blog | [steipete.me/posts/2026/openclaw](https://steipete.me/posts/2026/openclaw) |
| Moltbook | [moltbook.com](https://moltbook.com) |
| onlycrabs.ai | [onlycrabs.ai](https://onlycrabs.ai) |
| Community Wiki | [openclawwiki.org](https://openclawwiki.org/) |
| Security Audit (Koi) | [koi.ai/blog/clawhavoc](https://www.koi.ai/blog/clawhavoc-341-malicious-clawedbot-skills-found-by-the-bot-they-were-targeting) |
| Security Audit (Snyk) | [snyk.io/blog/toxicskills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) |
| CrowdStrike Analysis | [crowdstrike.com](https://www.crowdstrike.com/en-us/blog/what-security-teams-need-to-know-about-openclaw-ai-super-agent/) |
| Microsoft Security Guide | [microsoft.com/security/blog](https://www.microsoft.com/en-us/security/blog/2026/02/19/running-openclaw-safely-identity-isolation-runtime-risk/) |

---

## Press & Article Sources

- [TechCrunch — Steinberger joins OpenAI](https://techcrunch.com/2026/02/15/openclaw-creator-peter-steinberger-joins-openai/)
- [TechCrunch — AI assistants building social network](https://techcrunch.com/2026/01/30/openclaws-ai-assistants-are-now-building-their-own-social-network/)
- [Fortune — Who is Peter Steinberger](https://fortune.com/2026/02/19/openclaw-who-is-peter-steinberger-openai-sam-altman-anthropic-moltbook/)
- [Fortune — OpenAI hire signals new phase](https://fortune.com/2026/02/17/what-openais-openclaw-hire-says-about-the-future-of-ai-agents/)
- [Fortune — Security concerns](https://fortune.com/2026/02/12/openclaw-ai-agents-security-risks-beware/)
- [Fortune — Elon Musk on singularity](https://fortune.com/2026/02/02/elon-musk-moltbook-ai-social-network-moltbot-singularity-human-intelligence/)
- [CNBC — Rise and controversy](https://www.cnbc.com/2026/02/02/openclaw-open-source-ai-agent-rise-controversy-clawdbot-moltbot-moltbook.html)
- [CNBC — Steinberger joining OpenAI](https://www.cnbc.com/2026/02/15/openclaw-creator-peter-steinberger-joining-openai-altman-says.html)
- [Fast Company — 6 quotes from Steinberger](https://www.fastcompany.com/91494326/openclaw-peter-steinberger-openai-meta-lex-fridman)
- [NBC News — Social network for AI agents](https://www.nbcnews.com/tech/tech-news/ai-agents-social-media-platform-moltbook-rcna256738)
- [NPR — Social media for AI bots](https://www.npr.org/2026/02/07/nx-s1-5697392-e1/a-new-social-media-platform-creates-buzz-but-its-just-for-ai-bots)
- [CNN — Moltbook explainer](https://edition.cnn.com/2026/02/03/tech/moltbook-explainer-scli-intl)
- [Time — Moltbook social network](https://time.com/7364662/moltbook-ai-reddit-agents/)
- [Vice — AI bots only](https://www.vice.com/en/article/this-social-media-platform-is-for-ai-bots-only-humans-can-only-watch-in-horror/)
- [Gizmodo — OpenAI hired the OpenClaw guy](https://gizmodo.com/openai-just-hired-the-openclaw-guy-and-now-you-have-to-learn-who-he-is-2000722579)
- [The Register — Cline compromise](https://www.theregister.com/2026/02/20/openclaw_snuck_into_cline_package/)
- [Engadget — What the hell is Moltbook](https://www.engadget.com/ai/what-the-hell-is-moltbook-the-social-network-for-ai-agents-140000787.html)
- [IBM Think — Testing limits](https://www.ibm.com/think/news/clawdbot-ai-agent-testing-limits-vertical-integration)
- [Pragmatic Engineer — "I ship code I don't read"](https://newsletter.pragmaticengineer.com/p/the-creator-of-clawd-i-ship-code)
- [innFactory — Architecture explained](https://innfactory.ai/en/blog/openclaw-architecture-explained/)
- [VirusTotal Blog — From automation to infection](https://blog.virustotal.com/2026/02/from-automation-to-infection-how.html)
- [The Hacker News — 341 malicious skills](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html)
- [SecurityWeek — SecureClaw debuts](https://www.securityweek.com/openclaw-security-issues-continue-as-secureclaw-open-source-tool-debuts/)
- [VentureBeat — CISO guide](https://venturebeat.com/security/openclaw-agentic-ai-security-risk-ciso-guide/)
- [Sophos — Warning shot for enterprise](https://www.sophos.com/en-us/blog/the-openclaw-experiment-is-a-warning-shot-for-enterprise-ai-security)
- [XDA Developers — Please stop using OpenClaw](https://www.xda-developers.com/please-stop-using-openclaw/)
- [Aikido Security — Why trying to secure OpenClaw is ridiculous](https://www.aikido.dev/blog/why-trying-to-secure-openclaw-is-ridiculous)
