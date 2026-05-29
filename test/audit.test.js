import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAudit, auditExitCode } from '../src/audit.js';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const cleanDeck = {
  company: {
    name: 'Acme Corp',
    one_liner: 'We help founders find investors faster.',
    category: 'B2B SaaS',
    stage: 'Seed',
    website: 'https://acme.example.com',
  },
  fundraising: {
    round: 'Seed',
    target_raise: '$2M',
    instrument: 'SAFE',
    use_of_funds: ['Engineering (50%)', 'Sales (30%)', 'Ops (20%)'],
  },
  traction: {
    mrr: '$10,000',
    mrr_date: '2024-03',
    growth_rate: '12% MoM',
    customers: '8 paying',
    pilots: '2',
  },
  market: {
    icp: 'Series A SaaS founders with 10-50 employees seeking warm intros',
    pain: 'Fundraising is opaque and relationship-dependent.',
    competitors: ['AngelList', 'Visible.vc'],
    differentiation: 'Only tool that maps warm paths through investor portfolio graphs.',
    market_size: '$4B TAM',
    market_size_source: 'Pitchbook 2023',
  },
  team: [
    {
      name: 'Alex Rivera',
      role: 'CEO',
      background: 'Ex-Stripe, 2 exits, Stanford CS.',
    },
  ],
  links: {
    docsend: 'https://docsend.com/view/example',
    demo: 'https://loom.com/share/example',
    calendly: 'https://calendly.com/alex',
    contact: 'alex@acme.example.com',
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

test('clean deck passes all checks (exit 0)', () => {
  const results = runAudit(cleanDeck);
  assert.strictEqual(results.errors.length, 0, 'Expected no errors');
  assert.strictEqual(auditExitCode(results), 0);
});

test('missing target_raise produces error', () => {
  const deck = JSON.parse(JSON.stringify(cleanDeck));
  delete deck.fundraising.target_raise;
  const { errors } = runAudit(deck);
  const ids = errors.map((r) => r.id);
  assert.ok(ids.includes('fundraising.target_raise'), `Expected fundraising.target_raise error, got: ${ids}`);
  assert.strictEqual(auditExitCode({ errors }), 1);
});

test('missing use_of_funds produces error', () => {
  const deck = JSON.parse(JSON.stringify(cleanDeck));
  deck.fundraising.use_of_funds = [];
  const { errors } = runAudit(deck);
  const ids = errors.map((r) => r.id);
  assert.ok(ids.includes('fundraising.use_of_funds'), `Expected use_of_funds error, got: ${ids}`);
});

test('bare growth_rate "14%" without period produces error', () => {
  const deck = JSON.parse(JSON.stringify(cleanDeck));
  deck.traction.growth_rate = '14%';
  const { errors } = runAudit(deck);
  const ids = errors.map((r) => r.id);
  assert.ok(ids.includes('traction.growth_rate.period'), `Expected growth_rate period error, got: ${ids}`);
  assert.strictEqual(auditExitCode({ errors }), 1);
});

test('growth_rate with MoM passes period check', () => {
  const deck = JSON.parse(JSON.stringify(cleanDeck));
  deck.traction.growth_rate = '14% MoM';
  const { errors } = runAudit(deck);
  const ids = errors.map((r) => r.id);
  assert.ok(!ids.includes('traction.growth_rate.period'), 'growth_rate with MoM should pass');
});

test('ICP "SMBs" produces vague-ICP warning', () => {
  const deck = JSON.parse(JSON.stringify(cleanDeck));
  deck.market.icp = 'SMBs';
  const { warnings } = runAudit(deck);
  const ids = warnings.map((r) => r.id);
  assert.ok(ids.includes('market.icp.vague'), `Expected ICP vague warning, got: ${ids}`);
});

test('ICP "startups" produces vague-ICP warning', () => {
  const deck = JSON.parse(JSON.stringify(cleanDeck));
  deck.market.icp = 'startups';
  const { warnings } = runAudit(deck);
  const ids = warnings.map((r) => r.id);
  assert.ok(ids.includes('market.icp.vague'), `Expected ICP vague warning for "startups"`);
});

test('missing demo link produces error', () => {
  const deck = JSON.parse(JSON.stringify(cleanDeck));
  delete deck.links.demo;
  const { errors } = runAudit(deck);
  const ids = errors.map((r) => r.id);
  assert.ok(ids.includes('links.demo'), `Expected links.demo error`);
});

test('missing contact produces error', () => {
  const deck = JSON.parse(JSON.stringify(cleanDeck));
  delete deck.links.contact;
  const { errors } = runAudit(deck);
  assert.ok(errors.map((r) => r.id).includes('links.contact'));
});

test('team member missing background produces error', () => {
  const deck = JSON.parse(JSON.stringify(cleanDeck));
  deck.team[0].background = '';
  const { errors } = runAudit(deck);
  assert.ok(errors.map((r) => r.id).includes('team.background'));
});

test('mrr without mrr_date produces error', () => {
  const deck = JSON.parse(JSON.stringify(cleanDeck));
  delete deck.traction.mrr_date;
  const { errors } = runAudit(deck);
  assert.ok(errors.map((r) => r.id).includes('traction.mrr.date'));
});

test('competitors listed but differentiation empty produces warning', () => {
  const deck = JSON.parse(JSON.stringify(cleanDeck));
  deck.market.differentiation = '';
  const { warnings } = runAudit(deck);
  assert.ok(warnings.map((r) => r.id).includes('market.differentiation'));
});

test('market_size without source produces warning', () => {
  const deck = JSON.parse(JSON.stringify(cleanDeck));
  delete deck.market.market_size_source;
  const { warnings } = runAudit(deck);
  assert.ok(warnings.map((r) => r.id).includes('market.market_size_source'));
});
