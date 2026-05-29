import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'yaml';

const MAX_FIELD_LENGTH = 2000;

function truncate(obj, path = '') {
  if (typeof obj === 'string') {
    if (obj.length > MAX_FIELD_LENGTH) {
      process.stderr.write(
        `Warning: field "${path}" exceeds ${MAX_FIELD_LENGTH} chars — truncated\n`
      );
      return obj.slice(0, MAX_FIELD_LENGTH);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((v, i) => truncate(v, `${path}[${i}]`));
  }
  if (obj !== null && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = truncate(v, path ? `${path}.${k}` : k);
    }
    return out;
  }
  return obj;
}

export function loadDeck(filePath) {
  const abs = resolve(filePath);
  let raw;
  try {
    raw = readFileSync(abs, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        `deck.yml not found at ${abs}\nRun "pitchlint init" to create one.`
      );
    }
    throw new Error(`Could not read ${abs}: ${err.message}`);
  }

  let parsed;
  try {
    parsed = parse(raw);
  } catch (err) {
    throw new Error(
      `deck.yml has invalid YAML on line ${err.linePos?.[0]?.line ?? '?'}: ${err.message}`
    );
  }

  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('deck.yml is empty or not a YAML mapping.');
  }

  return truncate(parsed);
}
