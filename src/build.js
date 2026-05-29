import { mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { runAudit } from './audit.js';
import { generateLlmsTxt } from './generators/llms.js';
import { generateDeckJson } from './generators/deckJson.js';
import { generateMetricsJson } from './generators/metrics.js';
import { generateSummaryMd } from './generators/summary.js';

const OUTPUT_DIR = 'deck-agent';

function safeWrite(dir, filename, content) {
  // Resolve final path and verify it stays inside dir — no traversal from deck data.
  const outPath = resolve(join(dir, filename));
  const base = resolve(dir);
  if (!outPath.startsWith(base + '/') && outPath !== base) {
    throw new Error(`Path traversal detected: ${outPath} is outside ${base}`);
  }
  writeFileSync(outPath, content, 'utf8');
  return outPath;
}

export function buildSidecar(deck, cwd = process.cwd()) {
  const outDir = resolve(cwd, OUTPUT_DIR);

  // Security: outDir must be inside cwd.
  const cwdResolved = resolve(cwd);
  if (!outDir.startsWith(cwdResolved + '/') && outDir !== cwdResolved) {
    throw new Error(`Output directory ${outDir} would be outside cwd ${cwdResolved}`);
  }

  const { errors } = runAudit(deck);

  mkdirSync(outDir, { recursive: true });

  const files = [
    { name: 'llms.txt', content: generateLlmsTxt(deck) },
    { name: 'deck.json', content: generateDeckJson(deck) },
    { name: 'metrics.json', content: generateMetricsJson(deck) },
    { name: 'investor-summary.md', content: generateSummaryMd(deck) },
  ];

  const written = [];
  for (const { name, content } of files) {
    const p = safeWrite(outDir, name, content);
    written.push(p);
  }

  return { outDir, written, auditErrors: errors.length };
}
