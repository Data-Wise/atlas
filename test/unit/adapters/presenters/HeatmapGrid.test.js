/**
 * Unit tests for formatHeatmapGrid in StatsPresenter
 */

import { formatHeatmapGrid } from '../../../../src/adapters/presenters/StatsPresenter.js'

describe('formatHeatmapGrid', () => {
  it('should return 7 rows', () => {
    const grid = formatHeatmapGrid([], { weeks: 13 })
    expect(grid).toHaveLength(7)
  })

  it('should return correct number of columns per row', () => {
    const grid = formatHeatmapGrid([], { weeks: 8 })
    for (const row of grid) {
      expect(row).toHaveLength(8)
    }
  })

  it('should return all level-0 cells for empty data', () => {
    const grid = formatHeatmapGrid([], { weeks: 4 })
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.level).toBe(0)
        expect(cell.value).toBe(0)
      }
    }
  })

  it('should assign levels 1-4 based on relative activity', () => {
    const today = new Date()
    const dailyBreakdown = []

    // Create a week of varying activity
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      dailyBreakdown.push({
        date: d.toISOString().split('T')[0],
        dayName: 'Mon',
        sessions: i + 1,
        minutes: (i + 1) * 30,
      })
    }

    const grid = formatHeatmapGrid(dailyBreakdown, { weeks: 2 })

    // At least some cells should have non-zero levels
    const allLevels = grid.flat().map(c => c.level)
    expect(allLevels.some(l => l > 0)).toBe(true)
  })

  it('should place peak activity as level 4', () => {
    const today = new Date()
    const dailyBreakdown = [
      {
        date: today.toISOString().split('T')[0],
        dayName: 'Mon',
        sessions: 5,
        minutes: 200,
      },
    ]

    const grid = formatHeatmapGrid(dailyBreakdown, { weeks: 2 })
    const allLevels = grid.flat().map(c => c.level)

    // The peak should be level 4
    expect(allLevels).toContain(4)
  })

  it('should not exceed level 4', () => {
    const today = new Date()
    const dailyBreakdown = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      dailyBreakdown.push({
        date: d.toISOString().split('T')[0],
        dayName: 'Mon',
        sessions: 10,
        minutes: 500,
      })
    }

    const grid = formatHeatmapGrid(dailyBreakdown, { weeks: 2 })
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.level).toBeLessThanOrEqual(4)
        expect(cell.level).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('should use sessions metric when specified', () => {
    const today = new Date()
    const dailyBreakdown = [
      {
        date: today.toISOString().split('T')[0],
        dayName: 'Mon',
        sessions: 10,
        minutes: 5,
      },
    ]

    const gridMinutes = formatHeatmapGrid(dailyBreakdown, { weeks: 1, metric: 'minutes' })
    const gridSessions = formatHeatmapGrid(dailyBreakdown, { weeks: 1, metric: 'sessions' })

    // Both should have data, but from different metrics
    const minutesHasData = gridMinutes.flat().some(c => c.value > 0)
    const sessionsHasData = gridSessions.flat().some(c => c.value > 0)
    expect(minutesHasData).toBe(true)
    expect(sessionsHasData).toBe(true)
  })

  it('should default to 13 weeks', () => {
    const grid = formatHeatmapGrid([])
    expect(grid[0]).toHaveLength(13)
  })

  it('should handle date alignment correctly (Mon=row 0, Sun=row 6)', () => {
    // Use a recent Monday that falls within the grid window
    // Find the most recent Monday
    const today = new Date()
    const dayOfWeek = today.getDay() // 0=Sun
    const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Mon = 0 days back from Mon
    const recentMonday = new Date(today)
    recentMonday.setDate(today.getDate() - daysBack)
    const dateStr = recentMonday.toISOString().split('T')[0]

    const dailyBreakdown = [{
      date: dateStr,
      dayName: 'Mon',
      sessions: 1,
      minutes: 60,
    }]

    const grid = formatHeatmapGrid(dailyBreakdown, { weeks: 2 })

    // Find the cell with value 60 — should be in row 0 (Monday)
    const mondayRow = grid[0]
    const hasValue = mondayRow.some(c => c.value === 60)
    expect(hasValue).toBe(true)
  })
})
