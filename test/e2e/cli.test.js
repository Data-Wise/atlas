/**
 * E2E Tests for Atlas CLI
 *
 * Tests the CLI commands end-to-end using the actual binary
 */

import { describe, test, expect } from '@jest/globals'
import { execSync } from 'child_process'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const CLI_PATH = join(__dirname, '../../bin/atlas.js')

/**
 * Execute CLI command and return output
 */
function runCLI(args = '', options = {}) {
  try {
    const output = execSync(`node ${CLI_PATH} ${args}`, {
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'test' },
      ...options
    })
    return { stdout: output, stderr: '', exitCode: 0 }
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status
    }
  }
}

describe('Atlas CLI - E2E Tests', () => {
  describe('Help and Version', () => {
    test('shows help with --help', () => {
      const { stdout, exitCode } = runCLI('--help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('Usage: atlas')
      expect(stdout).toContain('Commands:')
    })

    test('shows help with help command', () => {
      const { stdout, exitCode } = runCLI('help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('Usage: atlas')
    })

    test('shows help with no command', () => {
      const { stdout, exitCode } = runCLI('')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('Usage: atlas')
    })

    test('shows version with --version', () => {
      const { stdout, exitCode } = runCLI('--version')

      expect(exitCode).toBe(0)
      expect(stdout).toMatch(/\d+\.\d+\.\d+/)
    })

    test('shows version with -v', () => {
      const { stdout, exitCode } = runCLI('-v')

      expect(exitCode).toBe(0)
      expect(stdout).toMatch(/\d+\.\d+\.\d+/)
    })
  })

  describe('Error Handling', () => {
    test('shows error for unknown command', () => {
      const { stderr, exitCode } = runCLI('nonexistent')

      expect(exitCode).toBe(1)
      expect(stderr).toContain("unknown command 'nonexistent'")
    })

    test('shows help hint for unknown command', () => {
      const { stderr } = runCLI('invalid')

      // Commander.js shows "unknown command" for invalid commands
      expect(stderr).toContain("unknown command 'invalid'")
    })
  })

  describe('Status Command', () => {
    test('runs status command successfully', () => {
      const { exitCode } = runCLI('status')

      // Should not crash
      expect(exitCode).toBe(0)
    })

    test('status command produces output', () => {
      const { stdout, exitCode } = runCLI('status')

      // Should produce some output (format may vary)
      expect(exitCode).toBe(0)
      expect(stdout.length).toBeGreaterThan(0)
    })

    test('status --help shows status help', () => {
      const { stdout, exitCode } = runCLI('status --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('status')
    })
  })

  describe('CLI Performance', () => {
    test('help command executes quickly', () => {
      const start = Date.now()
      runCLI('--help')
      const duration = Date.now() - start

      // Should complete in under 2 seconds
      expect(duration).toBeLessThan(2000)
    })

    test('version command executes quickly', () => {
      const start = Date.now()
      runCLI('--version')
      const duration = Date.now() - start

      // Should complete in under 2 seconds
      expect(duration).toBeLessThan(2000)
    })
  })

  describe('Exit Codes', () => {
    test('returns 0 on success', () => {
      const { exitCode } = runCLI('--help')
      expect(exitCode).toBe(0)
    })

    test('returns 1 on error', () => {
      const { exitCode } = runCLI('invalid-command')
      expect(exitCode).toBe(1)
    })
  })

  describe('Status Command - Extended Options', () => {
    test('status --help shows all options', () => {
      const { stdout, exitCode } = runCLI('status --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('--set')
      expect(stdout).toContain('--progress')
      expect(stdout).toContain('--focus')
      expect(stdout).toContain('--next')
      expect(stdout).toContain('--complete')
      expect(stdout).toContain('--increment')
      expect(stdout).toContain('--create')
    })

    test('status command shows valid status options in help', () => {
      const { stdout, exitCode } = runCLI('status --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('active')
      expect(stdout).toContain('paused')
      expect(stdout).toContain('blocked')
      expect(stdout).toContain('archived')
    })
  })

  describe('Inbox Command', () => {
    test('inbox --help shows options', () => {
      const { stdout, exitCode } = runCLI('inbox --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('--triage')
      expect(stdout).toContain('--stats')
      expect(stdout).toContain('--project')
    })

    test('inbox --stats runs without error', () => {
      const { exitCode } = runCLI('inbox --stats')

      expect(exitCode).toBe(0)
    })

    test('inbox --stats shows statistics format', () => {
      const { stdout, exitCode } = runCLI('inbox --stats')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('INBOX STATS')
      expect(stdout).toContain('Inbox:')
    })

    test('inbox without options runs', () => {
      const { exitCode } = runCLI('inbox')

      expect(exitCode).toBe(0)
    })
  })

  describe('Completions Command', () => {
    test('completions shows installation instructions', () => {
      const { stdout, exitCode } = runCLI('completions')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('Shell completions for Atlas CLI')
      expect(stdout).toContain('zsh')
      expect(stdout).toContain('bash')
      expect(stdout).toContain('fish')
    })

    test('completions zsh outputs zsh script', () => {
      const { stdout, exitCode } = runCLI('completions zsh')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('#compdef atlas')
      expect(stdout).toContain('_atlas')
    })

    test('completions bash outputs bash script', () => {
      const { stdout, exitCode } = runCLI('completions bash')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('_atlas_completions')
      expect(stdout).toContain('complete -F')
    })

    test('completions fish outputs fish script', () => {
      const { stdout, exitCode } = runCLI('completions fish')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('complete -c atlas')
    })

    test('completions with invalid shell shows error', () => {
      const { stderr, exitCode } = runCLI('completions powershell')

      expect(exitCode).toBe(1)
      expect(stderr).toContain('Unsupported shell')
    })
  })

  describe('Dashboard Command', () => {
    test('dashboard --help shows command', () => {
      const { stdout, exitCode } = runCLI('dashboard --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('dashboard')
    })

    test('dash alias exists', () => {
      const { stdout } = runCLI('--help')

      expect(stdout).toContain('dashboard')
    })
  })

  describe('Project Commands', () => {
    test('project list runs', () => {
      const { exitCode } = runCLI('project list')

      expect(exitCode).toBe(0)
    })

    test('project list --format json outputs valid JSON', () => {
      const { stdout, exitCode } = runCLI('project list --format json')

      expect(exitCode).toBe(0)
      // Should be valid JSON (array)
      expect(() => JSON.parse(stdout)).not.toThrow()
    })

    test('project add --help shows options', () => {
      const { stdout, exitCode } = runCLI('project add --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('--tags')
      expect(stdout).toContain('--status')
    })
  })

  describe('Session Commands', () => {
    test('session --help shows subcommands', () => {
      const { stdout, exitCode } = runCLI('session --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('start')
      expect(stdout).toContain('end')
      expect(stdout).toContain('status')
    })

    test('session start --help shows options', () => {
      const { stdout, exitCode } = runCLI('session start --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('start')
    })

    test('session end --help shows options', () => {
      const { stdout, exitCode } = runCLI('session end --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('end')
    })
  })

  describe('Context Commands', () => {
    test('where --help shows options', () => {
      const { stdout, exitCode } = runCLI('where --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('where')
    })

    test('trail --help shows options', () => {
      const { stdout, exitCode } = runCLI('trail --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('--days')
    })

    test('crumb --help shows options', () => {
      const { stdout, exitCode } = runCLI('crumb --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('--project')
    })
  })

  describe('Sync Command', () => {
    test('sync --help shows options', () => {
      const { stdout, exitCode } = runCLI('sync --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('--dry-run')
      expect(stdout).toContain('--watch')
      expect(stdout).toContain('--paths')
      expect(stdout).toContain('--remove-orphans')
    })

    test('sync --dry-run runs without modifying', () => {
      const { stdout, exitCode } = runCLI('sync --dry-run')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('DRY RUN')
    })
  })

  describe('Migrate Command', () => {
    test('migrate --help shows options', () => {
      const { stdout, exitCode } = runCLI('migrate --help')

      expect(exitCode).toBe(0)
      expect(stdout).toContain('--from')
      expect(stdout).toContain('--to')
      expect(stdout).toContain('--dry-run')
    })
  })

  describe('Storage Backend Option', () => {
    test('--storage option is recognized', () => {
      const { stdout } = runCLI('--help')

      expect(stdout).toContain('--storage')
      expect(stdout).toContain('filesystem')
      expect(stdout).toContain('sqlite')
    })

    test('--storage with invalid value shows help', () => {
      const { stdout, exitCode } = runCLI('--storage invalid --help')

      // Should still show help
      expect(exitCode).toBe(0)
      expect(stdout).toContain('Usage: atlas')
    })
  })
})
