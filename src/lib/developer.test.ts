import { describe, expect, it } from 'vitest'
import { developerDisplayName, developerInitials } from '@/lib/developer'

describe('developerInitials', () => {
  it('derives initials from first and last name', () => {
    expect(developerInitials({ name: 'Jane Doe', initials: null })).toBe('JD')
  })

  it('uses single-word first two letters', () => {
    expect(developerInitials({ name: 'Alex', initials: null })).toBe('AL')
  })

  it('respects explicit initials override', () => {
    expect(developerInitials({ name: 'Jane Doe', initials: 'JD2' })).toBe('JD2')
  })

  it('returns fallback for empty name', () => {
    expect(developerInitials({ name: '   ', initials: null })).toBe('?')
  })
})

describe('developerDisplayName', () => {
  it('trims whitespace', () => {
    expect(developerDisplayName({ name: '  Sam  ' })).toBe('Sam')
    expect(developerDisplayName({ name: '   ' })).toBe('Unnamed')
  })
})
