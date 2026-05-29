// Each rule: { id, severity: 'error'|'warn', message(deck), check(deck) → true = PASS }
// Adding a rule = adding one object. audit.js just iterates.

const PERIOD_RE = /\b(MoM|WoW|YoY|weekly|monthly|quarterly|annual(?:ly)?|per\s+(?:week|month|quarter|year))\b/i;

const VAGUE_ICP = new Set([
  'smbs', 'smb', 'startups', 'businesses', 'companies', 'everyone', 'b2b', 'saas',
]);

function str(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

export const rules = [
  // ── Presence checks (error) ──────────────────────────────────────────────

  {
    id: 'company.one_liner',
    severity: 'error',
    message: () => 'company.one_liner is missing — add a single sentence describing what you do.',
    check: (d) => str(d?.company?.one_liner),
  },

  {
    id: 'fundraising.target_raise',
    severity: 'error',
    message: () => 'fundraising.target_raise is missing — investors need to know the ask (e.g. "$2M").',
    check: (d) => str(d?.fundraising?.target_raise) || typeof d?.fundraising?.target_raise === 'number',
  },

  {
    id: 'fundraising.use_of_funds',
    severity: 'error',
    message: () => 'fundraising.use_of_funds is empty — add at least one line item (e.g. "- Hire 3 engineers").',
    check: (d) => Array.isArray(d?.fundraising?.use_of_funds) && d.fundraising.use_of_funds.length > 0,
  },

  {
    id: 'links.demo',
    severity: 'error',
    message: () => 'links.demo is missing — add a demo URL (Loom, YouTube, or live app).',
    check: (d) => str(d?.links?.demo),
  },

  {
    id: 'links.contact',
    severity: 'error',
    message: () => 'links.contact is missing — add a founder email or Calendly so investors can reach you.',
    check: (d) => str(d?.links?.contact),
  },

  {
    id: 'team.background',
    severity: 'error',
    message: (d) => {
      const team = d?.team;
      if (!Array.isArray(team) || team.length === 0) {
        return 'team is empty — add at least one team member with name, role, and background.';
      }
      const missing = team
        .filter((m) => !str(m?.background))
        .map((m) => m?.name || '(unnamed)');
      return `team member(s) missing background: ${missing.join(', ')} — add prior companies, exits, or domain expertise.`;
    },
    check: (d) => {
      const team = d?.team;
      if (!Array.isArray(team) || team.length === 0) return false;
      return team.every((m) => str(m?.background));
    },
  },

  // ── Heuristic checks (honest: these are regex/string, not AI) ───────────

  {
    id: 'traction.growth_rate.period',
    severity: 'error',
    message: (d) => {
      const gr = d?.traction?.growth_rate;
      const val = str(gr) ? gr : String(gr ?? '');
      return `growth_rate has no time period — got "${val}", expected e.g. "14% MoM" or "3x YoY".`;
    },
    check: (d) => {
      const gr = d?.traction?.growth_rate;
      if (!str(gr)) return true; // field absent — not an error for this rule
      return PERIOD_RE.test(gr);
    },
  },

  {
    id: 'traction.mrr.date',
    severity: 'error',
    message: () => 'traction.mrr has no date — add mrr_date (e.g. "2024-03") so investors know how fresh the number is.',
    check: (d) => {
      const mrr = d?.traction?.mrr;
      if (!mrr && mrr !== 0) return true; // mrr absent — rule doesn't apply
      return str(d?.traction?.mrr_date);
    },
  },

  {
    id: 'market.icp.vague',
    severity: 'warn',
    message: (d) => {
      const icp = d?.market?.icp ?? '';
      return `ICP too vague: "${icp}" — add company-size, segment, or urgency (e.g. "Series A SaaS CFOs with 50-200 employees").`;
    },
    check: (d) => {
      const icp = d?.market?.icp;
      if (!str(icp)) return true; // absent — different rule's job
      return !VAGUE_ICP.has(icp.trim().toLowerCase());
    },
  },

  {
    id: 'market.differentiation',
    severity: 'warn',
    message: () => 'market.differentiation is empty but competitors are listed — explain why you win.',
    check: (d) => {
      const comps = d?.market?.competitors;
      const hasComps = Array.isArray(comps) && comps.length > 0;
      if (!hasComps) return true;
      return str(d?.market?.differentiation);
    },
  },

  {
    id: 'market.market_size_source',
    severity: 'warn',
    message: () => 'market.market_size has no source — add market_size_source (e.g. "Gartner 2023") so investors can verify.',
    check: (d) => {
      const ms = d?.market?.market_size;
      if (!str(ms) && ms !== 0) return true; // absent — rule doesn't apply
      return str(d?.market?.market_size_source);
    },
  },
];
