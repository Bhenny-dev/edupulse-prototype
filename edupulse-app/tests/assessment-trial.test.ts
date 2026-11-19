import test from 'node:test'
import assert from 'node:assert/strict'
import { isWrittenQuestion, trialResult } from '../src/utils/assessmentTrial'

test('a test attempt is marked with the answer key and leaves written questions for a person', () => {
  const questions = [{ type: 'multiple_choice', correctIndex: 2 }, { type: 'true_false', correctIndex: 1 }, { type: 'short_answer' }, { type: 'multiple_choice' }]
  assert.equal(isWrittenQuestion(questions[2]!), true)
  assert.equal(isWrittenQuestion(questions[0]!), false)
  assert.deepEqual(trialResult(questions, {}), { scored: 3, written: 1, score: 0, correct: [false, false, false, false], ready: false })
  const partly = trialResult(questions, { 0: 2, 1: 0 })
  assert.equal(partly.ready, false, 'every choice question needs an answer before it is checked')
  const full = trialResult(questions, { 0: 2, 1: 0, 2: 'An essay answer.', 3: 1 })
  assert.deepEqual(full, { scored: 3, written: 1, score: 1, correct: [true, false, false, false], ready: true })
  assert.equal(trialResult(questions, { 0: 2, 1: 1, 3: 0 }).score, 2, 'a choice question without a key never scores')
  assert.deepEqual(trialResult([], {}), { scored: 0, written: 0, score: 0, correct: [], ready: true })
})
