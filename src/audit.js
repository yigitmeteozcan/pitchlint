import pc from 'picocolors';
import { rules } from './rules.js';

export function runAudit(deck) {
  const errors = [];
  const warnings = [];
  const passes = [];

  for (const rule of rules) {
    let passed;
    try {
      passed = rule.check(deck);
    } catch {
      passed = false;
    }

    if (passed) {
      passes.push(rule);
    } else if (rule.severity === 'error') {
      errors.push(rule);
    } else {
      warnings.push(rule);
    }
  }

  return { errors, warnings, passes };
}

export function printResults({ errors, warnings, passes }, { silent = false } = {}) {
  if (silent) return;

  if (passes.length > 0) {
    for (const rule of passes) {
      console.log(pc.green(`  ✓ ${rule.id}`));
    }
  }

  if (warnings.length > 0) {
    for (const rule of warnings) {
      // We need the deck to generate the message; caller passes deck separately
      console.log(pc.yellow(`  ⚠ ${rule.id}`));
    }
  }

  if (errors.length > 0) {
    for (const rule of errors) {
      console.log(pc.red(`  ✖ ${rule.id}`));
    }
  }
}

export function printDetailedResults(deck, { errors, warnings, passes }) {
  if (passes.length > 0) {
    console.log('');
    for (const rule of passes) {
      console.log(pc.green(`  ✓ ${rule.id}`));
    }
  }

  if (warnings.length > 0) {
    console.log('');
    for (const rule of warnings) {
      let msg;
      try { msg = rule.message(deck); } catch { msg = rule.id; }
      console.log(pc.yellow(`  ⚠ ${msg}`));
    }
  }

  if (errors.length > 0) {
    console.log('');
    for (const rule of errors) {
      let msg;
      try { msg = rule.message(deck); } catch { msg = rule.id; }
      console.log(pc.red(`  ✖ ${msg}`));
    }
  }

  console.log('');

  const total = passes.length + warnings.length + errors.length;
  const summary = [
    errors.length > 0 ? pc.red(`${errors.length} error${errors.length > 1 ? 's' : ''}`) : null,
    warnings.length > 0 ? pc.yellow(`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`) : null,
    pc.green(`${passes.length} passed`),
  ].filter(Boolean).join(', ');

  console.log(`  ${summary}  (${total} rules)`);
  console.log('');

  if (errors.length > 0) {
    console.log(pc.red('  Audit failed. Fix errors before sending to investors.'));
    console.log('');
  } else if (warnings.length > 0) {
    console.log(pc.yellow('  Audit passed with warnings. Consider fixing them before sending.'));
    console.log('');
  } else {
    console.log(pc.green('  All checks passed. Run "deckcheck build" to generate the agent sidecar.'));
    console.log('');
  }
}

export function auditExitCode({ errors }) {
  return errors.length > 0 ? 1 : 0;
}
