import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const { modelOrder, markUnavailable, resetModelHealth } = await import('../lib/gemini.js')
const models = ['primary', 'second', 'last']

beforeEach(resetModelHealth)

test('healthy models are tried in the configured order', () => {
  assert.deepEqual(modelOrder(0, models), models)
})

test('a model that just failed is skipped, then tried again after the cooldown', () => {
  markUnavailable('primary', 0)
  assert.deepEqual(modelOrder(1000, models), ['second', 'last', 'primary'])
  assert.deepEqual(modelOrder(5 * 60 * 1000 + 1, models), models)
})

test('when every model is cooling, the one that recovers first goes first', () => {
  markUnavailable('second', 0)
  markUnavailable('primary', 1000)
  markUnavailable('last', 2000)
  assert.deepEqual(modelOrder(3000, models), ['second', 'primary', 'last'])
})
