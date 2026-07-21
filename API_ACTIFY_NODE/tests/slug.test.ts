import { describe, it, expect } from 'vitest'
import { slugify } from '../utils/slug'

describe('slug utils', () => {
  it('converts a simple string to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('removes diacritics', () => {
    expect(slugify('Café & Résumé')).toBe('cafe-resume')
  })

  it('replaces special characters with dashes', () => {
    expect(slugify('foo@bar!baz')).toBe('foo-bar-baz')
  })

  it('removes leading and trailing dashes', () => {
    expect(slugify('---test---')).toBe('test')
  })

  it('truncates to 80 characters', () => {
    const longString = 'a'.repeat(100)
    expect(slugify(longString)).toHaveLength(80)
  })
})
