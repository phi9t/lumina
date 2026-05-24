import { describe, expect, test } from 'vitest'
import { MATH_NOTES_URL } from './mathSources'

describe('mathSources', () => {
  test('links math notes to the Lumina repository', () => {
    expect(MATH_NOTES_URL).toBe('https://github.com/phi9t/lumina/blob/main/docs/transformer-math-notes.md')
  })
})
