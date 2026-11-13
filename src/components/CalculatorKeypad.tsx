import { useState } from 'react';
import { AngleUnit, CalculatorMode } from '../types/calculator';

export interface KeypadHandlers {
  onDigit: (digit: string) => void;
  onDecimal: () => void;
  onOperator: (op: '+' | '-' | '*' | '/' | '^') => void;
  onEquals: () => void;
  onClearAll: () => void;
  onClearEntry: () => void;
  onToggleSign: () => void;
  onPercent: () => void;
  onParen: (paren: '(' | ')') => void;
  onFunction: (fn: string) => void;
  onConstant: (constant: 'pi' | 'e') => void;
  onFactorial: () => void;
  onSquare: () => void;
  onReciprocal: () => void;
  onTenPower: () => void;
  onExp: () => void;
  onMemory: (action: 'MC' | 'MR' | 'M+' | 'M-' | 'MS') => void;
}

interface CalculatorKeypadProps {
  mode: CalculatorMode;
  angleUnit: AngleUnit;
  memoryHasValue: boolean;
  activeKeyId: string | null;
  hasInput: boolean;
  onToggleAngle: () => void;
  handlers: KeypadHandlers;
}

interface KeyButtonProps {
  id: string;
  label: string;
  subLabel?: string;
  ariaLabel?: string;
  variant?: 'digit' | 'function' | 'operator' | 'equals' | 'clear';
  isActive?: boolean;
  spanCols?: 2;
  onClick: () => void;
}

function KeyButton({
  label,
  ariaLabel,
  variant = 'digit',
  isActive = false,
  spanCols,
  onClick,
}: KeyButtonProps) {
  const base =
    'relative select-none flex items-center justify-center rounded-xl font-medium transition-all duration-100 min-h-[52px] sm:min-h-[56px] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 active:translate-y-[1px]';

  const variantClasses: Record<NonNullable<KeyButtonProps['variant']>, string> = {
    digit:
      'bg-white dark:bg-[#23262B] text-zinc-900 dark:text-zinc-100 border border-stone-200/90 dark:border-zinc-700/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-stone-50 dark:hover:bg-[#2B2F36] text-lg sm:text-xl font-mono-tabular',
    function:
      'bg-[#EAEAE6] dark:bg-[#1B1D21] text-zinc-800 dark:text-zinc-200 border border-stone-200/80 dark:border-zinc-800 hover:bg-stone-200/80 dark:hover:bg-[#25282E] text-sm sm:text-base font-medium',
    operator:
      'bg-[#E4E3DE] dark:bg-[#2A2D33] text-zinc-900 dark:text-zinc-100 border border-stone-300/70 dark:border-zinc-700 hover:bg-stone-300/80 dark:hover:bg-[#343840] text-xl font-medium',
    clear:
      'bg-stone-200/90 dark:bg-[#282220] text-orange-700 dark:text-orange-400 border border-stone-300/80 dark:border-orange-950/60 hover:bg-orange-100/80 dark:hover:bg-[#352A26] text-sm sm:text-base font-semibold',
    equals:
      'bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white border border-orange-700/30 shadow-[0_2px_6px_rgba(234,88,12,0.28)] text-xl font-semibold',
  };

  const activeRing = isActive
    ? 'translate-y-[1px] ring-2 ring-orange-500/70 brightness-95 dark:brightness-110'
    : '';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={`${base} ${variantClasses[variant]} ${activeRing} ${
        spanCols === 2 ? 'col-span-2' : ''
      }`}
    >
      {label}
    </button>
  );
}

export function CalculatorKeypad({
  mode,
  angleUnit,
  memoryHasValue,
  activeKeyId,
  hasInput,
  onToggleAngle,
  handlers,
}: CalculatorKeypadProps) {
  const [isInverse, setIsInverse] = useState(false);

  return (
    <div className="space-y-3">
      {/* Memory Register Strip */}
      <div className="grid grid-cols-5 gap-2">
        {(
          [
            { id: 'MC', label: 'MC', title: '메모리 지우기', disabled: !memoryHasValue },
            { id: 'MR', label: 'MR', title: '메모리 불러오기', disabled: !memoryHasValue },
            { id: 'M+', label: 'M+', title: '메모리에 더하기', disabled: false },
            { id: 'M-', label: 'M−', title: '메모리에서 빼기', disabled: false },
            { id: 'MS', label: 'MS', title: '메모리에 저장', disabled: false },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => handlers.onMemory(item.id)}
            title={item.title}
            aria-label={item.title}
            className="min-h-[40px] rounded-lg text-xs font-mono-tabular font-medium text-zinc-600 dark:text-zinc-300 bg-stone-100/80 dark:bg-[#191B1F] border border-stone-200/80 dark:border-zinc-800 hover:bg-stone-200/70 dark:hover:bg-[#23262C] disabled:opacity-35 disabled:pointer-events-none transition-colors focus-visible:outline-2 focus-visible:outline-orange-500 whitespace-nowrap"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Scientific Extended Pad */}
      {mode === 'scientific' && (
        <div className="grid grid-cols-5 gap-2 sm:gap-2.5 pb-1">
          <button
            type="button"
            onClick={onToggleAngle}
            aria-label={`각도 단위 전환 (현재 ${angleUnit})`}
            className="min-h-[46px] rounded-xl text-xs font-mono-tabular font-semibold bg-stone-200/70 dark:bg-[#202328] text-orange-700 dark:text-orange-400 border border-stone-300/70 dark:border-zinc-700/80 hover:bg-stone-200 dark:hover:bg-[#2A2E35] transition-colors focus-visible:outline-2 focus-visible:outline-orange-500 whitespace-nowrap"
          >
            {angleUnit}
          </button>
          <button
            type="button"
            onClick={() => setIsInverse((prev) => !prev)}
            aria-pressed={isInverse}
            aria-label="역삼각함수 전환"
            className={`min-h-[46px] rounded-xl text-xs font-mono-tabular font-semibold border transition-colors focus-visible:outline-2 focus-visible:outline-orange-500 whitespace-nowrap ${
              isInverse
                ? 'bg-orange-600 text-white border-orange-700/40'
                : 'bg-[#EAEAE6] dark:bg-[#1B1D21] text-zinc-800 dark:text-zinc-200 border-stone-200/80 dark:border-zinc-800 hover:bg-stone-200/80 dark:hover:bg-[#25282E]'
            }`}
          >
            2nd
          </button>
          <KeyButton
            id="pi"
            label="π"
            ariaLabel="원주율 파이"
            variant="function"
            isActive={activeKeyId === 'pi'}
            onClick={() => handlers.onConstant('pi')}
          />
          <KeyButton
            id="e"
            label="e"
            ariaLabel="자연상수 e"
            variant="function"
            isActive={activeKeyId === 'e'}
            onClick={() => handlers.onConstant('e')}
          />
          <KeyButton
            id="abs"
            label="|x|"
            ariaLabel="절댓값"
            variant="function"
            isActive={activeKeyId === 'abs'}
            onClick={() => handlers.onFunction('abs')}
          />

          <KeyButton
            id="sin"
            label={isInverse ? 'sin⁻¹' : 'sin'}
            ariaLabel={isInverse ? '아크사인' : '사인'}
            variant="function"
            isActive={activeKeyId === 'sin'}
            onClick={() => handlers.onFunction(isInverse ? 'asin' : 'sin')}
          />
          <KeyButton
            id="cos"
            label={isInverse ? 'cos⁻¹' : 'cos'}
            ariaLabel={isInverse ? '아크코사인' : '코사인'}
            variant="function"
            isActive={activeKeyId === 'cos'}
            onClick={() => handlers.onFunction(isInverse ? 'acos' : 'cos')}
          />
          <KeyButton
            id="tan"
            label={isInverse ? 'tan⁻¹' : 'tan'}
            ariaLabel={isInverse ? '아크탄젠트' : '탄젠트'}
            variant="function"
            isActive={activeKeyId === 'tan'}
            onClick={() => handlers.onFunction(isInverse ? 'atan' : 'tan')}
          />
          <KeyButton
            id="log"
            label="log"
            ariaLabel="상용로그"
            variant="function"
            isActive={activeKeyId === 'log'}
            onClick={() => handlers.onFunction('log')}
          />
          <KeyButton
            id="ln"
            label="ln"
            ariaLabel="자연로그"
            variant="function"
            isActive={activeKeyId === 'ln'}
            onClick={() => handlers.onFunction('ln')}
          />

          <KeyButton
            id="sq"
            label="x²"
            ariaLabel="제곱"
            variant="function"
            isActive={activeKeyId === 'sq'}
            onClick={handlers.onSquare}
          />
          <KeyButton
            id="sqrt"
            label="√x"
            ariaLabel="제곱근"
            variant="function"
            isActive={activeKeyId === 'sqrt'}
            onClick={() => handlers.onFunction('sqrt')}
          />
          <KeyButton
            id="pow"
            label="xʸ"
            ariaLabel="거듭제곱"
            variant="function"
            isActive={activeKeyId === '^'}
            onClick={() => handlers.onOperator('^')}
          />
          <KeyButton
            id="recip"
            label="1/x"
            ariaLabel="역수"
            variant="function"
            isActive={activeKeyId === 'recip'}
            onClick={handlers.onReciprocal}
          />
          <KeyButton
            id="fact"
            label="n!"
            ariaLabel="팩토리얼"
            variant="function"
            isActive={activeKeyId === '!'}
            onClick={handlers.onFactorial}
          />

          <KeyButton
            id="lparen"
            label="("
            ariaLabel="여는 괄호"
            variant="function"
            isActive={activeKeyId === '('}
            onClick={() => handlers.onParen('(')}
          />
          <KeyButton
            id="rparen"
            label=")"
            ariaLabel="닫는 괄호"
            variant="function"
            isActive={activeKeyId === ')'}
            onClick={() => handlers.onParen(')')}
          />
          <KeyButton
            id="ce"
            label="CE"
            ariaLabel="현재 입력 지우기"
            variant="function"
            isActive={activeKeyId === 'ce'}
            onClick={handlers.onClearEntry}
          />
          <KeyButton
            id="tenpow"
            label="10ˣ"
            ariaLabel="10의 거듭제곱"
            variant="function"
            isActive={activeKeyId === '10^'}
            onClick={handlers.onTenPower}
          />
          <KeyButton
            id="exp"
            label="×10ˣ"
            ariaLabel="10의 거듭제곱 곱하기"
            variant="function"
            isActive={activeKeyId === 'exp'}
            onClick={handlers.onExp}
          />
        </div>
      )}

      {/* Standard 4x5 Main Keypad */}
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        <KeyButton
          id="clear"
          label={hasInput ? 'C' : 'AC'}
          ariaLabel={hasInput ? '전체 초기화' : '모두 지우기'}
          variant="clear"
          isActive={activeKeyId === 'Escape'}
          onClick={handlers.onClearAll}
        />
        <KeyButton
          id="sign"
          label="±"
          ariaLabel="부호 반전"
          variant="function"
          isActive={activeKeyId === 'sign'}
          onClick={handlers.onToggleSign}
        />
        <KeyButton
          id="percent"
          label="%"
          ariaLabel="퍼센트"
          variant="function"
          isActive={activeKeyId === '%'}
          onClick={handlers.onPercent}
        />
        <KeyButton
          id="/"
          label="÷"
          ariaLabel="나누기"
          variant="operator"
          isActive={activeKeyId === '/'}
          onClick={() => handlers.onOperator('/')}
        />

        <KeyButton
          id="7"
          label="7"
          variant="digit"
          isActive={activeKeyId === '7'}
          onClick={() => handlers.onDigit('7')}
        />
        <KeyButton
          id="8"
          label="8"
          variant="digit"
          isActive={activeKeyId === '8'}
          onClick={() => handlers.onDigit('8')}
        />
        <KeyButton
          id="9"
          label="9"
          variant="digit"
          isActive={activeKeyId === '9'}
          onClick={() => handlers.onDigit('9')}
        />
        <KeyButton
          id="*"
          label="×"
          ariaLabel="곱하기"
          variant="operator"
          isActive={activeKeyId === '*'}
          onClick={() => handlers.onOperator('*')}
        />

        <KeyButton
          id="4"
          label="4"
          variant="digit"
          isActive={activeKeyId === '4'}
          onClick={() => handlers.onDigit('4')}
        />
        <KeyButton
          id="5"
          label="5"
          variant="digit"
          isActive={activeKeyId === '5'}
          onClick={() => handlers.onDigit('5')}
        />
        <KeyButton
          id="6"
          label="6"
          variant="digit"
          isActive={activeKeyId === '6'}
          onClick={() => handlers.onDigit('6')}
        />
        <KeyButton
          id="-"
          label="−"
          ariaLabel="빼기"
          variant="operator"
          isActive={activeKeyId === '-'}
          onClick={() => handlers.onOperator('-')}
        />

        <KeyButton
          id="1"
          label="1"
          variant="digit"
          isActive={activeKeyId === '1'}
          onClick={() => handlers.onDigit('1')}
        />
        <KeyButton
          id="2"
          label="2"
          variant="digit"
          isActive={activeKeyId === '2'}
          onClick={() => handlers.onDigit('2')}
        />
        <KeyButton
          id="3"
          label="3"
          variant="digit"
          isActive={activeKeyId === '3'}
          onClick={() => handlers.onDigit('3')}
        />
        <KeyButton
          id="+"
          label="+"
          ariaLabel="더하기"
          variant="operator"
          isActive={activeKeyId === '+'}
          onClick={() => handlers.onOperator('+')}
        />

        <KeyButton
          id="0"
          label="0"
          variant="digit"
          spanCols={2}
          isActive={activeKeyId === '0'}
          onClick={() => handlers.onDigit('0')}
        />
        <KeyButton
          id="."
          label="."
          ariaLabel="소수점"
          variant="digit"
          isActive={activeKeyId === '.'}
          onClick={handlers.onDecimal}
        />
        <KeyButton
          id="="
          label="="
          ariaLabel="계산하기"
          variant="equals"
          isActive={activeKeyId === 'Enter'}
          onClick={handlers.onEquals}
        />
      </div>
    </div>
  );
}
