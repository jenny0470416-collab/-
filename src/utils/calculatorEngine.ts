import { AngleUnit } from '../types/calculator';

export interface EvaluationResult {
  ok: boolean;
  value?: number;
  formatted?: string;
  error?: string;
}

const FUNCTION_NAMES = new Set([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'log',
  'ln',
  'sqrt',
  'abs',
]);

type Token =
  | { type: 'number'; value: number }
  | { type: 'const'; name: 'pi' | 'e' }
  | { type: 'op'; value: '+' | '-' | '*' | '/' | '^' | '%' }
  | { type: 'unary'; value: 'neg' | 'fact' }
  | { type: 'func'; name: string }
  | { type: 'lparen' }
  | { type: 'rparen' };

/**
 * Normalizes floating-point artifacts like 0.1 + 0.2 = 0.30000000000000004
 * or sin(pi) = 1.2246467991473532e-16.
 */
export function cleanFloat(num: number): number {
  if (!Number.isFinite(num)) return num;
  if (Math.abs(num) < 1e-14) return 0;
  return parseFloat(num.toPrecision(14));
}

export function formatNumber(num: number): string {
  if (Number.isNaN(num)) return '오류';
  if (!Number.isFinite(num)) return num > 0 ? '∞' : '-∞';

  const cleaned = cleanFloat(num);
  if (cleaned === 0) return '0';

  const abs = Math.abs(cleaned);
  if (abs >= 1e15 || (abs > 0 && abs < 1e-9)) {
    return cleaned.toExponential(8).replace(/\.?0+e/, 'e');
  }

  const str = String(cleaned);
  const [intPart, decPart] = str.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

export function formatRawNumberInput(raw: string): string {
  if (!raw) return '0';
  if (raw === '-') return '-';
  if (raw === '오류' || raw === 'NaN') return '오류';

  const isNeg = raw.startsWith('-');
  const unsigned = isNeg ? raw.slice(1) : raw;
  const [intPart, decPart] = unsigned.split('.');

  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const prefix = isNeg ? '-' : '';
  return decPart !== undefined ? `${prefix}${formattedInt}.${decPart}` : `${prefix}${formattedInt}`;
}

export function formatExpressionForDisplay(expr: string): string {
  return expr
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' ÷ ')
    .replace(/\+/g, ' + ')
    .replace(/-/g, ' − ')
    .replace(/pi/g, 'π')
    .replace(/sqrt\(/g, '√(')
    .replace(/\s+/g, ' ')
    .trim();
}

export function balanceParentheses(expr: string): string {
  let openCount = 0;
  for (const ch of expr) {
    if (ch === '(') openCount++;
    else if (ch === ')') openCount = Math.max(0, openCount - 1);
  }
  return expr + ')'.repeat(openCount);
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error('정의되지 않은 팩토리얼');
  }
  if (n > 170) {
    return Infinity;
  }
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

function tokenize(rawExpr: string): Token[] {
  const expr = rawExpr
    .replace(/\s+/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√\(/g, 'sqrt(');

  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    // Numbers including scientific notation (e.g. 1.2e-5 or 3e8)
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      let hasDot = false;
      while (i < expr.length && (/[0-9]/.test(expr[i]) || (expr[i] === '.' && !hasDot))) {
        if (expr[i] === '.') hasDot = true;
        numStr += expr[i];
        i++;
      }
      // Scientific notation exponent part like 1.5e+10 or 1.5e-4
      if (
        i < expr.length &&
        (expr[i] === 'e' || expr[i] === 'E') &&
        i + 1 < expr.length &&
        (/[0-9]/.test(expr[i + 1]) ||
          ((expr[i + 1] === '+' || expr[i + 1] === '-') &&
            i + 2 < expr.length &&
            /[0-9]/.test(expr[i + 2])))
      ) {
        numStr += expr[i];
        i++;
        if (expr[i] === '+' || expr[i] === '-') {
          numStr += expr[i];
          i++;
        }
        while (i < expr.length && /[0-9]/.test(expr[i])) {
          numStr += expr[i];
          i++;
        }
      }

      const parsed = Number(numStr);
      if (Number.isNaN(parsed)) {
        throw new Error('잘못된 숫자 형식');
      }
      tokens.push({ type: 'number', value: parsed });
      continue;
    }

    // Identifiers: functions or constants (pi, e)
    if (/[a-zA-Z]/.test(ch)) {
      let ident = '';
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
        ident += expr[i];
        i++;
      }
      const lower = ident.toLowerCase();
      if (lower === 'pi') {
        tokens.push({ type: 'const', name: 'pi' });
      } else if (lower === 'e') {
        tokens.push({ type: 'const', name: 'e' });
      } else if (FUNCTION_NAMES.has(lower)) {
        tokens.push({ type: 'func', name: lower });
      } else {
        throw new Error(`알 수 없는 함수: ${ident}`);
      }
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    if (ch === '!') {
      tokens.push({ type: 'unary', value: 'fact' });
      i++;
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^' || ch === '%') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    throw new Error(`인식할 수 없는 문자: ${ch}`);
  }

  // Insert implicit multiplication and distinguish unary minus
  const normalized: Token[] = [];
  for (let idx = 0; idx < tokens.length; idx++) {
    const curr = tokens[idx];
    const prev = normalized[normalized.length - 1];

    // Check if '-' is unary negation
    if (curr.type === 'op' && curr.value === '-') {
      const isUnaryPosition =
        !prev ||
        prev.type === 'op' ||
        prev.type === 'lparen' ||
        prev.type === 'unary' && prev.value === 'neg' ||
        prev.type === 'func';

      if (isUnaryPosition) {
        normalized.push({ type: 'unary', value: 'neg' });
        continue;
      }
    }

    // Ignore unary '+'
    if (curr.type === 'op' && curr.value === '+') {
      const isUnaryPosition =
        !prev ||
        prev.type === 'op' ||
        prev.type === 'lparen' ||
        prev.type === 'unary' && prev.value === 'neg' ||
        prev.type === 'func';
      if (isUnaryPosition) {
        continue;
      }
    }

    // Implicit multiplication:
    // prev is number | const | rparen | fact | %
    // curr is const | func | lparen | number (after const/rparen/fact/%)
    if (prev) {
      const prevEndsValue =
        prev.type === 'number' ||
        prev.type === 'const' ||
        prev.type === 'rparen' ||
        (prev.type === 'unary' && prev.value === 'fact') ||
        (prev.type === 'op' && prev.value === '%');

      const currStartsValue =
        curr.type === 'const' ||
        curr.type === 'func' ||
        curr.type === 'lparen' ||
        curr.type === 'number';

      if (prevEndsValue && currStartsValue) {
        normalized.push({ type: 'op', value: '*' });
      }
    }

    normalized.push(curr);
  }

  return normalized;
}

/**
 * Recursive descent parser with contextual percentage support:
 * e.g. 100 + 10% => 100 + (100 * 0.1) = 110
 *      100 - 20% => 100 - (100 * 0.2) = 80
 *      50 * 20%  => 50 * 0.2 = 10
 *      50%       => 0.5
 */
class ExpressionParser {
  private pos = 0;
  private tokens: Token[];
  private angleUnit: AngleUnit;

  constructor(tokens: Token[], angleUnit: AngleUnit) {
    this.tokens = tokens;
    this.angleUnit = angleUnit;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  parse(): number {
    if (this.tokens.length === 0) return 0;
    const val = this.parseAddSub();
    if (this.pos < this.tokens.length) {
      throw new Error('수식 구문 오류');
    }
    return val;
  }

  private parseAddSub(): number {
    let left = this.parseMulDiv();

    while (true) {
      const tok = this.peek();
      if (tok?.type === 'op' && (tok.value === '+' || tok.value === '-')) {
        this.consume();
        // Check if right-hand side is a direct percentage term like `10%`
        const rightTerm = this.parseMulDivWithPercentFlag();
        if (rightTerm.isDirectPercent) {
          const pctValue = left * rightTerm.value;
          left = tok.value === '+' ? left + pctValue : left - pctValue;
        } else {
          left = tok.value === '+' ? left + rightTerm.value : left - rightTerm.value;
        }
      } else {
        break;
      }
    }

    return left;
  }

  private parseMulDiv(): number {
    return this.parseMulDivWithPercentFlag().value;
  }

  private parseMulDivWithPercentFlag(): { value: number; isDirectPercent: boolean } {
    const first = this.parsePowerWithPercentFlag();
    let left = first.value;
    let isDirectPercent = first.isDirectPercent;

    while (true) {
      const tok = this.peek();
      if (tok?.type === 'op' && (tok.value === '*' || tok.value === '/')) {
        this.consume();
        isDirectPercent = false;
        const right = this.parsePower();
        if (tok.value === '*') {
          left *= right;
        } else {
          if (right === 0) {
            throw new Error('0으로 나눌 수 없습니다');
          }
          left /= right;
        }
      } else {
        break;
      }
    }

    return { value: left, isDirectPercent };
  }

  private parsePower(): number {
    return this.parsePowerWithPercentFlag().value;
  }

  private parsePowerWithPercentFlag(): { value: number; isDirectPercent: boolean } {
    const base = this.parseUnaryWithPercentFlag();
    const tok = this.peek();
    if (tok?.type === 'op' && tok.value === '^') {
      this.consume();
      const exp = this.parsePower();
      return { value: Math.pow(base.value, exp), isDirectPercent: false };
    }
    return base;
  }

  private parseUnaryWithPercentFlag(): { value: number; isDirectPercent: boolean } {
    const tok = this.peek();
    if (tok?.type === 'unary' && tok.value === 'neg') {
      this.consume();
      const inner = this.parseUnaryWithPercentFlag();
      return { value: -inner.value, isDirectPercent: inner.isDirectPercent };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): { value: number; isDirectPercent: boolean } {
    let val = this.parsePrimary();
    let isDirectPercent = false;

    while (true) {
      const tok = this.peek();
      if (tok?.type === 'unary' && tok.value === 'fact') {
        this.consume();
        val = factorial(val);
        isDirectPercent = false;
      } else if (tok?.type === 'op' && tok.value === '%') {
        this.consume();
        val = val / 100;
        isDirectPercent = true;
      } else {
        break;
      }
    }

    return { value: val, isDirectPercent };
  }

  private parsePrimary(): number {
    const tok = this.peek();
    if (!tok) {
      throw new Error('완성되지 않은 수식');
    }

    if (tok.type === 'number') {
      this.consume();
      return tok.value;
    }

    if (tok.type === 'const') {
      this.consume();
      return tok.name === 'pi' ? Math.PI : Math.E;
    }

    if (tok.type === 'lparen') {
      this.consume();
      const val = this.parseAddSub();
      const next = this.peek();
      if (next?.type !== 'rparen') {
        throw new Error('괄호가 닫히지 않았습니다');
      }
      this.consume();
      return val;
    }

    if (tok.type === 'func') {
      this.consume();
      const next = this.peek();
      let arg: number;
      if (next?.type === 'lparen') {
        this.consume();
        arg = this.parseAddSub();
        if (this.peek()?.type !== 'rparen') {
          throw new Error('함수 괄호가 닫히지 않았습니다');
        }
        this.consume();
      } else {
        arg = this.parseUnaryWithPercentFlag().value;
      }
      return this.applyFunction(tok.name, arg);
    }

    throw new Error('잘못된 수식');
  }

  private applyFunction(name: string, arg: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const fromRad = (rad: number) => (rad * 180) / Math.PI;

    switch (name) {
      case 'sin':
        return Math.sin(this.angleUnit === 'DEG' ? toRad(arg) : arg);
      case 'cos':
        return Math.cos(this.angleUnit === 'DEG' ? toRad(arg) : arg);
      case 'tan': {
        const rad = this.angleUnit === 'DEG' ? toRad(arg) : arg;
        const cosVal = Math.cos(rad);
        if (Math.abs(cosVal) < 1e-14) {
          throw new Error('정의되지 않은 tan 값');
        }
        return Math.tan(rad);
      }
      case 'asin': {
        if (arg < -1 || arg > 1) throw new Error('asin 정의역 오류');
        const res = Math.asin(arg);
        return this.angleUnit === 'DEG' ? fromRad(res) : res;
      }
      case 'acos': {
        if (arg < -1 || arg > 1) throw new Error('acos 정의역 오류');
        const res = Math.acos(arg);
        return this.angleUnit === 'DEG' ? fromRad(res) : res;
      }
      case 'atan': {
        const res = Math.atan(arg);
        return this.angleUnit === 'DEG' ? fromRad(res) : res;
      }
      case 'log':
        if (arg <= 0) throw new Error('로그 정의역 오류');
        return Math.log10(arg);
      case 'ln':
        if (arg <= 0) throw new Error('자연로그 정의역 오류');
        return Math.log(arg);
      case 'sqrt':
        if (arg < 0) throw new Error('음수의 제곱근 오류');
        return Math.sqrt(arg);
      case 'abs':
        return Math.abs(arg);
      default:
        throw new Error(`지원하지 않는 함수: ${name}`);
    }
  }
}

export function evaluateExpression(rawExpr: string, angleUnit: AngleUnit = 'DEG'): EvaluationResult {
  const trimmed = rawExpr.trim();
  if (!trimmed) {
    return { ok: true, value: 0, formatted: '0' };
  }

  try {
    const balanced = balanceParentheses(trimmed);
    const tokens = tokenize(balanced);
    const parser = new ExpressionParser(tokens, angleUnit);
    const rawResult = parser.parse();

    if (Number.isNaN(rawResult)) {
      return { ok: false, error: '계산 오류' };
    }
    if (!Number.isFinite(rawResult)) {
      return { ok: false, error: '범위 초과' };
    }

    const cleaned = cleanFloat(rawResult);
    return {
      ok: true,
      value: cleaned,
      formatted: formatNumber(cleaned),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : '수식 오류',
    };
  }
}
