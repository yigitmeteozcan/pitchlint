import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'yaml';

const MAX_FIELD_LENGTH = 2000;
const MAX_FILE_SIZE = 512 * 1024; // 512 KB
const MAX_ARRAY_LENGTH = 100;
const MAX_DEPTH = 20;

function truncate(obj, path = '', depth = 0) {
  if (depth > MAX_DEPTH) {
    process.stderr.write(`Warning: field "${path}" exceeds maximum nesting depth — truncated\n`);
    return null;
  }
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
    let arr = obj;
    if (arr.length > MAX_ARRAY_LENGTH) {
      process.stderr.write(
        `Warning: field "${path}" has ${arr.length} items — truncated to ${MAX_ARRAY_LENGTH}\n`
      );
      arr = arr.slice(0, MAX_ARRAY_LENGTH);
    }
    return arr.map((v, i) => truncate(v, `${path}[${i}]`, depth + 1));
  }
  if (obj !== null && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = truncate(v, path ? `${path}.${k}` : k, depth + 1);
    }
    return out;
  }
  return obj;
}

export function loadDeck(filePath) {
  const abs = resolve(filePath);

  let stat;
  try {
    stat = statSync(abs);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`deck.yml not found at ${filePath}\nRun "pitchlint init" to create one.`);
    }
    throw new Error(`Could not read ${filePath}: ${err.message}`);
  }

  if (stat.size > MAX_FILE_SIZE) {
    throw new Error(
      `deck.yml is too large (${stat.size} bytes, max ${MAX_FILE_SIZE / 1024} KB).`
    );
  }

  let raw;
  try {
    raw = readFileSync(abs, 'utf8');
  } catch (err) {
    throw new Error(`Could not read ${filePath}: ${err.message}`);
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
