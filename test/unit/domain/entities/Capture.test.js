/**
 * Unit tests for Capture entity
 */

import { Capture } from '../../../../src/domain/entities/Capture.js'

describe('Capture Entity', () => {
  describe('Construction', () => {
    test('creates capture with required fields', () => {
      const capture = new Capture({ text: 'Fix the login bug' })

      expect(capture.id).toMatch(/^cap_\d+_[a-z0-9]+$/)
      expect(capture.text).toBe('Fix the login bug')
      expect(capture.type).toBe('idea') // default
      expect(capture.status).toBe('inbox') // default
      expect(capture.project).toBeNull()
      expect(capture.tags).toEqual([])
      expect(capture.context).toEqual({})
      expect(capture.createdAt).toBeInstanceOf(Date)
      expect(capture.triagedAt).toBeNull()
    })

    test('creates capture with optional fields', () => {
      const capture = new Capture({
        text: 'Refactor auth module',
        type: 'task',
        status: 'inbox',
        project: 'atlas',
        tags: ['refactor', 'priority'],
        context: { source: 'code-review' }
      })

      expect(capture.type).toBe('task')
      expect(capture.project).toBe('atlas')
      expect(capture.tags).toEqual(['refactor', 'priority'])
      expect(capture.context.source).toBe('code-review')
    })

    test('trims whitespace from text', () => {
      const capture = new Capture({ text: '  needs trimming  ' })
      expect(capture.text).toBe('needs trimming')
    })

    test('uses provided id when given', () => {
      const capture = new Capture({ id: 'custom-id', text: 'test' })
      expect(capture.id).toBe('custom-id')
    })
  })

  describe('Validation', () => {
    // TODO: Implement validation tests
    // These test the entity's contract - what makes a Capture valid?
    // Consider: What should happen with empty text? Very long text?
    //           What about invalid types or statuses?

    test('throws error for empty text', () => {
      // Your implementation here
      expect(() => new Capture({ text: '' })).toThrow('Capture text cannot be empty')
    })

    test('throws error for whitespace-only text', () => {
      // Your implementation here
      expect(() => new Capture({ text: '   ' })).toThrow('Capture text cannot be empty')
    })

    test('throws error for text exceeding 500 characters', () => {
      // Your implementation here
      const longText = 'a'.repeat(501)
      expect(() => new Capture({ text: longText })).toThrow('Capture text cannot exceed 500 characters')
    })

    test('allows text exactly 500 characters', () => {
      const maxText = 'a'.repeat(500)
      const capture = new Capture({ text: maxText })
      expect(capture.text.length).toBe(500)
    })

    test('throws error for invalid type', () => {
      // Your implementation here
      expect(() => new Capture({ text: 'test', type: 'invalid' })).toThrow('Invalid capture type')
    })

    test('throws error for invalid status', () => {
      // Your implementation here
      expect(() => new Capture({ text: 'test', status: 'invalid' })).toThrow('Invalid capture status')
    })

    test('accepts all valid types', () => {
      for (const type of Capture.TYPES) {
        const capture = new Capture({ text: 'test', type })
        expect(capture.type).toBe(type)
      }
    })

    test('accepts all valid statuses', () => {
      for (const status of Capture.STATUSES) {
        const capture = new Capture({ text: 'test', status })
        expect(capture.status).toBe(status)
      }
    })
  })

  describe('Triage', () => {
    test('triages inbox item successfully', () => {
      const capture = new Capture({ text: 'Fix bug' })

      capture.triage({ project: 'atlas', type: 'bug' })

      expect(capture.status).toBe('triaged')
      expect(capture.project).toBe('atlas')
      expect(capture.type).toBe('bug')
      expect(capture.triagedAt).toBeInstanceOf(Date)
    })

    test('triage returns this for chaining', () => {
      const capture = new Capture({ text: 'Fix bug' })
      const result = capture.triage()
      expect(result).toBe(capture)
    })

    test('throws error when triaging non-inbox item', () => {
      const capture = new Capture({ text: 'Fix bug' })
      capture.triage()

      expect(() => capture.triage()).toThrow('Can only triage inbox items')
    })

    test('triage with tags replaces tags', () => {
      const capture = new Capture({ text: 'Fix bug', tags: ['old'] })

      capture.triage({ tags: ['new', 'urgent'] })

      expect(capture.tags).toEqual(['new', 'urgent'])
    })
  })

  describe('Archive', () => {
    test('archives capture successfully', () => {
      const capture = new Capture({ text: 'Old idea' })

      capture.archive()

      expect(capture.status).toBe('archived')
    })

    test('archive returns this for chaining', () => {
      const capture = new Capture({ text: 'Old idea' })
      const result = capture.archive()
      expect(result).toBe(capture)
    })

    test('can archive from any status', () => {
      const inbox = new Capture({ text: 'test' })
      inbox.archive()
      expect(inbox.status).toBe('archived')

      const triaged = new Capture({ text: 'test' })
      triaged.triage()
      triaged.archive()
      expect(triaged.status).toBe('archived')
    })
  })

  describe('Project Assignment', () => {
    test('assigns to project', () => {
      const capture = new Capture({ text: 'test' })

      capture.assignToProject('atlas')

      expect(capture.project).toBe('atlas')
    })

    test('assignToProject returns this for chaining', () => {
      const capture = new Capture({ text: 'test' })
      const result = capture.assignToProject('atlas')
      expect(result).toBe(capture)
    })
  })

  describe('Context Management', () => {
    test('adds context key-value', () => {
      const capture = new Capture({ text: 'test' })

      capture.addContext('source', 'slack')
      capture.addContext('priority', 'high')

      expect(capture.context.source).toBe('slack')
      expect(capture.context.priority).toBe('high')
    })

    test('addContext returns this for chaining', () => {
      const capture = new Capture({ text: 'test' })
      const result = capture.addContext('key', 'value')
      expect(result).toBe(capture)
    })
  })

  describe('Tag Management', () => {
    test('adds tag', () => {
      const capture = new Capture({ text: 'test' })

      capture.addTag('urgent')

      expect(capture.tags).toContain('urgent')
    })

    test('does not add duplicate tags', () => {
      const capture = new Capture({ text: 'test', tags: ['urgent'] })

      capture.addTag('urgent')

      expect(capture.tags).toEqual(['urgent'])
    })

    test('addTag returns this for chaining', () => {
      const capture = new Capture({ text: 'test' })
      const result = capture.addTag('urgent')
      expect(result).toBe(capture)
    })
  })

  describe('Age Calculation', () => {
    test('returns minutes for recent captures', () => {
      const capture = new Capture({ text: 'test' })
      capture.createdAt = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago

      expect(capture.getAge()).toBe('5m')
    })

    test('returns hours for older captures', () => {
      const capture = new Capture({ text: 'test' })
      capture.createdAt = new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago

      expect(capture.getAge()).toBe('3h')
    })

    test('returns days for very old captures', () => {
      const capture = new Capture({ text: 'test' })
      capture.createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago

      expect(capture.getAge()).toBe('2d')
    })
  })

  describe('Serialization', () => {
    test('toJSON returns serializable object', () => {
      const capture = new Capture({
        id: 'cap-123',
        text: 'Test capture',
        type: 'bug',
        status: 'triaged',
        project: 'atlas',
        tags: ['urgent'],
        context: { source: 'pr' }
      })
      capture.triagedAt = new Date('2025-01-01T12:00:00Z')
      capture.createdAt = new Date('2025-01-01T10:00:00Z')

      const json = capture.toJSON()

      expect(json).toEqual({
        id: 'cap-123',
        text: 'Test capture',
        type: 'bug',
        status: 'triaged',
        project: 'atlas',
        tags: ['urgent'],
        context: { source: 'pr' },
        createdAt: '2025-01-01T10:00:00.000Z',
        triagedAt: '2025-01-01T12:00:00.000Z'
      })
    })

    test('toJSON handles null triagedAt', () => {
      const capture = new Capture({ text: 'test' })
      const json = capture.toJSON()

      expect(json.triagedAt).toBeNull()
    })

    test('fromJSON reconstructs capture', () => {
      const data = {
        id: 'cap-123',
        text: 'Test capture',
        type: 'bug',
        status: 'triaged',
        project: 'atlas',
        tags: ['urgent'],
        context: { source: 'pr' },
        createdAt: '2025-01-01T10:00:00.000Z',
        triagedAt: '2025-01-01T12:00:00.000Z'
      }

      const capture = Capture.fromJSON(data)

      expect(capture.id).toBe('cap-123')
      expect(capture.text).toBe('Test capture')
      expect(capture.type).toBe('bug')
      expect(capture.project).toBe('atlas')
      expect(capture.createdAt).toBeInstanceOf(Date)
      expect(capture.triagedAt).toBeInstanceOf(Date)
    })

    test('fromJSON handles null triagedAt', () => {
      const data = {
        id: 'cap-123',
        text: 'Test',
        type: 'idea',
        status: 'inbox',
        project: null,
        tags: [],
        context: {},
        createdAt: '2025-01-01T10:00:00.000Z',
        triagedAt: null
      }

      const capture = Capture.fromJSON(data)
      expect(capture.triagedAt).toBeNull()
    })

    test('roundtrip preserves data', () => {
      const original = new Capture({
        text: 'Important bug',
        type: 'bug',
        project: 'atlas',
        tags: ['critical']
      })
      original.triage()

      const json = original.toJSON()
      const restored = Capture.fromJSON(json)

      expect(restored.id).toBe(original.id)
      expect(restored.text).toBe(original.text)
      expect(restored.type).toBe(original.type)
      expect(restored.status).toBe(original.status)
      expect(restored.project).toBe(original.project)
      expect(restored.tags).toEqual(original.tags)
    })
  })

  describe('Fluent API Chaining', () => {
    test('supports method chaining', () => {
      const capture = new Capture({ text: 'New feature idea' })

      capture
        .assignToProject('atlas')
        .addTag('feature')
        .addTag('v2')
        .addContext('source', 'brainstorm')

      expect(capture.project).toBe('atlas')
      expect(capture.tags).toEqual(['feature', 'v2'])
      expect(capture.context.source).toBe('brainstorm')
    })
  })
})
