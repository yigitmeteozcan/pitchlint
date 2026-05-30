import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { loadDeck } from '../src/load.js';

const TMP = resolve(import.meta.dirname, '_tmp_load_test');

function writeTmp(name, content) {
  mkdirSync(TMP, { recursive: true });
  const f = resolve(TMP, name);
  writeFileSync(f, content, 'utf8');
  return f;
}

test.afterEach(() => rmSync(TMP, { recursive: true, force: true }));

test('missing deck.yml throws with helpful message', () => {
  assert.throws(
    () => loadDeck(resolve(TMP, 'nonexistent.yml')),
    (err) => err.message.includes('not found'),
  );
});

test('empty deck.yml throws "empty or not a YAML mapping"', () => {
  const f = writeTmp('empty.yml', '');
  assert.throws(
    () => loadDeck(f),
    (err) => err.message.includes('empty or not a YAML mapping'),
  );
});

test('null YAML content throws "empty or not a YAML mapping"', () => {
  const f = writeTmp('null.yml', 'null\n');
  assert.throws(
    () => loadDeck(f),
    (err) => err.message.includes('empty or not a YAML mapping'),
  );
});

test('deck with all top-level keys missing loads without crash', () => {
  const f = writeTmp('empty_obj.yml', '{}\n');
  const deck = loadDeck(f);
  assert.deepStrictEqual(deck, {});
});

test('team as single object (not array) does not crash load', () => {
  const f = writeTmp('team_obj.yml', 'team:\n  name: Bob\n  role: CEO\n  background: Ex-Google\n');
  const deck = loadDeck(f);
  assert.strictEqual(typeof deck.team, 'object');
  assert.ok(!Array.isArray(deck.team));
});

test('use_of_funds as string does not crash load', () => {
  const f = writeTmp('uof_str.yml', 'fundraising:\n  use_of_funds: "hiring and sales"\n');
  const deck = loadDeck(f);
  assert.strictEqual(typeof deck.fundraising.use_of_funds, 'string');
});

test('competitors as string does not crash load', () => {
  const f = writeTmp('comp_str.yml', 'market:\n  competitors: "Notion, Linear"\n');
  const deck = loadDeck(f);
  assert.strictEqual(typeof deck.market.competitors, 'string');
});

test('50k-char field value is truncated to 2000', () => {
  const big = 'x'.repeat(50000);
  const f = writeTmp('bigfield.yml', `company:\n  name: "${big}"\n`);
  const deck = loadDeck(f);
  assert.strictEqual(deck.company.name.length, 2000);
});

test('file exceeding 512 KB throws size error', () => {
  // Write a 520 KB YAML file
  const big = 'x'.repeat(520 * 1024);
  const f = writeTmp('huge.yml', `company:\n  name: "${big}"\n`);
  assert.throws(
    () => loadDeck(f),
    (err) => err.message.includes('too large'),
  );
});

test('array with more than 100 items is truncated to 100', () => {
  const items = Array.from({ length: 150 }, (_, i) => `item${i}`);
  const yaml = 'fundraising:\n  use_of_funds:\n' + items.map((i) => `    - ${i}`).join('\n') + '\n';
  const f = writeTmp('bigarray.yml', yaml);
  const deck = loadDeck(f);
  assert.strictEqual(deck.fundraising.use_of_funds.length, 100);
});

test('deeply nested YAML (25 levels) does not stack-overflow', () => {
  // Build YAML: level0:\n  level1:\n    level2: ... value: deep
  let yaml = '';
  for (let i = 0; i < 25; i++) {
    yaml += '  '.repeat(i) + `level${i}:\n`;
  }
  yaml += '  '.repeat(25) + 'value: deep\n';
  const f = writeTmp('deep.yml', yaml);
  assert.doesNotThrow(() => loadDeck(f), 'Should not stack-overflow on deeply nested YAML');
});
