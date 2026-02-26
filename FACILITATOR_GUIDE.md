# AI Coding CTF - Facilitator Guide

## Pre-Event Checklist (1 week before)

- [ ] **Leaderboard platform deployed** — Vercel or local machine ready
- [ ] **Challenge repo accessible** — Participants can clone `https://github.com/ho0haha/2026-offsite-ai-challenges`
- [ ] **Claude API key generated** — For challenges 8 & 9 (shared key, set spend limit)
- [ ] **Test run completed** — Full dry-run with 2-3 test users
- [ ] **Projector/big screen** ready for `/leaderboard` view
- [ ] **WiFi confirmed** — All participants can reach the platform + GitHub

## Pre-Event Checklist (Morning of)

- [ ] Seed the database: `npm run db:seed`
- [ ] Start the platform: `npm run dev` (or verify Vercel deployment)
- [ ] Open `/admin` — confirm event is **Active** with join code **YUMCTF**
- [ ] Open `/leaderboard` on the projector screen
- [ ] Verify join flow: go to `/` on your phone, enter name + YUMCTF, see challenges
- [ ] Have the Claude API key ready to share: `export ANTHROPIC_API_KEY=sk-ant-...`
- [ ] Print or project the WiFi credentials

## Event Day Schedule

| Time | Activity | Facilitator Action |
|------|----------|--------------------|
| 0:00 | **Kickoff** | Welcome, explain rules, show leaderboard on projector, share join code |
| 0:10 | **Tool Setup** | Help anyone who needs Python, Cursor, or Claude Code installed |
| 0:20 | **Warm-Up** | Everyone does Challenge 1 (Cursor) and Challenge 2 (Claude Code) |
| 0:40 | **Main Competition** | Open challenge board. Walk around, help with setup issues only |
| 2:40 | **Last Call** | "10 minutes left!" - dramatic leaderboard check |
| 2:50 | **Awards & Discussion** | Announce top 3, run tool comparison discussion |
| 3:10 | **Done** | |

## Kickoff Script (~10 min)

> Welcome to the AI Coding CTF! Today you'll compete in a capture-the-flag challenge
> using two AI coding tools: **Cursor** and **Claude Code**.
>
> **How it works:**
> 1. Join at [platform URL] with code **YUMCTF**
> 2. Each challenge gives you starter code on GitHub — clone, solve, get a flag
> 3. Submit flags on the leaderboard for points
> 4. Each challenge tells you which tool to use (Cursor or Claude Code)
>
> **Rules:**
> - Each flag can only be submitted once per person (no double-dipping)
> - The leaderboard updates in real-time on the big screen
> - Start with the two warm-up challenges, then choose your own path
> - Harder challenges = more points. Nobody finishes everything. Pick your battles.
>
> **Setup:** Clone the challenge repo:
> ```
> git clone https://github.com/ho0haha/2026-offsite-ai-challenges
> ```
>
> Let's start with the warm-ups! You have 20 minutes.

## Starting the Timer

1. Go to `/admin`
2. Set timer to **120** minutes (for the main competition phase)
3. Click "Start Timer"
4. The countdown appears on `/leaderboard`

## Challenge Quick Reference (for facilitators)

| # | Challenge | Flag | Common Issues |
|---|-----------|------|---------------|
| 1 | Hello AI | `FLAG{hello_ai_w3lc0me_2_th3_ctf}` | Participants may struggle with edge cases in `parse_order` |
| 2 | Bug Squash | `FLAG{bug_squash_d3bugg1ng_pr0}` | Must run `python buggy_script.py` not pytest |
| 3 | Broken Orders | `FLAG{broken_orders_5_bugs_fixed}` | Need FastAPI installed: `pip install -r requirements.txt` |
| 4 | Production Incident | `FLAG{production_incident_r00t_caus3}` | Look for connection pool leak in server.py |
| 5 | Spaghetti Untangler | `FLAG{spaghetti_untangled_cl34n_c0de}` | Must pass both behavior AND structural tests |
| 6 | Test Factory | `FLAG{test_factory_90_percent_c0v3rag3}` | Need `pytest-cov` installed |
| 7 | Spec Builder | `FLAG{spec_builder_prd_2_pr0duct}` | Two phases: PRD first, then implementation |
| 8 | AI Menu Assistant | `FLAG{ai_menu_assistant_8_of_10}` | Needs ANTHROPIC_API_KEY env var |
| 9 | Smart Feedback Sorter | `FLAG{smart_sorter_85_percent_acc}` | Needs ANTHROPIC_API_KEY env var |
| 10 | Context is King | `FLAG{context_is_king_l0yalty_p0ints}` | Must modify 6 files in the restaurant system |
| 11 | Prompt Craftsman | `FLAG{prompt_craftsman_5_for_5}` | Save outputs to `outputs/output1.md` through `output5.md` |
| 12 | Full Stack Sprint | `FLAG{full_stack_sprint_st0re_l0cat0r}` | Build from scratch - most ambitious challenge |

## Sharing the Claude API Key

For challenges 8 and 9, participants need a Claude API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXX
```

**Tip:** Project this on screen or share via a private Slack channel. Set a spend limit on the key beforehand.

## Manual Point Overrides

If you need to award/deduct points manually:
1. Go to `/admin` → Participants tab
2. Select participant, enter points (+/-), add a reason
3. Click "Apply"

## Tool Comparison Discussion (~15 min)

After awards, facilitate a structured discussion:

**Paired comparisons:**
- Debugging: Cursor (#3) vs Claude Code (#4) — "Which felt faster?"
- Refactoring: Cursor (#5) vs Claude Code (#6) — "Which approach was more natural?"
- Claude API: Cursor (#8) vs Claude Code (#9) — "IDE vs CLI for API work?"

**Discussion prompts:**
- "I'd reach for Cursor when..."
- "I'd reach for Claude Code when..."
- "What surprised you about the assigned tool?"
- "How would you use these tools in your day-to-day work?"

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't join event | Check join code is YUMCTF (case insensitive). Check event is Active in admin. |
| Leaderboard not updating | Refresh the page. Check SSE connection (green dot = connected). |
| Python not installed | `brew install python` (Mac) or download from python.org (Windows) |
| pip install fails | Try `pip3 install` or `python -m pip install` |
| Cursor not generating code | Make sure Cursor has AI features enabled in settings |
| Claude Code not working | Run `claude` in terminal to verify installation |
| Challenge tests failing unexpectedly | Make sure they're in the right directory and deps are installed |
| API key not working | Verify env var: `echo $ANTHROPIC_API_KEY` |

## Platform Admin URLs

- **Join page:** `/`
- **Challenge board:** `/challenges`
- **Leaderboard (projector):** `/leaderboard`
- **Admin dashboard:** `/admin`
