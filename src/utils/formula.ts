import { evaluate } from 'mathjs';

export function evalFormula(formula: string): number {
  if (!formula || !formula.trim()) return 0;
  const clean = formula.trim();
  // If starts with =, strip it
  const expr = clean.startsWith('=') ? clean.slice(1) : clean;
  try {
    const result = evaluate(expr);
    if (typeof result === 'number' && isFinite(result)) {
      return Math.round(result * 100) / 100;
    }
    return 0;
  } catch {
    // Try parsing as plain number
    const n = parseFloat(expr);
    return isNaN(n) ? 0 : n;
  }
}
