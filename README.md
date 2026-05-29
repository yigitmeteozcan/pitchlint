# deckcheck

Lint your pitch deck before investors do.

A no-AI CLI that audits your fundraising packet for missing investor-critical info and generates an agent-readable sidecar (JSON + llms.txt + Markdown) for DocSend, data rooms, and AI/VC workflows.

```
npx deckcheck audit

  deckcheck audit

  ✓ company.one_liner
  ✓ fundraising.target_raise
  ✓ fundraising.use_of_funds
  ✓ links.demo
  ✓ links.contact
  ✓ team.background
  ✖ growth_rate has no time period — got "14%", expected e.g. "14% MoM"
  ⚠ ICP too vague: "startups" — add company-size / segment / urgency
  ⚠ market.market_size has no source — add market_size_source (e.g. "Gartner 2023")

  1 error, 2 warnings, 6 passed  (9 rules)

  Audit failed. Fix errors before sending to investors.
```

---

## Install

No install required. Just run:

```bash
npx deckcheck
```

Or install globally:

```bash
npm install -g deckcheck
```

---

## Quick start

```bash
# 1. Create a blank deck.yml in your current directory
npx deckcheck init

# 2. Fill it in, then audit
npx deckcheck audit

# 3. Generate the agent-readable sidecar
npx deckcheck build

# 4. See what a great deck.yml looks like
npx deckcheck example
```

---

## Commands

### `deckcheck init`
Creates `./deck.yml` from a blank template. Refuses to overwrite an existing file.

### `deckcheck audit`
Runs all rules against `deck.yml`. Prints grouped output:
- `✓` passes (green)
- `✖` errors (red) — each with a specific fix hint
- `⚠` warnings (yellow) — worth fixing before sending

**Exit code 1** if any `error`-severity rule fails. This makes it usable in CI and as a pre-send git hook.

### `deckcheck build`
Generates `./deck-agent/` with four files:

```
./deck-agent/
  llms.txt              ← LLM-ingestible summary (llms.txt convention)
  deck.json             ← Full structured object
  metrics.json          ← Flat traction/numeric facts only
  investor-summary.md   ← Human-readable one-pager
```

```
  deckcheck build ✓

  Generated files:
    ./deck-agent/llms.txt
    ./deck-agent/deck.json
    ./deck-agent/metrics.json
    ./deck-agent/investor-summary.md

  Publish hint:
    Deck: https://docsend.com/view/your-deck
    Agent-readable: https://yourco.com/deck-agent/llms.txt
```

Builds even if audit has errors so you can iterate freely.

### `deckcheck example`
Prints a fully-filled example `deck.yml` to stdout. Good for copy-pasting as a starting point.

---

## deck.yml format

```yaml
company:
  name:         "Acme AI"
  one_liner:    "We help Series A CFOs close their books 10x faster."
  category:     "B2B SaaS"
  stage:        "Seed"
  website:      "https://acme.ai"

fundraising:
  round:        "Seed"
  target_raise: "$2M"
  instrument:   "SAFE (post-money, $10M cap)"
  use_of_funds:
    - "Engineering — 3 hires (50%)"
    - "Sales & marketing (30%)"
    - "Ops / runway (20%)"

traction:
  mrr:          "$18,000"
  mrr_date:     "2024-03"        # required if mrr is set
  growth_rate:  "15% MoM"       # MUST include time period
  customers:    "12 paying"
  pilots:       "3 enterprise"

market:
  icp:              "CFOs at US SaaS companies with $5M-$50M ARR running NetSuite"
  pain:             "Month-end close takes 3 weeks; auditors demand manual reconciliation"
  competitors:
    - "Spreadsheets"
    - "Floqast"
  differentiation:  "Natively reads NetSuite journal entries - no CSV export required"
  market_size:      "$6B TAM"
  market_size_source: "Gartner CFO Tech Survey 2023"

team:
  - name:       "Jordan Kim"
    role:        "CEO & Co-founder"
    background:  "Ex-Intuit (TurboTax PM), 1 exit (FinancialOS to Xero)"

links:
  docsend:   "https://docsend.com/view/acme-seed-2024"
  demo:      "https://loom.com/share/acme-demo"
  calendly:  "https://calendly.com/jordan-acme"
  contact:   "jordan@acme.ai"
```

---

## What the audit checks

**Presence (error if missing):**
- `company.one_liner`
- `fundraising.target_raise`
- `fundraising.use_of_funds` (non-empty array)
- `links.demo`
- `links.contact`
- Every team member has a non-empty `background`

**Heuristics (regex/string matching — see limitations below):**
- `traction.growth_rate` must include a time period: `MoM`, `YoY`, `WoW`, `monthly`, `annually`, etc.
- `traction.mrr` set but `traction.mrr_date` missing → error
- `market.icp` matches a vague blocklist (`smb`, `startups`, `everyone`, `b2b`, `saas`...) → warning
- `market.competitors` set but `market.differentiation` empty → warning
- `market.market_size` set but `market.market_size_source` missing → warning

---

## Honest limitations

**deckcheck is a linter, not an AI.** All checks are pattern-matching and heuristics:

- A vague ICP like `"fast-growing startups in regulated industries"` will pass because it isn't on the blocklist. A human VC will see through it immediately.
- Growth rate `"14% MoM"` passes the period check even if the 14% is fabricated.
- The audit can't judge whether your one-liner is compelling, your market size is credible, or your team is fundable.

What deckcheck *can* do: catch the mechanical mistakes that make investors close the tab before they get to the substance — missing asks, dateless MRR, undifferentiated market positions, no demo link.

Think of it as spell-check, not a writing coach.

---

## The sidecar (why `deck-agent/`)

VC platforms, AI deal-flow tools, and LLM research agents increasingly try to read startup data programmatically. A locked DocSend PDF gives them nothing. Publishing `deck-agent/llms.txt` at a stable URL lets any tool ingest your raise without you doing anything extra:

- `llms.txt` — follows the llms.txt convention for LLM-readable docs
- `deck.json` — full structured object for programmatic consumers
- `metrics.json` — flat traction facts, easy to diff over time
- `investor-summary.md` — human-readable one-pager for data rooms

Host `./deck-agent/` as a static directory at `yoursite.com/deck-agent/`.

---

## CI / pre-send hook

```bash
# .github/workflows/deck-audit.yml
- run: npx deckcheck audit
```

```bash
# .git/hooks/pre-push (chmod +x)
#!/bin/sh
npx deckcheck audit
```

Exit code 1 on any error means the push or CI run fails until the deck is clean.

---

## Security

- No network calls. Ever.
- No eval. YAML is parsed as data, never executed.
- Output paths are resolved and validated to stay inside `./deck-agent/` — no path traversal via YAML fields.
- All values are sanitized via `JSON.stringify` before appearing in generated files.

---

## License

MIT
