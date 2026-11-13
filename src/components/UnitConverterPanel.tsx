import { ArrowRightLeft, ArrowUpRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConverterCategoryId } from '../types/calculator';
import { formatNumber } from '../utils/calculatorEngine';
import { CONVERTER_CATEGORIES, convertUnitValue } from '../utils/converterData';

interface UnitConverterPanelProps {
  onSendToCalculator: (value: number) => void;
}

export function UnitConverterPanel({ onSendToCalculator }: UnitConverterPanelProps) {
  const [categoryId, setCategoryId] = useState<ConverterCategoryId>('area');
  const [fromUnitId, setFromUnitId] = useState<string>('pyeong');
  const [toUnitId, setToUnitId] = useState<string>('sqm');
  const [inputValue, setInputValue] = useState<string>('32');

  const activeCategory = useMemo(
    () => CONVERTER_CATEGORIES.find((c) => c.id === categoryId) ?? CONVERTER_CATEGORIES[0],
    [categoryId]
  );

  const handleCategoryChange = (nextCatId: ConverterCategoryId) => {
    setCategoryId(nextCatId);
    const cat = CONVERTER_CATEGORIES.find((c) => c.id === nextCatId);
    if (cat && cat.units.length >= 2) {
      if (nextCatId === 'area') {
        setFromUnitId('pyeong');
        setToUnitId('sqm');
      } else {
        setFromUnitId(cat.units[0].id);
        setToUnitId(cat.units[1].id);
      }
    }
  };

  const handleSwapUnits = () => {
    setFromUnitId(toUnitId);
    setToUnitId(fromUnitId);
  };

  const numericInput = Number(inputValue);
  const convertedValue = useMemo(() => {
    if (inputValue.trim() === '' || Number.isNaN(numericInput)) return null;
    const res = convertUnitValue(numericInput, categoryId, fromUnitId, toUnitId);
    return Number.isFinite(res) ? res : null;
  }, [inputValue, numericInput, categoryId, fromUnitId, toUnitId]);

  const toUnitObj = activeCategory.units.find((u) => u.id === toUnitId);
  const fromUnitObj = activeCategory.units.find((u) => u.id === fromUnitId);

  return (
    <div className="space-y-4">
      {/* Category Selector */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-stone-200/70 dark:bg-[#141619]">
        {CONVERTER_CATEGORIES.map((cat) => {
          const isSelected = cat.id === categoryId;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex-1 min-w-[54px] px-2.5 py-2 min-h-[36px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-orange-500 ${
                isSelected
                  ? 'bg-white dark:bg-[#23262B] text-zinc-950 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* From Value & Unit */}
      <div className="space-y-2">
        <label
          htmlFor="converter-input"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
        >
          변환할 값
        </label>
        <div className="flex items-stretch gap-2">
          <input
            id="converter-input"
            type="number"
            inputMode="decimal"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="0"
            className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-[#141619] border border-stone-300 dark:border-zinc-700 font-mono-tabular text-base font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/70"
          />
          <select
            aria-label="변환 전 단위"
            value={fromUnitId}
            onChange={(e) => setFromUnitId(e.target.value)}
            className="min-w-[116px] min-h-[48px] px-3 rounded-xl bg-stone-100 dark:bg-[#23262B] border border-stone-300 dark:border-zinc-700 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/70"
          >
            {activeCategory.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label} ({u.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleSwapUnits}
          aria-label="단위 서로 바꾸기"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-stone-200/70 dark:hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-orange-500"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>단위 바꾸기</span>
        </button>
      </div>

      {/* To Unit & Result */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          변환 결과
        </label>
        <div className="flex items-stretch gap-2">
          <div className="flex-1 min-h-[52px] px-3.5 py-2.5 rounded-xl bg-[#EAEAE6] dark:bg-[#141619] border border-stone-300/80 dark:border-zinc-800 flex items-center justify-between gap-2 overflow-x-auto">
            <span className="font-mono-tabular text-lg sm:text-xl font-semibold text-zinc-950 dark:text-zinc-50 whitespace-nowrap">
              {convertedValue !== null ? formatNumber(convertedValue) : '—'}
            </span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
              {toUnitObj?.symbol}
            </span>
          </div>
          <select
            aria-label="변환 후 단위"
            value={toUnitId}
            onChange={(e) => setToUnitId(e.target.value)}
            className="min-w-[116px] min-h-[52px] px-3 rounded-xl bg-stone-100 dark:bg-[#23262B] border border-stone-300 dark:border-zinc-700 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/70"
          >
            {activeCategory.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label} ({u.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reference Rate & Send to Calculator */}
      <div className="pt-2 border-t border-stone-200 dark:border-zinc-800 flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-tabular truncate">
          {fromUnitObj && toUnitObj
            ? `1 ${fromUnitObj.symbol} = ${formatNumber(
                convertUnitValue(1, categoryId, fromUnitId, toUnitId)
              )} ${toUnitObj.symbol}`
            : ''}
        </span>

        <button
          type="button"
          disabled={convertedValue === null}
          onClick={() => {
            if (convertedValue !== null) {
              onSendToCalculator(convertedValue);
            }
          }}
          className="inline-flex items-center gap-1 px-3 py-2 min-h-[38px] text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-orange-600 dark:hover:bg-orange-500 dark:hover:text-white rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-orange-500"
        >
          <span>계산기로 보내기</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
