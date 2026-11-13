import {
  Calculator as CalculatorIcon,
  History,
  Keyboard,
  Moon,
  Scale,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalculatorDisplay } from './components/CalculatorDisplay';
import { CalculatorKeypad, KeypadHandlers } from './components/CalculatorKeypad';
import { HistoryTapePanel } from './components/HistoryTapePanel';
import { UnitConverterPanel } from './components/UnitConverterPanel';
import { AngleUnit, CalculatorMode, HistoryEntry, SidePanelTab } from './types/calculator';
import {
  cleanFloat,
  evaluateExpression,
  formatExpressionForDisplay,
  formatNumber,
  formatRawNumberInput,
} from './utils/calculatorEngine';
import { playKeyClick } from './utils/sound';

const STORAGE_KEYS = {
  HISTORY: 'precision_calc_history_v1',
  THEME: 'precision_calc_theme_v1',
  SOUND: 'precision_calc_sound_v1',
  MODE: 'precision_calc_mode_v1',
} as const;

const OPERATORS = new Set(['+', '-', '*', '/', '^']);

function getTrailingNumberMatch(expr: string): { prefix: string; num: string } | null {
  const match = expr.match(/^(.*?)(\(-[0-9.]+\)|[0-9.]+)$/);
  if (!match) return null;
  return { prefix: match[1], num: match[2] };
}

function getLastValueSegment(expr: string, angleUnit: AngleUnit): string {
  if (!expr) return '0';
  // Check trailing wrapped negative like (-12)
  const negMatch = expr.match(/\(-([0-9.]+)\)$/);
  if (negMatch) {
    return `-${formatRawNumberInput(negMatch[1])}`;
  }
  // Check trailing number
  const numMatch = expr.match(/([0-9.]+)$/);
  if (numMatch) {
    return formatRawNumberInput(numMatch[1]);
  }
  // If ending in operator, show evaluated left side cleanly
  const trimmed = expr.replace(/[+\-*/^]+$/, '');
  if (trimmed) {
    const res = evaluateExpression(trimmed, angleUnit);
    if (res.ok && res.formatted) return res.formatted;
  }
  return formatExpressionForDisplay(expr) || '0';
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.SOUND) === 'true';
    } catch {
      return false;
    }
  });

  const [mode, setMode] = useState<CalculatorMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODE);
      return saved === 'scientific' ? 'scientific' : 'standard';
    } catch {
      return 'standard';
    }
  });

  const [angleUnit, setAngleUnit] = useState<AngleUnit>('DEG');
  const [sideTab, setSideTab] = useState<SidePanelTab>('history');
  const [mobileView, setMobileView] = useState<'calculator' | 'history' | 'converter'>('calculator');
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [expression, setExpression] = useState<string>('');
  const [isEvaluated, setIsEvaluated] = useState<boolean>(false);
  const [lastAnswer, setLastAnswer] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [memoryValue, setMemoryValue] = useState<number>(0);
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const keyFlashTimerRef = useRef<number | null>(null);

  // Sync dark class on documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [isDark]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND, String(soundEnabled));
    } catch {
      // Ignore storage errors
    }
  }, [soundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MODE, mode);
    } catch {
      // Ignore storage errors
    }
  }, [mode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch {
      // Ignore storage errors
    }
  }, [history]);

  const triggerFeedback = useCallback(
    (keyId: string, soundType: 'digit' | 'operator' | 'equals' | 'clear' = 'digit') => {
      if (soundEnabled) {
        playKeyClick(soundType);
      }
      setActiveKeyId(keyId);
      if (keyFlashTimerRef.current !== null) {
        window.clearTimeout(keyFlashTimerRef.current);
      }
      keyFlashTimerRef.current = window.setTimeout(() => {
        setActiveKeyId(null);
      }, 130);
    },
    [soundEnabled]
  );

  // Live preview only when expression has an operator, function, or parenthesis
  const livePreview = useMemo(() => {
    if (!expression || isEvaluated || errorMessage) return null;
    const hasOperatorOrFunc = /[+\-*/^%()a-zA-Z!]/.test(expression.replace(/^-/, ''));
    if (!hasOperatorOrFunc) return null;

    // Do not preview if ending with a dangling binary operator
    if (/[+\-*/^(]$/.test(expression)) return null;

    const evalRes = evaluateExpression(expression, angleUnit);
    if (evalRes.ok && evalRes.formatted) {
      return evalRes.formatted;
    }
    return null;
  }, [expression, isEvaluated, errorMessage, angleUnit]);

  const displayValue = useMemo(() => {
    if (errorMessage) return '오류';
    if (isEvaluated) return formatNumber(lastAnswer);
    if (!expression) return '0';
    return getLastValueSegment(expression, angleUnit);
  }, [errorMessage, isEvaluated, lastAnswer, expression, angleUnit]);

  const getCurrentNumericValue = useCallback((): number | null => {
    if (errorMessage) return null;
    if (isEvaluated) return lastAnswer;
    if (!expression) return 0;
    const cleanExpr = expression.replace(/[+\-*/^(]+$/, '');
    if (!cleanExpr) return 0;
    const res = evaluateExpression(cleanExpr, angleUnit);
    return res.ok && res.value !== undefined ? res.value : null;
  }, [errorMessage, isEvaluated, lastAnswer, expression, angleUnit]);

  const handleDigit = useCallback(
    (digit: string) => {
      triggerFeedback(digit, 'digit');
      setErrorMessage(null);

      if (isEvaluated) {
        setExpression(digit);
        setIsEvaluated(false);
        return;
      }

      setExpression((prev) => {
        if (!prev) return digit;
        // Replace leading lone zero in current segment (e.g. "0" -> "5", "12+0" -> "12+5")
        const zeroMatch = prev.match(/^(.*?)0$/);
        if (zeroMatch) {
          const beforeZero = zeroMatch[1];
          if (beforeZero === '' || /[+\-*/^(]$/.test(beforeZero)) {
            return `${beforeZero}${digit}`;
          }
        }
        return `${prev}${digit}`;
      });
    },
    [isEvaluated, triggerFeedback]
  );

  const handleDecimal = useCallback(() => {
    triggerFeedback('.', 'digit');
    setErrorMessage(null);

    if (isEvaluated) {
      setExpression('0.');
      setIsEvaluated(false);
      return;
    }

    setExpression((prev) => {
      if (!prev || /[+\-*/^(]$/.test(prev)) {
        return `${prev}0.`;
      }
      // Check if trailing number segment already has a decimal point
      const trailingNum = prev.match(/([0-9.]+)$/);
      if (trailingNum && trailingNum[1].includes('.')) {
        return prev;
      }
      if (/[)e!%]$/.test(prev) || prev.endsWith('pi')) {
        return `${prev}*0.`;
      }
      return `${prev}.`;
    });
  }, [isEvaluated, triggerFeedback]);

  const handleOperator = useCallback(
    (op: '+' | '-' | '*' | '/' | '^') => {
      triggerFeedback(op, 'operator');
      if (errorMessage) {
        setErrorMessage(null);
        setExpression(op === '-' ? '-' : '');
        setIsEvaluated(false);
        return;
      }

      if (isEvaluated) {
        setExpression(`${lastAnswer}${op}`);
        setIsEvaluated(false);
        return;
      }

      setExpression((prev) => {
        if (!prev) {
          return op === '-' ? '-' : `0${op}`;
        }
        if (prev === '-') {
          return op === '-' ? '-' : '0' + op;
        }
        if (prev.endsWith('(')) {
          return op === '-' ? `${prev}-` : prev;
        }
        const lastChar = prev[prev.length - 1];
        if (OPERATORS.has(lastChar)) {
          // Allow replacing operator unless previous was '(' + '-'
          if (prev.length >= 2 && prev[prev.length - 2] === '(' && lastChar === '-') {
            return prev;
          }
          return `${prev.slice(0, -1)}${op}`;
        }
        return `${prev}${op}`;
      });
    },
    [errorMessage, isEvaluated, lastAnswer, triggerFeedback]
  );

  const handleEquals = useCallback(() => {
    triggerFeedback('Enter', 'equals');
    if (errorMessage) {
      setErrorMessage(null);
      setExpression('');
      setIsEvaluated(false);
      return;
    }

    if (!expression) return;

    // Trim trailing dangling operator if user pressed = right after + or *
    const sanitized = expression.replace(/[+\-*/^]+$/, '');
    if (!sanitized) return;

    const evalRes = evaluateExpression(sanitized, angleUnit);
    if (!evalRes.ok || evalRes.value === undefined || !evalRes.formatted) {
      setErrorMessage(evalRes.error ?? '계산 오류');
      setIsEvaluated(false);
      return;
    }

    const numericVal = evalRes.value;
    const formattedVal = evalRes.formatted;
    const formattedExpr = formatExpressionForDisplay(sanitized);

    setLastAnswer(numericVal);
    setExpression(sanitized);
    setIsEvaluated(true);

    // Avoid duplicate consecutive identical history entries
    setHistory((prev) => {
      const top = prev[0];
      if (top && top.expression === sanitized && top.result === formattedVal) {
        return prev;
      }
      const nextEntry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        expression: sanitized,
        formattedExpression: formattedExpr,
        result: formattedVal,
        numericResult: numericVal,
        mode,
        angleUnit,
        timestamp: Date.now(),
      };
      return [nextEntry, ...prev].slice(0, 100);
    });
  }, [angleUnit, errorMessage, expression, mode, triggerFeedback]);

  const handleClearAll = useCallback(() => {
    triggerFeedback('Escape', 'clear');
    setExpression('');
    setIsEvaluated(false);
    setErrorMessage(null);
  }, [triggerFeedback]);

  const handleClearEntry = useCallback(() => {
    triggerFeedback('ce', 'clear');
    setErrorMessage(null);
    if (isEvaluated) {
      setExpression('');
      setIsEvaluated(false);
      return;
    }
    setExpression((prev) => {
      const match = getTrailingNumberMatch(prev);
      if (match) return match.prefix;
      return '';
    });
  }, [isEvaluated, triggerFeedback]);

  const handleBackspace = useCallback(() => {
    triggerFeedback('Backspace', 'clear');
    if (errorMessage) {
      setErrorMessage(null);
      setExpression('');
      setIsEvaluated(false);
      return;
    }
    if (isEvaluated) {
      setIsEvaluated(false);
      setExpression(String(lastAnswer).slice(0, -1));
      return;
    }
    setExpression((prev) => {
      if (!prev) return '';
      // Remove full function tokens cleanly like "sin(" or "sqrt(" or "pi"
      const funcMatch = prev.match(/(asin\(|acos\(|atan\(|sin\(|cos\(|tan\(|sqrt\(|log\(|ln\(|abs\(|pi)$/);
      if (funcMatch) {
        return prev.slice(0, -funcMatch[1].length);
      }
      return prev.slice(0, -1);
    });
  }, [errorMessage, isEvaluated, lastAnswer, triggerFeedback]);

  const handleToggleSign = useCallback(() => {
    triggerFeedback('sign', 'operator');
    setErrorMessage(null);
    if (isEvaluated) {
      const negated = cleanFloat(-lastAnswer);
      setLastAnswer(negated);
      setExpression(String(negated));
      return;
    }

    setExpression((prev) => {
      if (!prev) return '-';
      if (prev === '-') return '';

      // If wrapped as (-123)
      const wrappedMatch = prev.match(/^(.*)\(-([0-9.]+)\)$/);
      if (wrappedMatch) {
        return `${wrappedMatch[1]}${wrappedMatch[2]}`;
      }

      // If entire expression is just -123
      if (/^-[0-9.]+$/.test(prev)) {
        return prev.slice(1);
      }

      // Trailing number
      const numMatch = prev.match(/^(.*?)([0-9.]+)$/);
      if (numMatch) {
        const prefix = numMatch[1];
        const num = numMatch[2];
        if (!prefix) return `-${num}`;
        return `${prefix}(-${num})`;
      }

      return prev;
    });
  }, [isEvaluated, lastAnswer, triggerFeedback]);

  const handlePercent = useCallback(() => {
    triggerFeedback('%', 'operator');
    setErrorMessage(null);
    if (isEvaluated) {
      const pct = cleanFloat(lastAnswer / 100);
      setLastAnswer(pct);
      setExpression(String(pct));
      return;
    }
    setExpression((prev) => {
      if (!prev || /[+\-*/^(%]$/.test(prev)) return prev;
      return `${prev}%`;
    });
  }, [isEvaluated, lastAnswer, triggerFeedback]);

  const handleParen = useCallback(
    (paren: '(' | ')') => {
      triggerFeedback(paren, 'operator');
      setErrorMessage(null);
      if (isEvaluated) {
        if (paren === '(') {
          setExpression('(');
          setIsEvaluated(false);
        }
        return;
      }

      setExpression((prev) => {
        if (paren === ')') {
          const openCount = (prev.match(/\(/g) ?? []).length;
          const closeCount = (prev.match(/\)/g) ?? []).length;
          if (openCount <= closeCount || /[+\-*/^(]$/.test(prev) || !prev) {
            return prev;
          }
        }
        return `${prev}${paren}`;
      });
    },
    [isEvaluated, triggerFeedback]
  );

  const handleFunction = useCallback(
    (fn: string) => {
      triggerFeedback(fn, 'operator');
      setErrorMessage(null);
      if (isEvaluated) {
        setExpression(`${fn}(${lastAnswer})`);
        setIsEvaluated(false);
        return;
      }
      setExpression((prev) => `${prev}${fn}(`);
    },
    [isEvaluated, lastAnswer, triggerFeedback]
  );

  const handleConstant = useCallback(
    (constant: 'pi' | 'e') => {
      triggerFeedback(constant, 'digit');
      setErrorMessage(null);
      if (isEvaluated) {
        setExpression(constant);
        setIsEvaluated(false);
        return;
      }
      setExpression((prev) => `${prev}${constant}`);
    },
    [isEvaluated, triggerFeedback]
  );

  const handleFactorial = useCallback(() => {
    triggerFeedback('!', 'operator');
    setErrorMessage(null);
    if (isEvaluated) {
      setExpression(`${lastAnswer}!`);
      setIsEvaluated(false);
      return;
    }
    setExpression((prev) => {
      if (!prev || /[+\-*/^(]$/.test(prev)) return prev;
      return `${prev}!`;
    });
  }, [isEvaluated, lastAnswer, triggerFeedback]);

  const handleSquare = useCallback(() => {
    triggerFeedback('sq', 'operator');
    setErrorMessage(null);
    if (isEvaluated) {
      setExpression(`(${lastAnswer})^2`);
      setIsEvaluated(false);
      return;
    }
    setExpression((prev) => {
      if (!prev || /[+\-*/^(]$/.test(prev)) return prev;
      return `${prev}^2`;
    });
  }, [isEvaluated, lastAnswer, triggerFeedback]);

  const handleReciprocal = useCallback(() => {
    triggerFeedback('recip', 'operator');
    setErrorMessage(null);
    if (isEvaluated) {
      setExpression(`1/(${lastAnswer})`);
      setIsEvaluated(false);
      return;
    }
    setExpression((prev) => {
      if (!prev) return '1/(';
      const match = getTrailingNumberMatch(prev);
      if (match) {
        return `${match.prefix}1/(${match.num})`;
      }
      return `${prev}1/(`;
    });
  }, [isEvaluated, lastAnswer, triggerFeedback]);

  const handleTenPower = useCallback(() => {
    triggerFeedback('10^', 'operator');
    setErrorMessage(null);
    if (isEvaluated) {
      setExpression('10^');
      setIsEvaluated(false);
      return;
    }
    setExpression((prev) => `${prev}10^`);
  }, [isEvaluated, triggerFeedback]);

  const handleExp = useCallback(() => {
    triggerFeedback('exp', 'operator');
    setErrorMessage(null);
    if (isEvaluated) {
      setExpression(`${lastAnswer}*10^`);
      setIsEvaluated(false);
      return;
    }
    setExpression((prev) => {
      if (!prev) return '1*10^';
      if (/[+\-*/^(]$/.test(prev)) return `${prev}10^`;
      return `${prev}*10^`;
    });
  }, [isEvaluated, lastAnswer, triggerFeedback]);

  const handleMemory = useCallback(
    (action: 'MC' | 'MR' | 'M+' | 'M-' | 'MS') => {
      triggerFeedback(action, 'operator');
      if (action === 'MC') {
        setMemoryValue(0);
        return;
      }
      if (action === 'MR') {
        setErrorMessage(null);
        const memStr = String(memoryValue);
        if (isEvaluated || !expression) {
          setExpression(memStr);
          setIsEvaluated(false);
        } else {
          setExpression((prev) => `${prev}${memStr}`);
        }
        return;
      }

      const currentVal = getCurrentNumericValue();
      if (currentVal === null) return;

      if (action === 'MS') {
        setMemoryValue(cleanFloat(currentVal));
      } else if (action === 'M+') {
        setMemoryValue((prev) => cleanFloat(prev + currentVal));
      } else if (action === 'M-') {
        setMemoryValue((prev) => cleanFloat(prev - currentVal));
      }
    },
    [expression, getCurrentNumericValue, isEvaluated, memoryValue, triggerFeedback]
  );

  const handlers: KeypadHandlers = useMemo(
    () => ({
      onDigit: handleDigit,
      onDecimal: handleDecimal,
      onOperator: handleOperator,
      onEquals: handleEquals,
      onClearAll: handleClearAll,
      onClearEntry: handleClearEntry,
      onToggleSign: handleToggleSign,
      onPercent: handlePercent,
      onParen: handleParen,
      onFunction: handleFunction,
      onConstant: handleConstant,
      onFactorial: handleFactorial,
      onSquare: handleSquare,
      onReciprocal: handleReciprocal,
      onTenPower: handleTenPower,
      onExp: handleExp,
      onMemory: handleMemory,
    }),
    [
      handleDigit,
      handleDecimal,
      handleOperator,
      handleEquals,
      handleClearAll,
      handleClearEntry,
      handleToggleSign,
      handlePercent,
      handleParen,
      handleFunction,
      handleConstant,
      handleFactorial,
      handleSquare,
      handleReciprocal,
      handleTenPower,
      handleExp,
      handleMemory,
    ]
  );

  // Full Physical Keyboard Support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const { key } = e;

      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        handleDigit(key);
      } else if (key === '.') {
        e.preventDefault();
        handleDecimal();
      } else if (key === '+' || key === '-' || key === '*' || key === '/' || key === '^') {
        e.preventDefault();
        handleOperator(key);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (key === 'Escape' || key === 'Delete') {
        e.preventDefault();
        handleClearAll();
      } else if (key === '%') {
        e.preventDefault();
        handlePercent();
      } else if (key === '(' || key === ')') {
        e.preventDefault();
        handleParen(key);
      } else if (key === '!') {
        e.preventDefault();
        handleFactorial();
      } else if (mode === 'scientific') {
        const lower = key.toLowerCase();
        if (lower === 's') {
          e.preventDefault();
          handleFunction('sin');
        } else if (lower === 'c') {
          e.preventDefault();
          handleFunction('cos');
        } else if (lower === 't') {
          e.preventDefault();
          handleFunction('tan');
        } else if (lower === 'l') {
          e.preventDefault();
          handleFunction('log');
        } else if (lower === 'p') {
          e.preventDefault();
          handleConstant('pi');
        } else if (lower === 'r') {
          e.preventDefault();
          handleFunction('sqrt');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleBackspace,
    handleClearAll,
    handleConstant,
    handleDecimal,
    handleDigit,
    handleEquals,
    handleFactorial,
    handleFunction,
    handleOperator,
    handleParen,
    handlePercent,
    mode,
  ]);

  const handleRecallResult = (entry: HistoryEntry) => {
    setErrorMessage(null);
    const valStr = String(entry.numericResult);
    if (isEvaluated || !expression) {
      setExpression(valStr);
      setIsEvaluated(false);
    } else {
      setExpression((prev) => `${prev}${valStr}`);
    }
    setMobileView('calculator');
  };

  const handleRecallExpression = (entry: HistoryEntry) => {
    setErrorMessage(null);
    setExpression(entry.expression);
    setMode(entry.mode);
    setAngleUnit(entry.angleUnit);
    setIsEvaluated(false);
    setMobileView('calculator');
  };

  const handleSendConvertedValue = (value: number) => {
    setErrorMessage(null);
    setExpression(String(cleanFloat(value)));
    setIsEvaluated(false);
    setMobileView('calculator');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F4F2] dark:bg-[#111214] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Compact Top Bar */}
      <header className="border-b border-stone-200/90 dark:border-zinc-800/90 bg-[#F4F4F2]/90 dark:bg-[#111214]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-8">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <span className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center">
              <CalculatorIcon className="w-4 h-4" />
            </span>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50 whitespace-nowrap shrink-0">
              정밀 계산기
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowShortcuts((prev) => !prev)}
              aria-expanded={showShortcuts}
              aria-label="키보드 단축키 안내"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-orange-500 ${
                showShortcuts
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-stone-200/70 dark:hover:bg-zinc-800'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>단축키</span>
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? '버튼 효과음 끄기' : '버튼 효과음 켜기'}
              title={soundEnabled ? '효과음 켜짐' : '효과음 꺼짐'}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-stone-200/70 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-orange-500"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{soundEnabled ? '소리 켜짐' : '소리 꺼짐'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-stone-200/70 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-orange-500"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              <span className="hidden sm:inline">{isDark ? '라이트' : '다크'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Optional Keyboard Shortcuts Reference Bar */}
      {showShortcuts && (
        <div className="border-b border-stone-200 dark:border-zinc-800 bg-white/70 dark:bg-[#16181C]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">키보드 입력 지원</span>
            <span className="font-mono-tabular">0–9 · . · + − × ÷</span>
            <span>Enter / = : 계산</span>
            <span>Backspace : 한 글자 지우기</span>
            <span>Esc : 전체 지우기</span>
            <span>( ) % ^ ! : 괄호·퍼센트·거듭제곱·팩토리얼</span>
            {mode === 'scientific' && (
              <span>s / c / t / l / r / p : sin·cos·tan·log·√·π</span>
            )}
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Mobile View Switcher (< lg) */}
        <div className="lg:hidden mb-4 grid grid-cols-3 gap-1 p-1 rounded-xl bg-stone-200/80 dark:bg-[#191B1F]">
          <button
            type="button"
            onClick={() => setMobileView('calculator')}
            className={`min-h-[42px] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
              mobileView === 'calculator'
                ? 'bg-white dark:bg-[#25282E] text-zinc-950 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <CalculatorIcon className="w-3.5 h-3.5" />
            <span>계산기</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileView('history')}
            className={`min-h-[42px] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
              mobileView === 'history'
                ? 'bg-white dark:bg-[#25282E] text-zinc-950 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>기록 ({history.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileView('converter')}
            className={`min-h-[42px] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
              mobileView === 'converter'
                ? 'bg-white dark:bg-[#25282E] text-zinc-950 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>단위 변환</span>
          </button>
        </div>

        {/* Desktop 2-Column Precision Workstation / Mobile Focused View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Primary Focal Anchor: Calculator Instrument */}
          <section
            aria-label="계산기 본체"
            className={`lg:col-span-7 bg-white dark:bg-[#1A1C20] border border-stone-200/90 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.35)] ${
              mobileView !== 'calculator' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* Mode Switcher Toolbar */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div
                role="tablist"
                aria-label="계산기 모드"
                className="inline-flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-[#131518]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'standard'}
                  onClick={() => setMode('standard')}
                  className={`px-3.5 py-1.5 min-h-[36px] text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-orange-500 ${
                    mode === 'standard'
                      ? 'bg-white dark:bg-[#24272D] text-zinc-950 dark:text-zinc-50 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  표준 계산
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'scientific'}
                  onClick={() => setMode('scientific')}
                  className={`px-3.5 py-1.5 min-h-[36px] text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-orange-500 ${
                    mode === 'scientific'
                      ? 'bg-white dark:bg-[#24272D] text-zinc-950 dark:text-zinc-50 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  공학 계산
                </button>
              </div>

              <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap hidden sm:inline">
                {mode === 'standard' ? '기본 사칙연산 · 퍼센트' : '삼각 · 로그 · 지수 연산'}
              </span>
            </div>

            {/* LCD Display */}
            <CalculatorDisplay
              mode={mode}
              angleUnit={angleUnit}
              expression={expression}
              displayValue={displayValue}
              livePreview={livePreview}
              errorMessage={errorMessage}
              memoryValue={memoryValue}
              isEvaluated={isEvaluated}
              onBackspace={handleBackspace}
            />

            {/* Tactile Keypad */}
            <div className="mt-4">
              <CalculatorKeypad
                mode={mode}
                angleUnit={angleUnit}
                memoryHasValue={memoryValue !== 0}
                activeKeyId={activeKeyId}
                hasInput={Boolean(expression)}
                onToggleAngle={() => setAngleUnit((prev) => (prev === 'DEG' ? 'RAD' : 'DEG'))}
                handlers={handlers}
              />
            </div>
          </section>

          {/* Secondary Workspace: History Tape & Unit Converter */}
          <aside
            aria-label="계산 기록 및 단위 변환"
            className={`lg:col-span-5 bg-white dark:bg-[#1A1C20] border border-stone-200/90 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.35)] ${
              mobileView === 'calculator' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* Desktop Tab Switcher */}
            <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-[#131518] mb-5">
              <button
                type="button"
                onClick={() => setSideTab('history')}
                className={`flex-1 min-h-[40px] px-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-orange-500 ${
                  sideTab === 'history'
                    ? 'bg-white dark:bg-[#24272D] text-zinc-950 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <History className="w-4 h-4" />
                <span>계산 기록</span>
              </button>
              <button
                type="button"
                onClick={() => setSideTab('converter')}
                className={`flex-1 min-h-[40px] px-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-orange-500 ${
                  sideTab === 'converter'
                    ? 'bg-white dark:bg-[#24272D] text-zinc-950 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>단위 변환</span>
              </button>
            </div>

            {/* Panel Body */}
            <div className="lg:block hidden">
              {sideTab === 'history' ? (
                <HistoryTapePanel
                  entries={history}
                  onSelectResult={handleRecallResult}
                  onSelectExpression={handleRecallExpression}
                  onDeleteEntry={(id) =>
                    setHistory((prev) => prev.filter((item) => item.id !== id))
                  }
                  onClearAll={() => setHistory([])}
                />
              ) : (
                <UnitConverterPanel onSendToCalculator={handleSendConvertedValue} />
              )}
            </div>

            {/* Mobile Panel Body */}
            <div className="lg:hidden">
              {mobileView === 'history' && (
                <HistoryTapePanel
                  entries={history}
                  onSelectResult={handleRecallResult}
                  onSelectExpression={handleRecallExpression}
                  onDeleteEntry={(id) =>
                    setHistory((prev) => prev.filter((item) => item.id !== id))
                  }
                  onClearAll={() => setHistory([])}
                />
              )}
              {mobileView === 'converter' && (
                <UnitConverterPanel onSendToCalculator={handleSendConvertedValue} />
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
