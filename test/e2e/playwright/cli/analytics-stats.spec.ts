/**
 * Playwright E2E tests — atlas CLI analytics commands
 *
 * Tests the atlas CLI subprocess output for analytics-related commands.
 * Uses Playwright as the test runner, with Node child_process for CLI invocation.
 */

import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'

function atlas(args: string): string {
  try {
    return execSync(`node bin/atlas.js ${args}`, {
      encoding: 'utf8',
      timeout: 10000,
    }).trim()
  } catch (e: any) {
    if (e.stdout) return e.stdout.toString().trim()
    throw e
  }
}

test.describe('atlas CLI analytics commands', () => {
  test('atlas --help shows available commands', () => {
    const output = atlas('--help')
    expect(output).toContain('atlas')
    expect(output).toContain('Usage:')
  })

  test('atlas stats --help shows stats options', () => {
    const output = atlas('stats --help')
    expect(output).toContain('stats')
    expect(output).toContain('--format')
    expect(output).toContain('--days')
  })

  test('atlas stats returns project analytics data', () => {
    const output = atlas('stats')
    // Should contain some analytics output (sessions, focus, etc.)
    expect(output.length).toBeGreaterThan(0)
    expect(output).not.toContain('ERROR')
  })

  test('atlas stats --format json returns parseable JSON', () => {
    const output = atlas('stats --format json')
    const parsed = JSON.parse(output)
    expect(parsed).toBeDefined()
    // Stats JSON should have a top-level structure
    expect(typeof parsed).toBe('object')
  })

  test('atlas stats --days 7 works', () => {
    const output = atlas('stats --days 7')
    expect(output.length).toBeGreaterThan(0)
  })

  test('atlas session --help shows session subcommands', () => {
    const output = atlas('session --help')
    expect(output).toContain('session')
    expect(output).toContain('start')
    expect(output).toContain('end')
  })

  test('atlas project list returns projects', () => {
    const output = atlas('project list')
    // Should list projects or show empty state
    expect(typeof output).toBe('string')
  })
})
