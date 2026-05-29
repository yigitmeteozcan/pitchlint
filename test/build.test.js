import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildSidecar } from '../src/build.js';

const TMP = resolve(import.meta.dirname ?? new URL('.', import.meta.url).pathname, '_tmp_build_test');

const deck = {
  company: {
    name: 'BuildTest Co',
    one_liner: 'Test company for build verification.',
    website: 'https://buildtest.example.com',
    stage: 'Pre-seed',
    category: 'Test',
  },
  fundraising: {
    round: 'Pre-seed',
    target_raise: '$500K',
    instrument: 'SAFE',
    use_of_funds: ['Product (60%)', 'GTM (40%)'],
  },
  traction: {
    mrr: '$5,000',
    mrr_date: '2024-01',
    growth_rate: '20% MoM',
    customers: '5',
    pilots: '1',
  },
  market: {
    icp: 'Solo founders at YC companies building dev tools',
    pain: 'Too much overhead, too little signal.',
    competitors: ['Notion', 'Linear'],
    differentiation: 'Purpose-built for the pre-PMF phase.',
    market_size: '$2B TAM',
    market_size_source: 'IDC 2023',
  },
  team: [
    { name: 'Sam Test', role: 'CEO', background: 'Ex-Google, 1 exit.' },
  ],
  links: {
    docsend: 'https://docsend.com/view/test',
    demo: 'https://loom.com/share/test',
    calendly: 'https://calendly.com/sam',
    contact: 'sam@buildtest.example.com',
  },
};

test('build writes all 4 expected files', () => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  const { written } = buildSidecar(deck, TMP);

  const names = written.map((p) => p.split('/').pop());
  assert.ok(names.includes('llms.txt'), 'Missing llms.txt');
  assert.ok(names.includes('deck.json'), 'Missing deck.json');
  assert.ok(names.includes('metrics.json'), 'Missing metrics.json');
  assert.ok(names.includes('investor-summary.md'), 'Missing investor-summary.md');

  rmSync(TMP, { recursive: true, force: true });
});

test('deck.json is valid parseable JSON', () => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  buildSidecar(deck, TMP);

  const raw = readFileSync(resolve(TMP, 'deck-agent', 'deck.json'), 'utf8');
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(raw); }, 'deck.json is not valid JSON');
  assert.strictEqual(parsed._schema, 'pitchlint/v1');
  assert.strictEqual(parsed.company.name, 'BuildTest Co');

  rmSync(TMP, { recursive: true, force: true });
});

test('metrics.json is valid parseable JSON with expected fields', () => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  buildSidecar(deck, TMP);

  const raw = readFileSync(resolve(TMP, 'deck-agent', 'metrics.json'), 'utf8');
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(raw); });
  assert.strictEqual(parsed.mrr, '$5,000');
  assert.strictEqual(parsed.target_raise, '$500K');

  rmSync(TMP, { recursive: true, force: true });
});

test('llms.txt contains one-liner and raise info', () => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  buildSidecar(deck, TMP);

  const raw = readFileSync(resolve(TMP, 'deck-agent', 'llms.txt'), 'utf8');
  assert.ok(raw.includes('BuildTest Co'), 'Missing company name in llms.txt');
  assert.ok(raw.includes('$500K'), 'Missing target raise in llms.txt');
  assert.ok(raw.includes('20% MoM'), 'Missing growth rate in llms.txt');

  rmSync(TMP, { recursive: true, force: true });
});

test('build returns auditErrors count', () => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  const { auditErrors } = buildSidecar(deck, TMP);
  assert.strictEqual(typeof auditErrors, 'number');

  rmSync(TMP, { recursive: true, force: true });
});
