import { Check, Copy, Delete } from 'lucide-react';
import { useState } from 'react';
import { AngleUnit, CalculatorMode } from '../types/calculator';
import { formatExpressionForDisplay, formatNumber } from '../utils/calculatorEngine';

interface CalculatorDisplayProps {
  mode: CalculatorMode;
  angleUnit: AngleUnit;
  expression: string;
  displayValue: string;
  livePreview: string | null;
  errorMessage: string | null;
  memoryValue: number;
  isEvaluated: boolean;
  onBackspace: () => void;
}

export function CalculatorDisplay({
  mode,
  angleUnit,
  expression,
  displayValue,
  livePreview,
  errorMessage,
  memoryValue,
  isEvaluated,
  onBackspace,
}: CalculatorDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const cleanText = displayValue.replace(/,/g, '');
    if (!cleanText || errorMessage) return;
    try {
      await navigator.clipboard.writeText(cleanText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable
    }
  };

  // Dynamically scale main readout length so long numbers stay readable without clipping
  const len = displayValue.length;
  const readoutSizeClass =
    len > 15
      ? 'text-2xl sm:text-3xl'
      : len > 11
      ? 'text-3xl sm:text-4xl'
      : 'text-4xl sm:text-5xl';

  const formattedExpr = expression ? formatExpressionForDisplay(expression) : '';

  return (
    <div className="rounded-2xl bg-[#EAEAE6] dark:bg-[#141619] border border-stone-300/80 dark:border-zinc-800 px-5 py-4 sm:px-6 sm:py-5 transition-colors">
      {/* Top unboxed metadata row */}
      <div className="flex items-center justify-between gap-4 min-h-[28px] text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2 min-w-0 truncate">
          <span className="font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0">
            {mode === 'standard' ? '표준' : '공학'}
          </span>
          {mode === 'scientific' && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular whitespace-nowrap shrink-0">{angleUnit}</span>
            </>
          )}
          {memoryValue !== 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-orange-600 dark:text-orange-400 truncate">
                M {formatNumber(memoryValue)}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            disabled={Boolean(errorMessage)}
            aria-label="계산 결과 복사"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-orange-500"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400">복사됨</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>복사</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBackspace}
            aria-label="한 글자 지우기"
            title="백스페이스 (Backspace)"
            className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-orange-500"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expression line */}
      <div className="mt-2 min-h-[28px] flex items-center justify-end overflow-x-auto tape-scroll">
        <p
          className="font-mono-tabular text-sm sm:text-base text-zinc-600 dark:text-zinc-400 whitespace-nowrap text-right"
          aria-label="입력 수식"
        >
          {formattedExpr ? (isEvaluated ? `${formattedExpr} =` : formattedExpr) : '\u00A0'}
        </p>
      </div>

      {/* Primary readout */}
      <div className="mt-1 min-h-[56px] sm:min-h-[64px] flex items-end justify-end overflow-x-auto tape-scroll">
        {errorMessage ? (
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-semibold text-red-600 dark:text-red-400">
              {errorMessage}
            </span>
          </div>
        ) : (
          <div
            className={`font-mono-tabular font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 whitespace-nowrap text-right leading-none transition-all duration-150 ${readoutSizeClass}`}
            aria-live="polite"
            aria-label="계산 결과"
          >
            {displayValue}
          </div>
        )}
      </div>

      {/* Subtle live preview while typing multi-step expression */}
      <div className="mt-2 min-h-[20px] flex items-center justify-end">
        {livePreview && !isEvaluated && !errorMessage ? (
          <span className="font-mono-tabular text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            = {livePreview}
          </span>
        ) : (
          <span className="text-xs text-transparent select-none" aria-hidden="true">
            0
          </span>
        )}
      </div>
    </div>
  );
}
