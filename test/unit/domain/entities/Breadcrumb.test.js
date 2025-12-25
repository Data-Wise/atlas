/**
 * Unit tests for Breadcrumb entity
 */

import { Breadcrumb } from '../../../../src/domain/entities/Breadcrumb.js'

describe('Breadcrumb Entity', () => {
  describe('Construction', () => {
    test('creates breadcrumb with required fields', () => {
      const crumb = new Breadcrumb({ text: 'Working on auth flow' })

      expect(crumb.id).toMatch(/^crumb_\d+_[a-z0-9]+$/)
      expect(crumb.text).toBe('Working on auth flow')
      expect(crumb.type).toBe('note') // default
      expect(crumb.project).toBeNull()
      expect(crumb.session).toBeNull()
      expect(crumb.file).toBeNull()
      expect(crumb.line).toBeNull()
      expect(crumb.timestamp).toBeInstanceOf(Date)
    })

    test('creates breadcrumb with optional fields', () => {
      const crumb = new Breadcrumb({
        text: 'Stuck on validation logic',
        type: 'stuck',
        project: 'atlas',
        session: 'sess-123',
        file: 'src/auth.js',
        line: 42
      })

      expect(crumb.type).toBe('stuck')
      expect(crumb.project).toBe('atlas')
      expect(crumb.session).toBe('sess-123')
      expect(crumb.file).toBe('src/auth.js')
      expect(crumb.line).toBe(42)
    })

    test('trims whitespace from text', () => {
      const crumb = new Breadcrumb({ text: '  needs trimming  ' })
      expect(crumb.text).toBe('needs trimming')
    })

    test('uses provided id when given', () => {
      const crumb = new Breadcrumb({ id: 'custom-id', text: 'test' })
      expect(crumb.id).toBe('custom-id')
    })
  })

  describe('Validation', () => {
    // TODO: Implement validation tests
    // Breadcrumbs are shorter context markers (280 char limit, like a tweet)
    // Consider: Empty text? Long text? Invalid types?

    test('throws error for empty text', () => {
      // Your implementation here
      expect(() => new Breadcrumb({ text: '' })).toThrow('Breadcrumb text cannot be empty')
    })

    test('throws error for whitespace-only text', () => {
      // Your implementation here
      expect(() => new Breadcrumb({ text: '   ' })).toThrow('Breadcrumb text cannot be empty')
    })

    test('throws error for text exceeding 280 characters', () => {
      // Your implementation here
      const longText = 'a'.repeat(281)
      expect(() => new Breadcrumb({ text: longText })).toThrow('Breadcrumb text cannot exceed 280 characters')
    })

    test('allows text exactly 280 characters', () => {
      const maxText = 'a'.repeat(280)
      const crumb = new Breadcrumb({ text: maxText })
      expect(crumb.text.length).toBe(280)
    })

    test('throws error for invalid type', () => {
      // Your implementation here
      expect(() => new Breadcrumb({ text: 'test', type: 'invalid' })).toThrow('Invalid breadcrumb type')
    })

    test('accepts all valid types', () => {
      for (const type of Breadcrumb.TYPES) {
        const crumb = new Breadcrumb({ text: 'test', type })
        expect(crumb.type).toBe(type)
      }
    })
  })

  describe('Age Calculation', () => {
    test('returns "just now" for very recent breadcrumbs', () => {
      const crumb = new Breadcrumb({ text: 'test' })
      // Just created, should be "just now"
      expect(crumb.getAge()).toBe('just now')
    })

    test('returns minutes for recent breadcrumbs', () => {
      const crumb = new Breadcrumb({ text: 'test' })
      crumb.timestamp = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago

      expect(crumb.getAge()).toBe('5m ago')
    })

    test('returns hours for older breadcrumbs', () => {
      const crumb = new Breadcrumb({ text: 'test' })
      crumb.timestamp = new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago

      expect(crumb.getAge()).toBe('3h ago')
    })

    test('returns days for very old breadcrumbs', () => {
      const crumb = new Breadcrumb({ text: 'test' })
      crumb.timestamp = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago

      expect(crumb.getAge()).toBe('2d ago')
    })
  })

  describe('Icon Retrieval', () => {
    test('returns correct icon for each type', () => {
      const expectedIcons = {
        thought: '💭',
        stuck: '🚧',
        next: '➡️',
        decision: '⚖️',
        note: '🍞'
      }

      for (const [type, icon] of Object.entries(expectedIcons)) {
        const crumb = new Breadcrumb({ text: 'test', type })
        expect(crumb.getIcon()).toBe(icon)
      }
    })

    test('returns default icon for unknown type', () => {
      const crumb = new Breadcrumb({ text: 'test' })
      // Force an unknown type (bypassing validation for test)
      crumb.type = 'unknown'
      expect(crumb.getIcon()).toBe('🍞')
    })
  })

  describe('Serialization', () => {
    test('toJSON returns serializable object', () => {
      const crumb = new Breadcrumb({
        id: 'crumb-123',
        text: 'Working on feature',
        type: 'thought',
        project: 'atlas',
        session: 'sess-456',
        file: 'src/main.js',
        line: 100
      })
      crumb.timestamp = new Date('2025-01-01T12:00:00Z')

      const json = crumb.toJSON()

      expect(json).toEqual({
        id: 'crumb-123',
        text: 'Working on feature',
        type: 'thought',
        project: 'atlas',
        session: 'sess-456',
        file: 'src/main.js',
        line: 100,
        timestamp: '2025-01-01T12:00:00.000Z'
      })
    })

    test('toJSON handles null optional fields', () => {
      const crumb = new Breadcrumb({ text: 'test' })
      const json = crumb.toJSON()

      expect(json.project).toBeNull()
      expect(json.session).toBeNull()
      expect(json.file).toBeNull()
      expect(json.line).toBeNull()
    })

    test('fromJSON reconstructs breadcrumb', () => {
      const data = {
        id: 'crumb-123',
        text: 'Working on feature',
        type: 'stuck',
        project: 'atlas',
        session: 'sess-456',
        file: 'src/main.js',
        line: 100,
        timestamp: '2025-01-01T12:00:00.000Z'
      }

      const crumb = Breadcrumb.fromJSON(data)

      expect(crumb.id).toBe('crumb-123')
      expect(crumb.text).toBe('Working on feature')
      expect(crumb.type).toBe('stuck')
      expect(crumb.project).toBe('atlas')
      expect(crumb.session).toBe('sess-456')
      expect(crumb.file).toBe('src/main.js')
      expect(crumb.line).toBe(100)
      expect(crumb.timestamp).toBeInstanceOf(Date)
    })

    test('roundtrip preserves data', () => {
      const original = new Breadcrumb({
        text: 'Need to revisit this',
        type: 'next',
        project: 'atlas',
        file: 'src/api.js',
        line: 55
      })

      const json = original.toJSON()
      const restored = Breadcrumb.fromJSON(json)

      expect(restored.id).toBe(original.id)
      expect(restored.text).toBe(original.text)
      expect(restored.type).toBe(original.type)
      expect(restored.project).toBe(original.project)
      expect(restored.file).toBe(original.file)
      expect(restored.line).toBe(original.line)
    })
  })

  describe('Type Constants', () => {
    test('TYPES contains expected values', () => {
      expect(Breadcrumb.TYPES).toEqual(['thought', 'stuck', 'next', 'decision', 'note'])
    })

    test('TYPES array exists and has expected length', () => {
      // Verify TYPES is a proper array with expected entries
      expect(Array.isArray(Breadcrumb.TYPES)).toBe(true)
      expect(Breadcrumb.TYPES.length).toBe(5)
      // Note: For production, consider Object.freeze(TYPES) in the entity
    })
  })

  describe('File Location Context', () => {
    test('stores file location when provided', () => {
      const crumb = new Breadcrumb({
        text: 'Bug in this function',
        file: 'src/utils/helper.js',
        line: 42
      })

      expect(crumb.file).toBe('src/utils/helper.js')
      expect(crumb.line).toBe(42)
    })

    test('allows file without line', () => {
      const crumb = new Breadcrumb({
        text: 'Check this file',
        file: 'src/config.js'
      })

      expect(crumb.file).toBe('src/config.js')
      expect(crumb.line).toBeNull()
    })

    test('allows line without file', () => {
      const crumb = new Breadcrumb({
        text: 'Around line 100',
        line: 100
      })

      expect(crumb.file).toBeNull()
      expect(crumb.line).toBe(100)
    })
  })

  describe('Session Association', () => {
    test('links breadcrumb to session', () => {
      const crumb = new Breadcrumb({
        text: 'Mid-session thought',
        session: 'sess-abc-123'
      })

      expect(crumb.session).toBe('sess-abc-123')
    })

    test('can associate with both project and session', () => {
      const crumb = new Breadcrumb({
        text: 'Project work',
        project: 'atlas',
        session: 'sess-current'
      })

      expect(crumb.project).toBe('atlas')
      expect(crumb.session).toBe('sess-current')
    })
  })
})
