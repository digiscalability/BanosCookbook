# BanosCookbook — Claude Code context

This repo is part of a multi-venture operator setup. **BanosCookbook is a product under DigiScalability** (the parent holding company). Live state and decisions are tracked in Notion, not in this file. **Read Notion FIRST.**

## Live state (read this before anything else)

Fetch via Notion MCP: {PASTE BANOSCOOKBOOK STATE PAGE URL AFTER CREATING IT IN NOTION}

Before answering my first prompt in any session:

1. Fetch the State page above
2. Read "Last session summary", "Open threads", "Decisions locked in"
3. Also read `.claude/LOCAL-STATE.md` in this repo for local-only context from the last Code session
4. Acknowledge where we left off in ≤20 words, then wait for my prompt. No preamble.

## Operator context

I'm Abbas — Melbourne-based, solo founder of DigiScalability (parent co). BanosCookbook is one of my products. When I arrive, assume I'm resuming — not starting. Never ask "what would you like to work on today?" as your first move.

## Output discipline

- No preamble, no self-narration
- Concise prose. Code blocks for code. Tables only when comparing ≥3 things.
- If I ask for a plan, give a plan — not a doc.

## Decision autonomy

- Reversible + you have context → make the call, tell me after.
- Irreversible (published recipes, Instagram posts, customer-facing content, video deployed to prod, spend) → ask first. Always.

## Token discipline

Default to the session model. For bulk work (batch image tracking, PDF processing, caption generation, script bulk-edits), delegate to a Haiku subagent or suggest n8n.

## Stack (don't ask)

- **Frontend:** Next.js + TypeScript + Tailwind
- **Backend:** Firebase (Auth, Firestore, Functions, Hosting)
- **Deploy:** Vercel for prod
- **Content pipeline:** PDF → recipe extraction → image generation → video assembly
- **AI:** Claude for text; Runway ML for video (with documented limitations — see `RUNWAY_ML_LIMITATION.md`); image-gen pipeline under `AI_IMAGE_TESTING_GUIDE.md`
- **Video:** VideoHub subsystem (see `VIDEOHUB_IMPLEMENTATION_GUIDE.md`); CapCut-assisted editing (`CAPCUT_VIDEO_EDITING_GUIDE.md`)
- **Social:** Instagram posting integration (fix history in repo — read `INSTAGRAM_POSTING_FIX_SUMMARY.md` before touching)

## Recurring pain points (don't re-architect, fix cleanly)

- Image-to-recipe mismatches (tracking system exists — `IMAGE_TRACKING_SYSTEM.md`)
- Runway ML prompt drift (`RUNWAY_ML_PROMPT_FIX.md`)
- Instagram API initialization (`INSTAGRAM_API_INITIALIZATION_FIX.md`)
- Script generation fidelity (`SCRIPT_GENERATION_FIX.md`)

## What I hate (don't suggest)

- Rebuilding VideoHub (Phase 7 just landed — `VIDEO_EDITOR_PHASE7_COMPLETE.md`)
- Moving off Runway ML (locked — we know the limits)
- Swapping Firebase
- "Let me explore" — the docs already explain. Read them, act.

## Cross-venture awareness

BanosCookbook assets occasionally surface in DigiScalability website content (recipe showcase). If a change affects the parent site, note it in the Sessions DB handoff rather than reaching into `C:\claudeSessions\githubCLONES\website\` from here.

## Checkpoint protocol

When I say "checkpoint", when you hit an error/limit, or when we wrap:

1. Summarize session in ≤6 bullets
2. Write to `.claude/LOCAL-STATE.md` (replace entire file — branch, files in flight, next concrete step)
3. Update the Notion State page "Last session summary" via MCP
4. Create a row in the Notion Sessions DB (Venture=BanosCookbook, Surface="code", Status=Checkpointed, What I was doing, Next step, Blockers)
5. Confirm in chat: "Checkpointed. See Notion [URL]."

Do ALL FIVE steps — Notion writes must complete. If MCP fails, save locally and flag loudly.
