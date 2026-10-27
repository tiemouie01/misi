import { roundMoney } from './fx.ts'

export type CalculatorOperator = '+' | '-' | '*' | '/'

const MAX_WHOLE_DIGITS = 9
const MAX_FRACTION_DIGITS = 2
/** Largest amount the keypad can type, and so the largest a sum may submit. */
export const MAX_CALCULATOR_AMOUNT = 999_999_999.99

const OPERATOR_LABELS: Record<CalculatorOperator, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
}

export function isCalculatorOperator(
  value: string | undefined,
): value is CalculatorOperator {
  return value === '+' || value === '-' || value === '*' || value === '/'
}

export function hasOperator(expression: string) {
  return /[+\-*/]/.test(expression)
}

/** "12+3.5*" → ["12", "+", "3.5", "*"]. */
function tokenize(expression: string) {
  return expression.split(/([+\-*/])/).filter(Boolean)
}

function appendOperandInput(current: string, value: string) {
  if (value === '.' || value === ',') {
    if (current.includes('.')) return current
    return current === '' ? '0.' : `${current}.`
  }

  if (!/^\d$/.test(value)) return current

  if (current.includes('.')) {
    const [whole, fraction = ''] = current.split('.')
    if (fraction.length >= MAX_FRACTION_DIGITS) return current
    return `${whole}.${fraction}${value}`
  }

  if (current === '0') return value
  if (current.length >= MAX_WHOLE_DIGITS) return current
  return `${current}${value}`
}

/**
 * Applies one keypad key (digit, "." or an operator) to the expression.
 * Operators can't lead, and a second operator in a row replaces the first.
 */
export function appendCalculatorKey(expression: string, key: string) {
  if (isCalculatorOperator(key)) {
    if (!expression) return expression
    return isCalculatorOperator(expression.at(-1))
      ? `${expression.slice(0, -1)}${key}`
      : `${expression}${key}`
  }
  const operandStart =
    Math.max(...[...'+-*/'].map((op) => expression.lastIndexOf(op))) + 1
  const operand = expression.slice(operandStart)
  const next = appendOperandInput(operand, key)
  return next === operand
    ? expression
    : `${expression.slice(0, operandStart)}${next}`
}

/**
 * Evaluates with × ÷ before + −, rounded to cents. A trailing operator is
 * ignored. Null when the sum can't be worked out (division by zero).
 */
export function evaluateExpression(expression: string): number | null {
  const tokens = tokenize(expression)
  if (isCalculatorOperator(tokens.at(-1))) tokens.pop()
  if (tokens.length === 0) return 0

  const operand = (token: string) => (token === '.' ? 0 : Number(token))
  let total = 0
  let term = operand(tokens[0])
  for (let index = 1; index < tokens.length; index += 2) {
    const op = tokens[index]
    const value = operand(tokens[index + 1])
    if (op === '*') {
      term *= value
    } else if (op === '/') {
      if (value === 0) return null
      term /= value
    } else {
      total += term
      term = op === '-' ? -value : value
    }
  }
  total += term

  if (!Number.isFinite(total)) return null
  return roundMoney(total) || 0
}

function formatOperand(operand: string) {
  const [wholePart, fractionPart = ''] = operand.split('.')
  const whole = Number(wholePart || '0').toLocaleString('en-US')
  return operand.includes('.') ? `${whole}.${fractionPart}` : whole
}

/** "1200+350*2" → "1,200 + 350 × 2". */
export function formatExpression(expression: string) {
  return tokenize(expression)
    .map((token) =>
      isCalculatorOperator(token)
        ? OPERATOR_LABELS[token]
        : formatOperand(token),
    )
    .join(' ')
}
