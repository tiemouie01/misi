import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  appendCalculatorKey,
  evaluateExpression,
  formatExpression,
  hasOperator,
} from './calculator.ts'

function type(keys: string, start = '') {
  return [...keys].reduce(appendCalculatorKey, start)
}

test('builds operands like the plain amount keypad', () => {
  assert.equal(type('0012'), '12')
  assert.equal(type('.5'), '0.5')
  assert.equal(type('1.2.3'), '1.23')
  assert.equal(type('1.234'), '1.23')
  assert.equal(type('1234567890'), '123456789')
  assert.equal(type('1,5'), '1.5')
})

test('limits decimals per operand, not per expression', () => {
  assert.equal(type('1.5+2.25.7'), '1.5+2.25')
  assert.equal(type('1.5*.'), '1.5*0.')
})

test('operators cannot lead and replace a trailing operator', () => {
  assert.equal(type('+-'), '')
  assert.equal(type('12+*3'), '12*3')
  assert.equal(type('3', '12.5'), '12.53')
  assert.equal(type('+3', '12.5'), '12.5+3')
})

test('applies multiplication and division before addition and subtraction', () => {
  assert.equal(evaluateExpression('1200+350*2'), 1900)
  assert.equal(evaluateExpression('10-4/2'), 8)
  assert.equal(evaluateExpression('2*3+4*5-6/3'), 24)
  assert.equal(evaluateExpression('100-20-30'), 50)
  assert.equal(evaluateExpression('2-3*4'), -10)
})

test('ignores a trailing operator', () => {
  assert.equal(evaluateExpression('12+'), 12)
  assert.equal(evaluateExpression('12+3*'), 15)
  assert.equal(evaluateExpression('5.'), 5)
})

test('rounds to cents', () => {
  assert.equal(evaluateExpression('0.1+0.2'), 0.3)
  assert.equal(evaluateExpression('10/3'), 3.33)
  assert.equal(evaluateExpression('2/3'), 0.67)
})

test('returns null on division by zero', () => {
  assert.equal(evaluateExpression('5/0'), null)
  assert.equal(evaluateExpression('5/0.'), null)
  assert.equal(evaluateExpression('1+5/0*2'), null)
})

test('allows negative and zero results so the caller can reject them', () => {
  assert.equal(evaluateExpression('50-80'), -30)
  assert.equal(evaluateExpression('5-5'), 0)
})

test('treats an empty or plain prefilled amount as a number', () => {
  assert.equal(evaluateExpression(''), 0)
  assert.equal(evaluateExpression('1234.5'), 1234.5)
  assert.equal(hasOperator('1234.5'), false)
  assert.equal(hasOperator('1234.5+1'), true)
})

test('formats an expression with separators and math symbols', () => {
  assert.equal(formatExpression('1200+350*2'), '1,200 + 350 × 2')
  assert.equal(formatExpression('1000.5-20/4'), '1,000.5 − 20 ÷ 4')
  assert.equal(formatExpression('12.+'), '12. +')
  assert.equal(formatExpression(''), '')
})
