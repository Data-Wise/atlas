import { describe, test, expect } from '@jest/globals'
import { StatusFileParser } from '../../../../src/adapters/gateways/StatusFileParser.js'

// Edge-case hardening for the v0.11–v0.12 research-registry parsing surface:
// inline-comment stripping (FW-29), the tasks: block, and kind normalization.
// Behavior is pinned against the exact source: stripInlineComment uses
// /\s+#.*$/ then trim(); _parseTaskItem requires `text` and treats `done`
// as strictly `=== 'true'`. These tests guard those contracts, not accidents.
describe('StatusFileParser — research-field edge cases', () => {
  const parser = new StatusFileParser()

  describe('inline-comment stripping (target/venue/journal)', () => {
    test('strips a tab-separated trailing comment', () => {
      const d = parser._parseYAMLFormat(['status: draft', 'target: JASA\t# moved'].join('\n'), 'p')
      expect(d.target).toBe('JASA')
    })

    test('strips when multiple spaces precede the hash', () => {
      const d = parser._parseYAMLFormat(['status: draft', 'venue: AMPPS     # R&R'].join('\n'), 'p')
      expect(d.target).toBe('AMPPS')
    })

    test('a comment-only value is kept verbatim (leading space consumed by the key split, so no preceding-whitespace hash to strip)', () => {
      // Consistent with the "hash without a preceding space is kept" rule:
      // after `target:` the value trims to "# tbd", which has no whitespace
      // before the hash, so stripInlineComment leaves it untouched.
      const d = parser._parseYAMLFormat(['status: draft', 'target: # tbd'].join('\n'), 'p')
      expect(d.target).toBe('# tbd')
    })

    test('keeps a hash that has no preceding whitespace (year suffix)', () => {
      const d = parser._parseYAMLFormat(['status: draft', 'target: JASA#2024'].join('\n'), 'p')
      expect(d.target).toBe('JASA#2024')
    })

    test('first whitespace-hash wins when several hashes appear', () => {
      const d = parser._parseYAMLFormat(['status: draft', 'target: JASA ## double note'].join('\n'), 'p')
      expect(d.target).toBe('JASA')
    })

    test('markdown target also strips inline comments', () => {
      const d = parser._parseMarkdownFormat(['## Status: draft', '## Target: Biometrika # tentative'].join('\n'), 'p')
      expect(d.target).toBe('Biometrika')
    })
  })

  describe('tasks: block parsing', () => {
    const withTasks = (lines) => parser._parseYAMLFormat(['status: active', 'tasks:', ...lines].join('\n'), 'p')

    test('drops a task line that has no text field', () => {
      const d = withTasks(['  - priority: P1; done: false', '  - text: keep me; priority: P2'])
      expect(d.tasks).toHaveLength(1)
      expect(d.tasks[0].text).toBe('keep me')
    })

    test('a task may omit priority and done', () => {
      const d = withTasks(['  - text: just text'])
      expect(d.tasks[0]).toEqual({ text: 'just text' })
    })

    test('done is true only for the literal string "true"', () => {
      const d = withTasks([
        '  - text: a; done: true',
        '  - text: b; done: false',
        '  - text: c; done: True',
        '  - text: d; done: 1'
      ])
      expect(d.tasks.map(t => t.done)).toEqual([true, false, false, false])
    })

    test('segments without a colon are ignored, not fatal', () => {
      const d = withTasks(['  - text: a; garbage; priority: P3'])
      expect(d.tasks[0]).toEqual({ text: 'a', priority: 'P3' })
    })
  })

  describe('kind normalization', () => {
    test('kind is lowercased (YAML)', () => {
      const d = parser._parseYAMLFormat(['status: active', 'kind: Program'].join('\n'), 'p')
      expect(d.kind).toBe('program')
    })

    test('kind is lowercased (markdown)', () => {
      const d = parser._parseMarkdownFormat(['## Status: active', '## Kind: MANUSCRIPT'].join('\n'), 'p')
      expect(d.kind).toBe('manuscript')
    })

    test('summarize groups null-kind projects under "unspecified"', () => {
      const summary = parser.summarize([
        { path: '/a', parsed: parser._parseYAMLFormat('status: active\nkind: program', 'a') },
        { path: '/b', parsed: parser._parseYAMLFormat('status: active\ntype: r-package', 'b') }
      ])
      expect(Object.keys(summary.byKind).sort()).toEqual(['program', 'unspecified'])
      expect(summary.byKind.unspecified).toHaveLength(1)
    })
  })
})
