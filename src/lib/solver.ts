import * as math from 'mathjs';

export interface IterationResult {
  iteration: number;
  x: number;
  fx: number;
  error: number;
  a?: number;
  b?: number;
  fa?: number;
  fb?: number;
  xPrev?: number;
}

export interface SolverResult {
  root: number | null;
  iterations: IterationResult[];
  method: string;
  error?: string;
}

export const solveBisection = (
  f: (x: number) => number,
  a: number,
  b: number,
  tol: number = 1e-7,
  maxIter: number = 100
): SolverResult => {
  const iterations: IterationResult[] = [];
  let fa = f(a);
  let fb = f(b);

  if (fa * fb >= 0) {
    return { root: null, iterations, method: 'Bisection', error: 'f(a) and f(b) must have opposite signs.' };
  }

  let mid = a;
  for (let i = 1; i <= maxIter; i++) {
    const currentA = a;
    const currentB = b;
    mid = (a + b) / 2;
    const fmid = f(mid);
    
    if (isNaN(fmid) || !isFinite(fmid)) {
      return { root: null, iterations, method: 'Bisection', error: 'Calculation resulted in an invalid number (NaN/Infinity).' };
    }

    const error = Math.abs(b - a) / 2;

    iterations.push({ 
      iteration: i, 
      x: mid, 
      fx: fmid, 
      error, 
      a: currentA, 
      b: currentB,
      fa: fa,
      fb: fb
    });

    if (error < tol || Math.abs(fmid) < 1e-12) {
      return { root: mid, iterations, method: 'Bisection' };
    }

    if (fa * fmid < 0) {
      b = mid;
      fb = fmid;
    } else {
      a = mid;
      fa = fmid;
    }
  }

  return { root: mid, iterations, method: 'Bisection', error: 'Maximum iterations reached.' };
};

export const solveRegulaFalsi = (
  f: (x: number) => number,
  a: number,
  b: number,
  tol: number = 1e-7,
  maxIter: number = 100
): SolverResult => {
  const iterations: IterationResult[] = [];
  let fa = f(a);
  let fb = f(b);

  if (fa * fb >= 0) {
    return { root: null, iterations, method: 'Regula-Falsi', error: 'f(a) and f(b) must have opposite signs.' };
  }

  let c = a;
  for (let i = 1; i <= maxIter; i++) {
    const currentA = a;
    const currentB = b;
    // Formula for Regula-Falsi: c = (a*f(b) - b*f(a)) / (f(b) - f(a))
    if (Math.abs(fb - fa) < 1e-15) {
      return { root: null, iterations, method: 'Regula-Falsi', error: 'Division by zero in Regula-Falsi formula.' };
    }
    c = (a * fb - b * fa) / (fb - fa);
    const fc = f(c);

    if (isNaN(fc) || !isFinite(fc)) {
      return { root: null, iterations, method: 'Regula-Falsi', error: 'Calculation resulted in an invalid number (NaN/Infinity).' };
    }
    const error = i > 1 ? Math.abs(c - iterations[iterations.length - 1].x) : Math.abs(b - a);

    iterations.push({ 
      iteration: i, 
      x: c, 
      fx: fc, 
      error, 
      a: currentA, 
      b: currentB,
      fa: fa,
      fb: fb
    });

    if (error < tol || Math.abs(fc) < 1e-12) {
      return { root: c, iterations, method: 'Regula-Falsi' };
    }

    if (fa * fc < 0) {
      b = c;
      fb = fc;
    } else {
      a = c;
      fa = fc;
    }
  }

  return { root: c, iterations, method: 'Regula-Falsi', error: 'Maximum iterations reached.' };
};

export const solveNewton = (
  f: (x: number) => number,
  df: (x: number) => number,
  x0: number,
  tol: number = 1e-7,
  maxIter: number = 100
): SolverResult => {
  const iterations: IterationResult[] = [];
  let x = x0;

  for (let i = 1; i <= maxIter; i++) {
    const fx = f(x);
    const dfx = df(x);

    if (Math.abs(dfx) < 1e-12) {
      return { root: null, iterations, method: 'Newton-Raphson', error: 'Derivative is too small.' };
    }

    const xNext = x - fx / dfx;
    const fxNext = f(xNext);

    if (isNaN(fxNext) || !isFinite(fxNext)) {
      return { root: null, iterations, method: 'Newton-Raphson', error: 'Calculation resulted in an invalid number (NaN/Infinity).' };
    }

    const error = Math.abs(xNext - x);

    iterations.push({ 
      iteration: i, 
      x: xNext, 
      fx: fxNext, 
      error, 
      xPrev: x,
      a: x,
      b: dfx,
      fa: fx,
      fb: undefined
    });

    if (error < tol) {
      return { root: xNext, iterations, method: 'Newton-Raphson' };
    }

    x = xNext;
  }

  return { root: x, iterations, method: 'Newton-Raphson', error: 'Maximum iterations reached.' };
};

export const solveSecant = (
  f: (x: number) => number,
  x0: number,
  x1: number,
  tol: number = 1e-7,
  maxIter: number = 100
): SolverResult => {
  const iterations: IterationResult[] = [];
  
  for (let i = 1; i <= maxIter; i++) {
    const fx0 = f(x0);
    const fx1 = f(x1);
    
    if (Math.abs(fx1 - fx0) < 1e-12) {
      return { root: null, iterations, method: 'Secant', error: 'Denominator too small.' };
    }

    const xNext = x1 - fx1 * (x1 - x0) / (fx1 - fx0);
    const fxNext = f(xNext);

    if (isNaN(fxNext) || !isFinite(fxNext)) {
      return { root: null, iterations, method: 'Secant', error: 'Calculation resulted in an invalid number (NaN/Infinity).' };
    }

    const error = Math.abs(xNext - x1);

    iterations.push({ 
      iteration: i, 
      x: xNext, 
      fx: fxNext, 
      error, 
      a: x0, 
      b: x1,
      fa: fx0,
      fb: fx1
    });

    if (error < tol) {
      return { root: xNext, iterations, method: 'Secant' };
    }

    x0 = x1;
    x1 = xNext;
  }

  return { root: x1, iterations, method: 'Secant', error: 'Maximum iterations reached.' };
};
