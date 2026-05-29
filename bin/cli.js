#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pc from 'picocolors';
import { loadDeck } from '../src/load.js';
import { runAudit, printDetailedResults, auditExitCode } from '../src/audit.js';
import { buildSidecar } from '../src/build.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

const COMMANDS = ['init', 'audit', 'build', 'example', 'help'];

function printHelp() {
  console.log('');
  console.log(pc.bold('  deckcheck') + pc.dim(' — ESLint for pitch decks'));
  console.log('');
  console.log('  ' + pc.bold('Commands:'));
  console.log('    ' + pc.cyan('init') + '      Create a blank deck.yml in the current directory');
  console.log('    ' + pc.cyan('audit') + '     Lint deck.yml for missing investor-critical info');
  console.log('    ' + pc.cyan('build') + '     Generate ./deck-agent/ sidecar (JSON + llms.txt + Markdown)');
  console.log('    ' + pc.cyan('example') + '   Print a fully-filled example deck.yml to stdout');
  console.log('    ' + pc.cyan('help') + '      Show this help message');
  console.log('');
  console.log('  ' + pc.bold('Usage:'));
  console.log('    npx deckcheck init');
  console.log('    npx deckcheck audit');
  console.log('    npx deckcheck build');
  console.log('');
}

function cmdInit() {
  const dest = resolve(process.cwd(), 'deck.yml');
  if (existsSync(dest)) {
    console.error(pc.red('  deck.yml already exists — refusing to overwrite.'));
    console.error('  Delete or rename it first if you want a fresh template.');
    process.exit(1);
  }

  const template = resolve(PKG_ROOT, 'templates', 'deck.template.yml');
  let content;
  try {
    content = readFileSync(template, 'utf8');
  } catch {
    console.error(pc.red('  Could not read template file. Try reinstalling deckcheck.'));
    process.exit(1);
  }

  try {
    writeFileSync(dest, content, 'utf8');
  } catch (err) {
    console.error(pc.red(`  Could not write deck.yml: ${err.message}`));
    process.exit(1);
  }

  console.log('');
  console.log(pc.green('  ✓ deck.yml created'));
  console.log('');
  console.log('  Fill it in, then run: ' + pc.cyan('deckcheck audit'));
  console.log('');
}

function cmdAudit() {
  let deck;
  try {
    deck = loadDeck(resolve(process.cwd(), 'deck.yml'));
  } catch (err) {
    console.error('');
    console.error(pc.red(`  Error: ${err.message}`));
    console.error('');
    process.exit(1);
  }

  console.log('');
  console.log(pc.bold('  deckcheck audit'));

  const results = runAudit(deck);
  printDetailedResults(deck, results);

  process.exit(auditExitCode(results));
}

function cmdBuild() {
  let deck;
  try {
    deck = loadDeck(resolve(process.cwd(), 'deck.yml'));
  } catch (err) {
    console.error('');
    console.error(pc.red(`  Error: ${err.message}`));
    console.error('');
    process.exit(1);
  }

  const { errors } = runAudit(deck);

  if (errors.length > 0) {
    console.log('');
    console.log(pc.yellow(`  ⚠ Building sidecar with ${errors.length} unresolved issue${errors.length > 1 ? 's' : ''}.`));
    console.log(pc.yellow('  Run "deckcheck audit" to see what\'s missing.'));
  }

  let result;
  try {
    result = buildSidecar(deck, process.cwd());
  } catch (err) {
    console.error('');
    console.error(pc.red(`  Build error: ${err.message}`));
    console.error('');
    process.exit(1);
  }

  console.log('');
  console.log(pc.bold('  deckcheck build') + pc.green(' ✓'));
  console.log('');
  console.log('  Generated files:');
  for (const f of result.written) {
    const rel = f.replace(process.cwd() + '/', './');
    console.log(pc.green(`    ${rel}`));
  }
  console.log('');

  const docsend = deck?.links?.docsend;
  const website = deck?.company?.website;

  if (docsend || website) {
    console.log('  ' + pc.dim('Publish hint:'));
    if (docsend) console.log('    Deck: ' + docsend);
    if (website) console.log('    Agent-readable: ' + website + '/deck-agent/llms.txt');
    console.log('');
  }
}

function cmdExample() {
  const example = resolve(PKG_ROOT, 'templates', 'example.yml');
  let content;
  try {
    content = readFileSync(example, 'utf8');
  } catch {
    console.error(pc.red('  Could not read example file. Try reinstalling deckcheck.'));
    process.exit(1);
  }

  // Pretty-print with basic YAML syntax highlighting
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('#')) {
      process.stdout.write(pc.dim(line) + '\n');
    } else if (/^[\w_]+:/.test(trimmed)) {
      const colonIdx = line.indexOf(':');
      process.stdout.write(
        pc.cyan(line.slice(0, colonIdx + line.length - line.trimStart().length - trimmed.length + colonIdx)) +
        line.slice(colonIdx + (line.length - line.trimStart().length - trimmed.length + colonIdx)) + '\n'
      );
    } else if (trimmed.startsWith('-')) {
      process.stdout.write(pc.yellow(line) + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const [,, cmd, ...args] = process.argv;

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
  printHelp();
  process.exit(0);
}

if (!COMMANDS.includes(cmd)) {
  console.error('');
  console.error(pc.red(`  Unknown command: ${cmd}`));
  printHelp();
  process.exit(1);
}

switch (cmd) {
  case 'init':    cmdInit(); break;
  case 'audit':   cmdAudit(); break;
  case 'build':   cmdBuild(); break;
  case 'example': cmdExample(); break;
}
