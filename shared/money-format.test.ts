import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatK, formatKCompact } from './money-format.ts'

test('formats exact kwacha amounts', () => {
  assert.equal(formatK(3_044_964.49), 'K3,044,964.49')
  assert.equal(formatK(-1500), '-K1,500')
})

test('keeps small amounts exact in compact form', () => {
  assert.equal(formatKCompact(12_500), 'K12,500')
  assert.equal(formatKCompact(99_999.5), 'K99,999.5')
})

test('shortens large amounts', () => {
  assert.equal(formatKCompact(950_000), 'K950K')
  assert.equal(formatKCompact(3_044_964.49), 'K3.04M')
  assert.equal(formatKCompact(999_600), 'K1M')
  assert.equal(formatKCompact(-120_400), '-K120K')
})
