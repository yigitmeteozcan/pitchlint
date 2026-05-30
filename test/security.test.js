import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { buildSidecar } from '../src/build.js';
import { generateDeckJson } from '../src/generators/deckJson.js';
import { generateLlmsTxt } from '../src/generators/llms.js';
import { generateSummaryMd } from '../src/generators/summary.js';
import { generateMetricsJson } from '../src/generators/metrics.js';
import { loadDeck } from '../src/load.js';

const TMP = resolve(import.meta.dirname, '_tmp_security_test');

const baseDeck = {
  company: { name: 'TestCo', one_liner: 'Test.', website: 'https://t.co', stage: 'Seed', category: 'SaaS' },
  fundraising: { round: 'Seed', target_raise: '$1M', instrument: 'SAFE', use_of_funds: ['Engineering (100%)'] },
  traction: { mrr: '$1K', mrr_date: '2024-01', growth_rate: '10% MoM', customers: '3', pilots: '1' },
  market: {
    icp: 'Series A founders',
    pain: 'Pain.',
    competitors: ['A', 'B'],
    differentiation: 'Better.',
    market_size: '$1B TAM',
    market_size_source: 'IDC 2023',
  },
  team: [{ name: 'Alice', role: 'CEO', background: 'Ex-Stripe.' }],
  links: { docsend: 'https://ds.com', demo: 'https://loom.com', calendly: 'https://cal.com', contact: 'a@b.com' },
};

test.afterEach(() => rmSync(TMP, { recursive: true, force: true }));

// ── Path safety ───────────────────────────────────────────────────────────────

test('path traversal: malicious company.name stays inside deck-agent/', () => {
  mkdirSync(TMP, { recursive: true });
  const deck = JSON.parse(JSON.stringify(baseDeck));
  deck.company.name = '../../etc/evil';

  buildSidecar(deck, TMP);

  const agentDir = resolve(TMP, 'deck-agent');
  assert.ok(existsSync(agentDir), 'deck-agent dir should exist');
  const files = readdirSync(agentDir);
  assert.ok(files.length > 0, 'deck-agent should contain files');
  assert.ok(!existsSync(resolve(TMP, '..', 'etc', 'evil')), 'Must not escape to ../../etc/evil');
  assert.ok(!existsSync(resolve(TMP, 'etc', 'evil')), 'Must not escape to etc/evil');
});

test('path traversal: malicious one_liner stays inside deck-agent/', () => {
  mkdirSync(TMP, { recursive: true });
  const deck = JSON.parse(JSON.stringify(baseDeck));
  deck.company.one_liner = '../../../tmp/evil\ninjected';

  assert.doesNotThrow(() => buildSidecar(deck, TMP));

  const agentDir = resolve(TMP, 'deck-agent');
  assert.ok(existsSync(agentDir));
  const files = readdirSync(agentDir);
  assert.strictEqual(files.length, 4, 'Should have exactly 4 files in deck-agent');
});

// ── JSON safety ───────────────────────────────────────────────────────────────

test('JSON safety: field with quotes, braces, newlines produces valid JSON', () => {
  const deck = JSON.parse(JSON.stringify(baseDeck));
  deck.company.name = 'Foo "Bar" {baz: 1}\nqux\\slash';
  deck.company.one_liner = 'We do "things" {like: this}\nand "more".';

  const json = generateDeckJson(deck);
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(json); });
  assert.strictEqual(parsed.company.name, 'Foo "Bar" {baz: 1}\nqux\\slash');
  assert.strictEqual(parsed.company.one_liner, 'We do "things" {like: this}\nand "more".');
});

test('JSON safety: metrics.json with special chars is valid JSON', () => {
  const deck = JSON.parse(JSON.stringify(baseDeck));
  deck.company.name = '"quoted" <name>';
  const json = generateMetricsJson(deck);
  assert.doesNotThrow(() => JSON.parse(json));
});

test('deck.json only includes known schema keys — no extra field leakage', () => {
  const deck = JSON.parse(JSON.stringify(baseDeck));
  deck.__secret = 'cap-table-internal';
  deck.internal_notes = 'pre-money $4M';

  const json = generateDeckJson(deck);
  const parsed = JSON.parse(json);
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, '__secret'), 'Extra key must not appear in deck.json');
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, 'internal_notes'), 'Extra key must not appear in deck.json');
});

// ── Markdown injection ────────────────────────────────────────────────────────

test('pipe character in field is escaped in llms.txt output', () => {
  const deck = JSON.parse(JSON.stringify(baseDeck));
  deck.company.name = 'Foo | Bar';
  const output = generateLlmsTxt(deck);
  assert.ok(!output.includes('Foo | Bar'), 'Raw pipe must not appear in output');
  assert.ok(output.includes('Foo \\| Bar'), 'Pipe must be escaped as \\|');
});

test('pipe character in field is escaped in investor-summary.md output', () => {
  const deck = JSON.parse(JSON.stringify(baseDeck));
  deck.market.icp = 'SMBs | Enterprises';
  const output = generateSummaryMd(deck);
  assert.ok(output.includes('SMBs \\| Enterprises'), 'Pipe must be escaped in table cell');
});

test('newline in field is collapsed to space in output', () => {
  const deck = JSON.parse(JSON.stringify(baseDeck));
  deck.company.one_liner = 'Line one\nLine two\rLine three';
  const llms = generateLlmsTxt(deck);
  const summary = generateSummaryMd(deck);
  assert.ok(!llms.includes('\nLine two'), 'Embedded newlines must not pass through to llms.txt');
  assert.ok(!summary.includes('\nLine two'), 'Embedded newlines must not pass through to summary.md');
});

test('Markdown link in field has bracket escaped', () => {
  const deck = JSON.parse(JSON.stringify(baseDeck));
  deck.company.name = '[click here](https://evil.com)';
  const output = generateLlmsTxt(deck);
  // [ must be escaped so it doesn't render as a link
  assert.ok(output.includes('\\[click here'), 'Opening bracket must be escaped');
});

// ── Wrong-type resilience ─────────────────────────────────────────────────────

test('generators do not crash when team is an object not array', () => {
  const deck = JSON.parse(JSON.stringify(baseDeck));
  deck.team = { name: 'Bob', role: 'CEO', background: 'Ex-Google' };

  assert.doesNotThrow(() => generateLlmsTxt(deck), 'llms.txt should not crash on non-array team');
  assert.doesNotThrow(() => generateSummaryMd(deck), 'summary.md should not crash on non-array team');
  assert.doesNotThrow(() => generateDeckJson(deck), 'deck.json should not crash on non-array team');
});

test('generators do not crash when use_of_funds is a string', () => {
  const deck = JSON.parse(JSON.stringify(baseDeck));
  deck.fundraising.use_of_funds = 'hiring and sales';

  assert.doesNotThrow(() => generateLlmsTxt(deck));
  assert.doesNotThrow(() => generateSummaryMd(deck));
  assert.doesNotThrow(() => generateDeckJson(deck));
});

test('generators do not crash when competitors is a string', () => {
  const deck = JSON.parse(JSON.stringify(baseDeck));
  deck.market.competitors = 'Notion, Linear';

  assert.doesNotThrow(() => generateLlmsTxt(deck));
  assert.doesNotThrow(() => generateSummaryMd(deck));
  assert.doesNotThrow(() => generateDeckJson(deck));
});

// ── Static scan ───────────────────────────────────────────────────────────────

function getAllJsFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.isDirectory()) {
      files.push(...getAllJsFiles(join(dir, e.name)));
    } else if (e.name.endsWith('.js')) {
      files.push(join(dir, e.name));
    }
  }
  return files;
}

const SRC = resolve(import.meta.dirname, '..', 'src');

test('static scan: no eval/Function()/require()/fetch/http/child_process in src/', () => {
  const BANNED = [
    { pat: /\beval\s*\(/, label: 'eval()' },
    { pat: /new\s+Function\s*\(/, label: 'new Function()' },
    { pat: /\brequire\s*\(/, label: 'require()' },
    { pat: /\bfetch\s*\(/, label: 'fetch()' },
    { pat: /child_process/, label: 'child_process' },
    { pat: /\bhttp\.request\b/, label: 'http.request' },
    { pat: /\bhttps\.request\b/, label: 'https.request' },
  ];

  const files = getAllJsFiles(SRC);
  assert.ok(files.length > 0, 'Should find JS files in src/');

  const violations = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    for (const { pat, label } of BANNED) {
      if (pat.test(content)) {
        violations.push(`${file}: ${label}`);
      }
    }
  }
  assert.deepStrictEqual(violations, [], `Banned patterns found:\n${violations.join('\n')}`);
});

// ── YAML tag safety ───────────────────────────────────────────────────────────

test('YAML unknown tag parses inert or throws cleanly — no code execution', () => {
  mkdirSync(TMP, { recursive: true });
  const f = resolve(TMP, 'tagged.yml');
  writeFileSync(f, 'company:\n  name: !!unknown "hello"\n', 'utf8');

  let deck = null;
  let error = null;
  try {
    deck = loadDeck(f);
  } catch (err) {
    error = err;
  }

  if (error) {
    assert.ok(typeof error.message === 'string', 'Error should have a message string');
  } else {
    assert.strictEqual(typeof deck, 'object');
    assert.ok(deck !== null);
  }
});

test('YAML !!js/eval tag does not execute code', () => {
  mkdirSync(TMP, { recursive: true });
  const f = resolve(TMP, 'jseval.yml');
  writeFileSync(f, 'company:\n  name: !!js/eval "process.exit(99)"\n', 'utf8');

  let deck = null;
  let error = null;
  try {
    deck = loadDeck(f);
  } catch (err) {
    error = err;
  }

  if (error) {
    assert.ok(typeof error.message === 'string');
  } else {
    assert.ok(deck !== null);
  }
  // Reaching here means process.exit(99) was NOT called.
  assert.ok(true, 'Process still running — !!js/eval was not executed');
});
