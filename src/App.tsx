import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as math from 'mathjs';
import { 
  Calculator, 
  LineChart as ChartIcon, 
  Play, 
  RotateCcw, 
  ChevronRight,
  Target,
  Zap,
  Layers,
  Search,
  Maximize2,
  ChevronUp,
  ChevronDown,
  Info,
  X,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InlineMath, BlockMath } from 'react-katex';
import { Graph } from './components/Graph';
import { solveBisection, solveRegulaFalsi, solveNewton, solveSecant, SolverResult } from './lib/solver';
import { cn } from './lib/utils';

// Make math available globally for the Graph component
(window as any).math = math;

type Method = 'Bisection' | 'Regula-Falsi' | 'Newton-Raphson' | 'Secant';

export default function App() {
  const [equation, setEquation] = useState('x^3 - 4*x - 1');
  const [rangeA, setRangeA] = useState(0);
  const [rangeB, setRangeB] = useState(3);
  const [decimalPlaces, setDecimalPlaces] = useState(5);
  const [liveSync, setLiveSync] = useState(true);
  const [isAnyInputFocused, setIsAnyInputFocused] = useState(false);
  const [zoomMode, setZoomMode] = useState<'None' | 'Auto' | 'Focus'>('Auto');
  const [selectedMethod, setSelectedMethod] = useState<Method>('Bisection');
  const [result, setResult] = useState<SolverResult | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      const isLarge = window.innerWidth >= 1280;
      setIsLargeScreen(isLarge);
      if (isLarge) setIsSidebarOpen(false);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const solve = useCallback(() => {
    setIsSolving(true);
    setCurrentStepIndex(-1);
    
    const tolerance = 0.5 * Math.pow(10, -decimalPlaces);

    try {
      const node = math.parse(equation);
      const f = (x: number) => node.evaluate({ x });
      
      let solveRes: SolverResult;
      
      if (selectedMethod === 'Bisection') {
        solveRes = solveBisection(f, rangeA, rangeB, tolerance);
      } else if (selectedMethod === 'Regula-Falsi') {
        solveRes = solveRegulaFalsi(f, rangeA, rangeB, tolerance);
      } else if (selectedMethod === 'Newton-Raphson') {
        const deriv = math.derivative(node, 'x');
        const df = (x: number) => deriv.evaluate({ x });
        solveRes = solveNewton(f, df, rangeA, tolerance);
      } else {
        solveRes = solveSecant(f, rangeA, rangeB, tolerance);
      }
      
      setResult(solveRes);
      if (solveRes.iterations.length > 0) {
        setCurrentStepIndex(0);
      }
    } catch (err) {
      setResult({
        root: null,
        iterations: [],
        method: selectedMethod,
        error: err instanceof Error ? err.message : 'Invalid equation'
      });
    } finally {
      setIsSolving(false);
    }
  }, [equation, rangeA, rangeB, decimalPlaces, selectedMethod]);

  // Auto-solve effect with debouncing for the equation string
  // Disabled while user is actively typing (focused)
  useEffect(() => {
    if (!liveSync || isAnyInputFocused) return;
    const timer = setTimeout(() => {
      solve();
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [solve, liveSync, isAnyInputFocused]);


  const currentStep = result && currentStepIndex >= 0 ? result.iterations[currentStepIndex] : null;

  const graphPoints = useMemo(() => {
    const pts = [];
    if (currentStep) {
      pts.push({ x: currentStep.x, y: 0, label: `x${currentStep.iteration}`, color: '#3b82f6' });
      if (currentStep.xPrev !== undefined) {
        pts.push({ x: currentStep.xPrev, y: 0, label: 'Prev', color: '#f43f5e' });
      }
    } else if (result?.root) {
      pts.push({ x: result.root, y: 0, label: 'Root', color: '#a855f7' });
    }
    return pts;
  }, [currentStep, result]);

  const graphInterval = useMemo(() => {
    if (currentStep && currentStep.a !== undefined && currentStep.b !== undefined) {
      return [currentStep.a, currentStep.b] as [number, number];
    }
    // For Regula-Falsi, bisection, and secant, we often have intervals
    if (currentStep && (selectedMethod === 'Bisection' || selectedMethod === 'Regula-Falsi' || selectedMethod === 'Secant')) {
      if (currentStep.a !== undefined && currentStep.b !== undefined) {
        return [currentStep.a, currentStep.b] as [number, number];
      }
    }
    return undefined;
  }, [currentStep, selectedMethod]);

  const tangentLine = useMemo(() => {
    if (selectedMethod === 'Newton-Raphson' && currentStep) {
      try {
        const node = math.parse(equation);
        const deriv = math.derivative(node, 'x');
        const f = (x: number) => node.evaluate({ x });
        const df = (x: number) => deriv.evaluate({ x });
        
        // Use the point from the PREVIOUS iteration to show how we got to the current x
        const prevX = currentStep.iteration > 1 
          ? result?.iterations[currentStepIndex - 1].x 
          : rangeA;
        
        if (prevX !== undefined) {
          return {
            x: prevX,
            y: f(prevX),
            slope: df(prevX)
          };
        }
      } catch (e) {}
    }
    return null;
  }, [selectedMethod, currentStep, equation, result, currentStepIndex, rangeA]);

  const secantLine = useMemo(() => {
    if (selectedMethod === 'Secant' && currentStep && currentStep.a !== undefined && currentStep.b !== undefined) {
      try {
        const node = math.parse(equation);
        const f = (x: number) => node.evaluate({ x });
        return {
          x1: currentStep.a,
          y1: f(currentStep.a),
          x2: currentStep.b,
          y2: f(currentStep.b)
        };
      } catch (e) {}
    }
    return null;
  }, [selectedMethod, currentStep, equation]);

  const graphDomains = useMemo(() => {
    if (!currentStep) return { x: undefined, y: undefined };

    let xMin: number, xMax: number;
    if (currentStep.a !== undefined && currentStep.b !== undefined) {
      xMin = currentStep.a;
      xMax = currentStep.b;
    } else {
      const points = [currentStep.x, currentStep.xPrev].filter(v => v !== undefined) as number[];
      xMin = Math.min(...points);
      xMax = Math.max(...points);
    }

    if (zoomMode === 'None') {
      return { x: [rangeA - 1, rangeB + 1] as [number, number], y: [-2, 2] as [number, number] };
    }

    const center = (xMin + xMax) / 2;

    if (zoomMode === 'Zoom') {
      // Follows the center but keeps a fixed width of 2 units
      // This shows the interval lines actually decreasing in size relative to the view
      return { 
        x: [center - 1, center + 1] as [number, number], 
        y: [-2, 2] as [number, number] 
      };
    }

    if (zoomMode === 'Focus') {
      // Locked to the interval lines - they stay at the edges of the screen
      // Axis values and curve change to show convergence
      return { 
        x: [xMin, xMax] as [number, number], 
        y: [-2, 2] as [number, number] 
      };
    }

    // Add padding
    const xPadding = Math.max(Math.abs(xMax - xMin) * 0.5, 0.1);
    const xDomain: [number, number] = [xMin - xPadding, xMax + xPadding];

    // For Y domain, we want to see the curve around 0
    const yDomain: [number, number] = [-2, 2]; 

    return { x: xDomain, y: yDomain };
  }, [currentStep, zoomMode, rangeA, rangeB]);

  const reset = () => {
    setEquation('x^3 - 4*x - 1');
    setRangeA(0);
    setRangeB(3);
    setDecimalPlaces(5);
    setZoomMode('Auto');
    setResult(null);
    setCurrentStepIndex(-1);
  };

  return (
    <div className="h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-emerald-500/30 flex flex-col overflow-hidden">
      {/* Mobile Header */}
      <header className="xl:hidden h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Calculator className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Root<span className="text-emerald-500">Analyser</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowExplanation(true)}
            className="p-2 text-zinc-500 hover:text-emerald-500 transition-colors"
          >
            <Info className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-zinc-500 hover:text-emerald-500 transition-colors"
          >
            <Menu className="w-7 h-7" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Controls */}
        <AnimatePresence>
          {(isSidebarOpen || isLargeScreen) && (
            <>
              {/* Mobile Overlay */}
              {isSidebarOpen && !isLargeScreen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="xl:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                />
              )}
                <motion.aside 
                initial={isLargeScreen ? false : { x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={cn(
                  "fixed xl:relative inset-y-0 left-0 w-80 bg-zinc-900 border-r border-zinc-800 overflow-y-auto custom-scrollbar shrink-0 flex flex-col z-[70] xl:z-0",
                  !isSidebarOpen && !isLargeScreen && "hidden"
                )}
              >
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between xl:block">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Calculator className="text-white w-5 h-5" />
                      </div>
                      <h1 className="text-xl font-bold tracking-tight text-white">Root<span className="text-emerald-500">Analyser</span></h1>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowExplanation(true)}
                        className="hidden xl:block p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-emerald-500"
                        title="Show Method Explanations"
                      >
                        <Info className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="xl:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-white"
                      >
                        <X className="w-7 h-7" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-8 flex-1">
                  <section className="space-y-6">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" />
                <h2 className="text-xs uppercase tracking-widest font-bold text-zinc-400">Parameters</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Equation f(x)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={equation}
                      onChange={(e) => setEquation(e.target.value)}
                      onFocus={() => setIsAnyInputFocused(true)}
                      onBlur={() => setIsAnyInputFocused(false)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 font-mono text-emerald-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder="e.g. x^2 - 2"
                    />
                    <Search className="absolute right-4 top-3.5 w-4 h-4 text-zinc-600" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Start (a)</label>
                    <input 
                      type="number" 
                      value={rangeA}
                      onChange={(e) => setRangeA(Number(e.target.value))}
                      onFocus={() => setIsAnyInputFocused(true)}
                      onBlur={() => setIsAnyInputFocused(false)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 font-mono text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">End (b)</label>
                    <input 
                      type="number" 
                      value={rangeB}
                      onChange={(e) => setRangeB(Number(e.target.value))}
                      onFocus={() => setIsAnyInputFocused(true)}
                      onBlur={() => setIsAnyInputFocused(false)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 font-mono text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Precision</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      min="1"
                      max="15"
                      value={decimalPlaces}
                      onChange={(e) => setDecimalPlaces(Number(e.target.value))}
                      onFocus={() => setIsAnyInputFocused(true)}
                      onBlur={() => setIsAnyInputFocused(false)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 font-mono text-white focus:border-emerald-500 outline-none transition-all"
                    />
                    <span className="text-xs text-zinc-500 font-mono">digits</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-2 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Maximize2 className="w-3 h-3 text-zinc-500" />
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Zoom Behavior</span>
                    </div>
                    <div className="flex bg-zinc-900 p-1 rounded-lg">
                      {(['None', 'Auto', 'Focus'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setZoomMode(mode)}
                          className={cn(
                            "flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all",
                            zoomMode === mode 
                              ? "bg-zinc-800 text-white shadow-sm" 
                              : "text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all", 
                        liveSync 
                          ? (isAnyInputFocused ? "bg-amber-500" : "bg-emerald-500 animate-pulse") 
                          : "bg-zinc-600"
                      )} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live Sync</span>
                        {liveSync && isAnyInputFocused && (
                          <span className="text-[8px] text-amber-500/70 font-medium uppercase tracking-tighter">Paused while typing</span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => setLiveSync(!liveSync)}
                      className={cn(
                        "w-8 h-4 rounded-full transition-all relative",
                        liveSync ? "bg-emerald-500" : "bg-zinc-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                        liveSync ? "right-0.5" : "left-0.5"
                      )} />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={solve}
                      disabled={isSolving}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      {isSolving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                      {liveSync ? 'Re-Solve' : 'Solve'}
                    </button>
                    <button 
                      onClick={reset}
                      className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all"
                      title="Reset"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <h2 className="text-xs uppercase tracking-widest font-bold text-zinc-400">Method</h2>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {(['Bisection', 'Regula-Falsi', 'Newton-Raphson', 'Secant'] as Method[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMethod(m)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-xs font-medium",
                      selectedMethod === m 
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    )}
                  >
                    {m}
                    {selectedMethod === m && <ChevronRight className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </motion.aside>
        </>
      )}
    </AnimatePresence>

    {/* Main Content: Graph */}
    <section className="flex-1 bg-zinc-950 relative flex flex-col min-w-0 overflow-hidden">
      {/* Main Visualization Area */}
      <div className="flex-1 p-3 pb-20 xl:p-6 xl:pb-24 flex flex-col min-h-0 xl:overflow-hidden overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4 xl:mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <ChartIcon className="w-6 h-6 text-emerald-500" />
            <h2 className="text-xl xl:text-2xl font-bold text-white tracking-tight">Visualization</h2>
          </div>
        </div>
        
        <div className="flex-none xl:flex-1 flex flex-col xl:grid xl:grid-cols-[2fr_1fr] landscape:grid landscape:grid-cols-[2fr_1fr] landscape:grid-rows-[1fr_auto] gap-4 xl:gap-6 min-h-0">
          {/* Graph Card: Order 1 */}
          <div className="order-1 flex flex-col aspect-square landscape:aspect-auto xl:aspect-auto min-h-[300px] sm:min-h-[350px] xl:min-h-0 landscape:min-h-0 bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden relative shadow-2xl">
            <Graph 
              equation={equation} 
              range={[rangeA - 1, rangeB + 1]} 
              points={graphPoints}
              interval={graphInterval}
              xDomain={graphDomains.x}
              yDomain={graphDomains.y}
              tangent={tangentLine}
              secant={secantLine}
              finalRoot={result?.root}
            />
          </div>

          {/* Step Control: Always visible after graph */}
          {result && result.iterations.length > 0 && (
            <div className="order-2 xl:order-3 landscape:order-3 xl:col-span-2 landscape:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-3 xl:p-4 flex items-center justify-between gap-4 shadow-xl shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <h3 className="text-[10px] xl:text-[11px] uppercase tracking-widest font-bold text-zinc-500">Steps</h3>
              </div>
              
              <div className="flex-1 flex items-center gap-4">
                <button 
                  onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentStepIndex <= 0}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-xl transition-all"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                
                <div className="flex-1 relative">
                  <input 
                    type="range" 
                    min="0" 
                    max={result.iterations.length - 1} 
                    value={currentStepIndex}
                    onChange={(e) => setCurrentStepIndex(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <button 
                  onClick={() => setCurrentStepIndex(prev => Math.min(result.iterations.length - 1, prev + 1))}
                  disabled={currentStepIndex >= result.iterations.length - 1}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-xl transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-center min-w-[60px] xl:min-w-[100px]">
                <span className="text-base xl:text-xl font-mono text-emerald-500 font-bold">
                  {currentStepIndex + 1}
                </span>
                <span className="text-[10px] xl:text-sm text-zinc-600 mx-1">/</span>
                <span className="text-[10px] xl:text-sm font-mono text-zinc-500">
                  {result.iterations.length}
                </span>
              </div>
            </div>
          )}

          {/* Iteration Panel: Order 3 on mobile portrait, Order 2 on landscape/desktop */}
          <div className="order-3 xl:order-2 landscape:order-2 w-full min-h-0 flex flex-col">
            <div className="flex-none xl:flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 xl:p-6 space-y-6 xl:space-y-8 xl:overflow-y-auto custom-scrollbar shadow-2xl">
              <div className="space-y-1">
                <h3 className="text-[10px] xl:text-[11px] uppercase tracking-widest font-bold text-zinc-500">Current Iteration</h3>
                <p className="text-4xl xl:text-4xl font-mono text-white tracking-tighter">#{currentStepIndex + 1}</p>
              </div>

              {currentStep && (
                <div className="space-y-6 xl:space-y-8">
                  <div className="space-y-1 xl:space-y-2">
                    <p className="text-[10px] xl:text-[10px] uppercase tracking-widest text-zinc-500 font-bold">x Value</p>
                    <div className="overflow-x-auto custom-scrollbar-h pb-1">
                      <p className="text-lg xl:text-lg font-mono text-blue-400 whitespace-nowrap tracking-tight">{currentStep.x.toFixed(decimalPlaces + 2)}</p>
                    </div>
                  </div>

                  <div className="space-y-1 xl:space-y-2">
                    <p className="text-[10px] xl:text-[10px] uppercase tracking-widest text-zinc-500 font-bold">f(x)</p>
                    <div className="overflow-x-auto custom-scrollbar-h pb-1">
                      <p className="text-lg xl:text-lg font-mono text-emerald-500 whitespace-nowrap tracking-tight">{currentStep.fx.toExponential(6)}</p>
                    </div>
                  </div>

                  {(currentStep.a !== undefined && currentStep.b !== undefined) && (
                    <div className="space-y-1 xl:space-y-2">
                      <p className="text-[10px] xl:text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Interval [a, b]</p>
                      <div className="overflow-x-auto custom-scrollbar-h pb-1">
                        <p className="text-sm xl:text-base font-mono text-blue-500 whitespace-nowrap tracking-tight">
                          [{currentStep.a.toFixed(4)}, {currentStep.b.toFixed(4)}]
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 xl:space-y-2">
                    <p className="text-[10px] xl:text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Error</p>
                    <div className="overflow-x-auto custom-scrollbar-h pb-1">
                      <p className="text-lg xl:text-lg font-mono text-rose-500 whitespace-nowrap tracking-tight">{currentStep.error.toExponential(6)}</p>
                    </div>
                  </div>

                  {/* Function Overview: Shown on all devices */}
                  <div className="pt-6 border-t border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                      <ChartIcon className="w-4 h-4 text-zinc-500" />
                      <p className="text-[9px] xl:text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Function Overview</p>
                    </div>
                    <div className="aspect-square w-full bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 shadow-inner relative group pointer-events-none select-none">
                      {(() => {
                        const limit = Math.max(0.1, Math.abs(rangeA) + Math.abs(rangeB));
                        const limitStr = limit.toFixed(1);
                        return (
                          <>
                            <Graph 
                              equation={equation} 
                              range={[-limit, limit]} 
                              xDomain={[-limit, limit]}
                              yDomain={[-limit, limit]}
                              points={result?.root ? [{ x: result.root, y: 0, color: '#a855f7' }] : []}
                              minimal={true}
                            />
                            {/* Coordinate Labels */}
                            <div className="absolute top-2 left-2 text-[8px] font-mono text-zinc-600 pointer-events-none">
                              (-{limitStr}, {limitStr})
                            </div>
                            <div className="absolute top-2 right-2 text-[8px] font-mono text-zinc-600 pointer-events-none">
                              ({limitStr}, {limitStr})
                            </div>
                            <div className="absolute bottom-2 left-2 text-[8px] font-mono text-zinc-600 pointer-events-none">
                              (-{limitStr}, -{limitStr})
                            </div>
                            <div className="absolute bottom-2 right-2 text-[8px] font-mono text-zinc-600 pointer-events-none">
                              ({limitStr}, -{limitStr})
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {!currentStep && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20">
                  <Info className="w-12 h-12 mb-4" />
                  <p className="text-[11px] uppercase tracking-widest font-bold">No step selected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Accordion: Table */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 transition-all duration-500 ease-in-out z-40 flex flex-col shrink-0",
          isTableOpen ? "h-[85%] xl:h-[60%]" : "h-14"
        )}
      >
            {/* Accordion Handle */}
            <button 
              onClick={() => setIsTableOpen(!isTableOpen)}
              className="h-14 flex items-center justify-between px-6 hover:bg-zinc-800 transition-colors shrink-0"
            >
              <div className="flex items-center gap-4">
                <Target className="w-5 h-5 text-emerald-500" />
                <span className="text-[11px] uppercase tracking-widest font-bold text-zinc-400">
                  {result ? `Solver Results (${result.method})` : 'Waiting for results...'}
                </span>
                {result && !result.error && (
                  <span className="text-[11px] font-mono text-emerald-500 ml-4 hidden sm:inline">
                    Root: {result.root?.toFixed(decimalPlaces)} • {result.iterations.length} Iterations
                  </span>
                )}
              </div>
              {isTableOpen ? <ChevronDown className="w-5 h-5 text-zinc-500" /> : <ChevronUp className="w-5 h-5 text-zinc-500" />}
            </button>

            {/* Accordion Content */}
            <div className="flex-1 overflow-hidden p-6 pt-0 flex flex-col gap-4">
              {!result ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                  <Info className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-[10px] uppercase tracking-widest font-bold">Configure parameters to see results</p>
                </div>
              ) : result.error ? (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-rose-400 flex items-start gap-4">
                  <Info className="w-6 h-6 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold mb-1">Calculation Error</h3>
                    <p className="text-xs opacity-80">{result.error}</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                      <p className="text-[8px] xl:text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Approx. Root</p>
                      <div className="overflow-x-auto custom-scrollbar-h">
                        <p className="text-xl xl:text-2xl font-mono text-emerald-400 tracking-tighter whitespace-nowrap">
                          {result.root?.toFixed(decimalPlaces)}
                        </p>
                      </div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                      <p className="text-[8px] xl:text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Iterations</p>
                      <p className="text-xl xl:text-2xl font-mono text-white tracking-tighter">{result.iterations.length}</p>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                      <p className="text-[8px] xl:text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Final Error</p>
                      <div className="overflow-x-auto custom-scrollbar-h">
                        <p className="text-xl xl:text-2xl font-mono text-red-500 tracking-tighter whitespace-nowrap">
                          {result.iterations[result.iterations.length - 1]?.error.toExponential(4)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
                    <div className="overflow-auto custom-scrollbar flex-1">
                      <table className="w-full text-left text-[11px] xl:text-xs font-mono whitespace-nowrap">
                        <thead className="sticky top-0 bg-zinc-950 z-10">
                          <tr className="text-zinc-600 border-b border-zinc-800">
                            <th className="px-4 py-4 font-normal">n</th>
                            <th className="px-4 py-4 font-normal">{selectedMethod === 'Newton-Raphson' ? 'x_n' : 'a'}</th>
                            <th className="px-4 py-4 font-normal">{selectedMethod === 'Newton-Raphson' ? "f'(x_n)" : 'b'}</th>
                            <th className="px-4 py-4 font-normal">{selectedMethod === 'Newton-Raphson' ? 'f(x_n)' : 'f(a)'}</th>
                            <th className="px-4 py-4 font-normal">{selectedMethod === 'Newton-Raphson' ? '-' : 'f(b)'}</th>
                            <th className="px-4 py-4 font-normal">{selectedMethod === 'Newton-Raphson' ? 'x_{n+1}' : 'x'}</th>
                            <th className="px-4 py-4 font-normal">f(x)</th>
                            <th className="px-4 py-4 font-normal">Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {result.iterations.map((it, idx) => (
                            <tr 
                              key={it.iteration} 
                              onClick={() => setCurrentStepIndex(idx)}
                              className={cn(
                                "group cursor-pointer transition-colors",
                                currentStepIndex === idx ? "bg-emerald-500/10" : "hover:bg-zinc-800/30"
                              )}
                            >
                              <td className="px-4 py-4 text-zinc-500">{it.iteration}</td>
                              <td className="px-4 py-4 text-zinc-200">{it.a?.toFixed(8) ?? '-'}</td>
                              <td className="px-4 py-4 text-zinc-200">{it.b?.toFixed(8) ?? '-'}</td>
                              <td className="px-4 py-4 text-zinc-400">{it.fa?.toExponential(4) ?? '-'}</td>
                              <td className="px-4 py-4 text-zinc-400">{it.fb?.toExponential(4) ?? '-'}</td>
                              <td className="px-4 py-4 text-zinc-200 font-bold text-emerald-400">{it.x.toFixed(8)}</td>
                              <td className="px-4 py-4 text-zinc-400">{it.fx.toExponential(4)}</td>
                              <td className="px-4 py-4 text-emerald-500/70">{it.error.toExponential(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {showExplanation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExplanation(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <Info className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Numerical Methods</h2>
                    <p className="text-xs text-zinc-500">Understanding how RootAnalyser finds solutions</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowExplanation(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                <section className="space-y-3">
                  <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Bisection Method
                  </h3>
                  <div className="text-sm text-zinc-400 leading-relaxed">
                    A reliable bracketing method that repeatedly divides an interval in half. If the function changes sign over an interval <InlineMath math="[a, b]" />, a root must exist.
                  </div>
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 my-2 overflow-x-auto custom-scrollbar-h">
                    <BlockMath math="x = \frac{a + b}{2}" />
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    By checking the sign at the midpoint, we narrow the search. It is slow but guaranteed to converge if the initial interval is correct.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Regula-Falsi (False Position)
                  </h3>
                  <div className="text-sm text-zinc-400 leading-relaxed">
                    Similar to Bisection, but instead of using the midpoint, it uses a straight line (chord) connecting <InlineMath math="(a, f(a))" /> and <InlineMath math="(b, f(b))" />.
                  </div>
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 my-2 overflow-x-auto custom-scrollbar-h">
                    <BlockMath math="x = \frac{a \cdot f(b) - b \cdot f(a)}{f(b) - f(a)}" />
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    The point where this line crosses the x-axis is the next approximation. It often converges faster than Bisection.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Newton-Raphson Method
                  </h3>
                  <div className="text-sm text-zinc-400 leading-relaxed">
                    A powerful "open" method that uses the function's derivative. Starting from a single guess <InlineMath math="x_n" />, it follows the tangent line:
                  </div>
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 my-2 overflow-x-auto custom-scrollbar-h">
                    <BlockMath math="x_{n+1} = x_n - \frac{f(x_n)}{f'(x_n)}" />
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    It converges extremely fast (quadratically) but requires the derivative and a good initial guess.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Secant Method
                  </h3>
                  <div className="text-sm text-zinc-400 leading-relaxed">
                    An open method similar to Newton-Raphson but avoids the need for a derivative by using the slope of the secant line:
                  </div>
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 my-2 overflow-x-auto custom-scrollbar-h">
                    <BlockMath math="x_{n+1} = x_n - f(x_n) \cdot \frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}" />
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    It is generally faster than bracketing methods but slightly slower than Newton-Raphson.
                  </p>
                </section>
              </div>

              <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex justify-end">
                <button 
                  onClick={() => setShowExplanation(false)}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
