import { Check, Copy, History, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { HistoryEntry } from '../types/calculator';

interface HistoryTapePanelProps {
  entries: HistoryEntry[];
  onSelectResult: (entry: HistoryEntry) => void;
  onSelectExpression: (entry: HistoryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClearAll: () => void;
}

function formatTime(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

export function HistoryTapePanel({
  entries,
  onSelectResult,
  onSelectExpression,
  onDeleteEntry,
  onClearAll,
}: HistoryTapePanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value.replace(/,/g, ''));
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1400);
    } catch {
      // Ignore clipboard failures
    }
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 px-6">
        <div className="w-11 h-11 rounded-xl bg-stone-200/70 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-500 dark:text-zinc-400 mb-3">
          <History className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          아직 계산 기록이 없습니다
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-[24ch] leading-relaxed">
          계산을 완료하면 수식과 결과가 이곳에 순서대로 기록됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-stone-200 dark:border-zinc-800">
        <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
          총 {entries.length}건의 기록
        </span>
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-orange-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>전체 삭제</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto tape-scroll divide-y divide-stone-200/80 dark:divide-zinc-800/80 pr-1 max-h-[430px]">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="group py-3.5 flex flex-col gap-1.5 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span>{entry.mode === 'standard' ? '표준' : `공학 (${entry.angleUnit})`}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{formatTime(entry.timestamp)}</span>
              </div>

              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleCopy(entry.id, entry.result)}
                  aria-label="결과 복사"
                  className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors"
                >
                  {copiedId === entry.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteEntry(entry.id)}
                  aria-label="기록 항목 삭제"
                  className="p-1.5 rounded-md text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectExpression(entry)}
              title="클릭하여 수식 다시 불러오기"
              className="text-right font-mono-tabular text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors break-all"
            >
              {entry.formattedExpression} =
            </button>

            <button
              type="button"
              onClick={() => onSelectResult(entry)}
              title="클릭하여 결과값을 계산기에 입력"
              className="text-right font-mono-tabular text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              {entry.result}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
