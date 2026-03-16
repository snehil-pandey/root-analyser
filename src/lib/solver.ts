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
  dfx?: number;
  xPrev?: number;
}

export interface SolverResult {
  root: number | null;
  iterations: IterationResult[];
  method: string;
  error?: string;
}

const roundTo = (num: number, places: number) => {
  const factor = Math.pow(10, places);
  return Math.round(num * factor) / factor;
};

export const solveBisection = (
  f: (x: number) => number,
  a: number,
  b: number,
  tol: number = 1e-7,
  precision: number = 5,
  maxIter: number = 100
): SolverResult => {
  const iterations: IterationResult[] = [];
  const p = precision + 1;
  
  let currentA = roundTo(a, p);
  let currentB = roundTo(b, p);
  let fa = roundTo(f(currentA), p);
  let fb = roundTo(f(currentB), p);

  if (fa * fb >= 0) {
    return { root: null, iterations, method: 'Bisection', error: 'f(a) and f(b) must have opposite signs.' };
  }

  // Ensure fa is negative and fb is positive for consistent table display
  if (fa > 0) {
    [currentA, currentB] = [currentB, currentA];
    [fa, fb] = [fb, fa];
  }

  let mid = currentA;
  let converged = false;
  const startTime = Date.now();
  for (let i = 1; i <= maxIter; i++) {
    if (Date.now() - startTime > 2000) { // 2 second timeout
      return { root: mid, iterations, method: 'Bisection', error: 'Calculation timed out. The function might be too complex or converging too slowly.' };
    }
    
    const prevA = currentA;
    const prevB = currentB;
    mid = roundTo((currentA + currentB) / 2, p);
    const fmid = roundTo(f(mid), p);
    
    if (isNaN(fmid) || !isFinite(fmid)) {
      return { root: null, iterations, method: 'Bisection', error: `Calculation resulted in an invalid number at x=${mid.toFixed(p)}. The function might be undefined in this range.` };
    }

    const error = Math.abs(currentB - currentA) / 2;

    iterations.push({ 
      iteration: i, 
      x: mid, 
      fx: fmid, 
      error, 
      a: prevA, 
      b: prevB,
      fa: fa,
      fb: fb
    });

    if (iterations.length > 1) {
      const last = iterations[iterations.length - 1];
      const prev = iterations[iterations.length - 2];
      if (roundTo(last.x, precision) === roundTo(prev.x, precision) && 
          roundTo(last.fx, precision) === roundTo(prev.fx, precision)) {
        return { root: mid, iterations, method: 'Bisection' };
      }
    }

    if (converged) {
      return { root: mid, iterations, method: 'Bisection' };
    }

    if (error < tol || Math.abs(fmid) < 1e-12) {
      converged = true;
    }

    if (fa * fmid < 0) {
      currentB = mid;
      fb = fmid;
    } else {
      currentA = mid;
      fa = fmid;
    }
  }

  return { root: mid, iterations, method: 'Bisection' };
};

export const solveRegulaFalsi = (
  f: (x: number) => number,
  a: number,
  b: number,
  tol: number = 1e-7,
  precision: number = 5,
  maxIter: number = 100
): SolverResult => {
  const iterations: IterationResult[] = [];
  const p = precision + 1;

  let currentA = roundTo(a, p);
  let currentB = roundTo(b, p);
  let fa = roundTo(f(currentA), p);
  let fb = roundTo(f(currentB), p);

  if (fa * fb >= 0) {
    return { root: null, iterations, method: 'Regula-Falsi', error: 'f(a) and f(b) must have opposite signs.' };
  }

  // Ensure fa is negative and fb is positive for consistent table display
  if (fa > 0) {
    [currentA, currentB] = [currentB, currentA];
    [fa, fb] = [fb, fa];
  }

  let c = currentA;
  let converged = false;
  const startTime = Date.now();
  for (let i = 1; i <= maxIter; i++) {
    if (Date.now() - startTime > 2000) { // 2 second timeout
      return { root: c, iterations, method: 'Regula-Falsi', error: 'Calculation timed out. The function might be too complex or converging too slowly.' };
    }
    
    const prevA = currentA;
    const prevB = currentB;

    if (Math.abs(fb - fa) < 1e-15) {
      return { root: null, iterations, method: 'Regula-Falsi', error: 'Division by zero in Regula-Falsi formula.' };
    }
    
    c = roundTo((currentA * fb - currentB * fa) / (fb - fa), p);
    const fc = roundTo(f(c), p);

    if (isNaN(fc) || !isFinite(fc)) {
      return { root: null, iterations, method: 'Regula-Falsi', error: `Calculation resulted in an invalid number at x=${c.toFixed(p)}. The function might be undefined in this range.` };
    }
    
    const error = i > 1 ? Math.abs(c - iterations[iterations.length - 1].x) : Math.abs(currentB - currentA);

    iterations.push({ 
      iteration: i, 
      x: c, 
      fx: fc, 
      error, 
      a: prevA, 
      b: prevB,
      fa: fa,
      fb: fb
    });

    if (iterations.length > 1) {
      const last = iterations[iterations.length - 1];
      const prev = iterations[iterations.length - 2];
      if (roundTo(last.x, precision) === roundTo(prev.x, precision) && 
          roundTo(last.fx, precision) === roundTo(prev.fx, precision)) {
        return { root: c, iterations, method: 'Regula-Falsi' };
      }
    }

    if (converged) {
      return { root: c, iterations, method: 'Regula-Falsi' };
    }

    if (error < tol || Math.abs(fc) < 1e-12) {
      converged = true;
    }

    if (fa * fc < 0) {
      currentB = c;
      fb = fc;
    } else {
      currentA = c;
      fa = fc;
    }
  }

  return { root: c, iterations, method: 'Regula-Falsi' };
};

export const solveNewton = (
  f: (x: number) => number,
  df: (x: number) => number,
  x0: number,
  tol: number = 1e-7,
  precision: number = 5,
  maxIter: number = 100
): SolverResult => {
  const iterations: IterationResult[] = [];
  const p = precision + 1;
  let x = roundTo(x0, p);
  let converged = false;
  const startTime = Date.now();

  for (let i = 1; i <= maxIter; i++) {
    if (Date.now() - startTime > 2000) { // 2 second timeout
      return { root: x, iterations, method: 'Newton-Raphson', error: 'Calculation timed out. The function might be too complex or converging too slowly.' };
    }
    const fx = roundTo(f(x), p);
    const dfx = roundTo(df(x), p);

    if (isNaN(fx) || !isFinite(fx) || isNaN(dfx) || !isFinite(dfx)) {
      return { root: null, iterations, method: 'Newton-Raphson', error: `Calculation resulted in an invalid number at x=${x.toFixed(p)}. The function or its derivative might be undefined here.` };
    }

    if (Math.abs(dfx) < 1e-12) {
      return { root: null, iterations, method: 'Newton-Raphson', error: 'Derivative is zero or too small. Newton-Raphson cannot continue as it would involve division by zero.' };
    }

    const xNext = roundTo(x - fx / dfx, p);
    const fxNext = roundTo(f(xNext), p);

    if (isNaN(fxNext) || !isFinite(fxNext)) {
      return { root: null, iterations, method: 'Newton-Raphson', error: `Calculation resulted in an invalid number at x=${xNext.toFixed(p)}. The function might be undefined at this point.` };
    }

    const error = Math.abs(xNext - x);

    iterations.push({ 
      iteration: i, 
      x: xNext, 
      fx: fxNext, 
      error, 
      xPrev: x,
      dfx: dfx,
      fa: fx
    });

    if (iterations.length > 1) {
      const last = iterations[iterations.length - 1];
      const prev = iterations[iterations.length - 2];
      if (roundTo(last.x, precision) === roundTo(prev.x, precision) && 
          roundTo(last.fx, precision) === roundTo(prev.fx, precision)) {
        return { root: xNext, iterations, method: 'Newton-Raphson' };
      }
    }

    if (converged) {
      return { root: xNext, iterations, method: 'Newton-Raphson' };
    }

    if (error < tol) {
      converged = true;
    }

    x = xNext;
  }

  return { root: x, iterations, method: 'Newton-Raphson' };
};

export const solveSecant = (
  f: (x: number) => number,
  x0: number,
  x1: number,
  tol: number = 1e-7,
  precision: number = 5,
  maxIter: number = 100
): SolverResult => {
  const iterations: IterationResult[] = [];
  const p = precision + 1;
  const startTime = Date.now();
  
  let currentA = roundTo(x0, p);
  let currentB = roundTo(x1, p);
  let fa = roundTo(f(currentA), p);
  let fb = roundTo(f(currentB), p);

  // If initial points bracket the root, we can maintain the bracket
  // If not, Secant is usually an open method, but the user requested bracketing behavior
  if (fa * fb >= 0) {
    // If they don't bracket, we'll try to find a bracket or just proceed as open method
    // But the user said "make sure f(a)*f(b) < 0"
    return { root: null, iterations, method: 'Secant', error: 'For bracketing Secant, f(x0) and f(x1) must have opposite signs.' };
  }

  // Ensure fa is negative and fb is positive
  if (fa > 0) {
    [currentA, currentB] = [currentB, currentA];
    [fa, fb] = [fb, fa];
  }

  let converged = false;
  for (let i = 1; i <= maxIter; i++) {
    if (Date.now() - startTime > 2000) { // 2 second timeout
      return { root: currentB, iterations, method: 'Secant', error: 'Calculation timed out. The function might be too complex or converging too slowly.' };
    }
    
    if (Math.abs(fb - fa) < 1e-12) {
      return { root: null, iterations, method: 'Secant', error: 'Division by zero: f(x_n) and f(x_{n-1}) are too close.' };
    }

    const xNext = roundTo(currentB - fb * (currentB - currentA) / (fb - fa), p);
    const fxNext = roundTo(f(xNext), p);

    if (isNaN(fxNext) || !isFinite(fxNext)) {
      return { root: null, iterations, method: 'Secant', error: `Calculation resulted in an invalid number at x=${xNext.toFixed(p)}.` };
    }

    const error = Math.abs(xNext - currentB);

    iterations.push({ 
      iteration: i, 
      x: xNext, 
      fx: fxNext, 
      error, 
      a: currentA, 
      b: currentB,
      fa: fa,
      fb: fb
    });

    if (iterations.length > 1) {
      const last = iterations[iterations.length - 1];
      const prev = iterations[iterations.length - 2];
      if (roundTo(last.x, precision) === roundTo(prev.x, precision) && 
          roundTo(last.fx, precision) === roundTo(prev.fx, precision)) {
        return { root: xNext, iterations, method: 'Secant' };
      }
    }

    if (converged) {
      return { root: xNext, iterations, method: 'Secant' };
    }

    if (error < tol) {
      converged = true;
    }

    // Bracketing logic (Modified Secant / Regula-Falsi style)
    if (fa * fxNext < 0) {
      currentB = xNext;
      fb = fxNext;
    } else {
      currentA = xNext;
      fa = fxNext;
    }
  }

  return { root: currentB, iterations, method: 'Secant' };
};
