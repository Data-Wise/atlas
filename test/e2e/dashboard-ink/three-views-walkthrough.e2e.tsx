/**
 * three-views-walkthrough.e2e.tsx — scripted E2E for the 3-view consolidation
 * (SPEC-tui-consolidation-2026-07-19.md, "Consolidation PR" phase).
 *
 * Renders the real <App> against a fixture ATLAS_DATA_DIR (never touches the
 * real ~/.atlas), and walks: Now -> Timer -> Plan -> back to Now, plus the
 * `e` ecosystem toggle, `z` zen toggle, `a` analytics toggle, and `?` help
 * overlay. Frames are captured at each step; the PR body quotes this
 * transcript (run via `npx vitest run --config vitest.config.e2e.ts
 * test/e2e/dashboard-ink/three-views-walkthrough.e2e.tsx`).
 */

import React from 'react'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { render } from 'ink-testing-library'
import { App } from '../../../src/cli/dashboard-ink/components/App.js'
import { AtlasProvider } from '../../../src/cli/dashboard-ink/lib/AtlasContext.js'
// @ts-ignore — JS module without type declarations
import { Container } from '../../../src/adapters/Container.js'

const wait = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms))

let fixtureDir: string
let container: any

beforeAll(() => {
  fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-e2e-3view-'))
  fs.writeFileSync(
    path.join(fixtureDir, 'projects.json'),
    JSON.stringify([
      {
        id: 'proj-1', name: 'atlas', type: 'node', status: 'active',
        progress: 80, focus: 'TUI 3-view consolidation', next: 'Migrate tests, ship PR',
        path: fixtureDir,
      },
      {
        id: 'proj-2', name: 'flow-cli', type: 'zsh', status: 'stable',
        progress: 95, path: fixtureDir,
      },
    ])
  )
  fs.writeFileSync(path.join(fixtureDir, 'sessions.json'), JSON.stringify([]))
  container = new Container({ dataDir: fixtureDir })
})

afterAll(() => {
  fs.rmSync(fixtureDir, { recursive: true, force: true })
})

describe('3-view dashboard E2E walkthrough (fixture ATLAS_DATA_DIR)', () => {
  it('walks Now -> Timer -> Plan -> Now, plus e/z/a/? toggles', async () => {
    const transcript: string[] = []
    const record = (label: string, frame: string) => {
      transcript.push(`\n--- ${label} ---\n${frame}`)
    }

    const { lastFrame, stdin } = render(
      <AtlasProvider container={container}>
        <App onExit={() => {}} />
      </AtlasProvider>
    )

    await wait(50)
    record('1. Now view (default)', lastFrame() ?? '')
    expect(lastFrame()).toContain('Projects')

    // Toggle ecosystem pane (`e`)
    stdin.write('e')
    await wait(30)
    record('2. Now view, e toggled -> Ecosystem pane', lastFrame() ?? '')
    expect(lastFrame()).toContain('Ecosystem')

    stdin.write('e')
    await wait(30)
    record('3. Now view, e toggled back -> Detail pane', lastFrame() ?? '')
    expect(lastFrame()).toContain('Detail')

    // Switch to Timer view (`2`)
    stdin.write('2')
    await wait(30)
    record('4. Timer view (full chrome)', lastFrame() ?? '')
    expect(lastFrame()).toMatch(/\d{2}:\d{2}/)

    // Toggle zen density (`z`)
    stdin.write('z')
    await wait(30)
    record('5. Timer view, z toggled -> zen (dense) chrome', lastFrame() ?? '')
    expect(lastFrame()).toMatch(/\d{2}:\d{2}/)

    stdin.write('z')
    await wait(30)
    record('6. Timer view, z toggled back -> full chrome', lastFrame() ?? '')

    // Switch to Plan view (`3`)
    stdin.write('3')
    await wait(30)
    record('7. Plan view (morning ritual)', lastFrame() ?? '')
    expect(lastFrame()).toContain('Suggestions')

    // Toggle analytics pane (`a`)
    stdin.write('a')
    await wait(30)
    record('8. Plan view, a toggled -> Analytics pane', lastFrame() ?? '')
    expect(lastFrame()).toContain('Analytics')

    stdin.write('a')
    await wait(30)
    record('9. Plan view, a toggled back -> Suggestions', lastFrame() ?? '')
    expect(lastFrame()).toContain('Suggestions')

    // Help overlay (`?`)
    stdin.write('?')
    await wait(30)
    record('10. Help overlay (?)', lastFrame() ?? '')
    expect(lastFrame()).toContain('Keyboard Shortcuts')

    stdin.write('?')
    await wait(30)
    record('11. Help overlay closed, back to Plan', lastFrame() ?? '')

    // Back to Now (`1`)
    stdin.write('1')
    await wait(30)
    record('12. Back to Now view', lastFrame() ?? '')
    expect(lastFrame()).toContain('Projects')

    // Persist the transcript so the PR body can quote a real, verified run.
    const out = transcript.join('\n')
    const outPath = path.join(os.tmpdir(), 'atlas-3view-e2e-transcript.txt')
    fs.writeFileSync(outPath, out)
    // eslint-disable-next-line no-console
    console.log(out)

    expect(transcript).toHaveLength(12)
  })
})
