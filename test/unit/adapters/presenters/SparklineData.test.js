/**
 * Unit tests for projectSparklineData in StatsPresenter
 */

import { projectSparklineData } from '../../../../src/adapters/presenters/StatsPresenter.js'

describe('projectSparklineData', () => {
  const now = Date.now()

  function makeSession(projectName, daysAgo, durationMinutes) {
    return {
      project: projectName,
      startTime: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
      getDuration: () => durationMinutes,
    }
  }

  it('should return array of correct length', () => {
    const result = projectSparklineData([], 'atlas', 5)
    expect(result).toHaveLength(5)
  })

  it('should return zeros for empty sessions', () => {
    const result = projectSparklineData([], 'atlas', 5)
    expect(result).toEqual([0, 0, 0, 0, 0])
  })

  it('should bucket sessions into correct days', () => {
    const sessions = [
      makeSession('atlas', 0, 30),  // today
      makeSession('atlas', 1, 20),  // yesterday
      makeSession('atlas', 4, 10),  // 4 days ago
    ]

    const result = projectSparklineData(sessions, 'atlas', 5)
    // Index 0=oldest(4 days ago), 4=today
    expect(result[0]).toBe(10)  // 4 days ago
    expect(result[3]).toBe(20)  // yesterday
    expect(result[4]).toBe(30)  // today
  })

  it('should filter by project name', () => {
    const sessions = [
      makeSession('atlas', 0, 30),
      makeSession('flow-cli', 0, 50),
    ]

    const result = projectSparklineData(sessions, 'atlas', 5)
    expect(result[4]).toBe(30) // only atlas
  })

  it('should aggregate multiple sessions on same day', () => {
    const sessions = [
      makeSession('atlas', 0, 15),
      makeSession('atlas', 0, 25),
    ]

    const result = projectSparklineData(sessions, 'atlas', 5)
    expect(result[4]).toBe(40) // 15 + 25
  })

  it('should ignore sessions outside the window', () => {
    const sessions = [
      makeSession('atlas', 10, 100), // outside 5-day window
    ]

    const result = projectSparklineData(sessions, 'atlas', 5)
    expect(result).toEqual([0, 0, 0, 0, 0])
  })

  it('should handle sessions without startTime', () => {
    const sessions = [{ project: 'atlas', startTime: null, getDuration: () => 30 }]
    const result = projectSparklineData(sessions, 'atlas', 5)
    expect(result).toEqual([0, 0, 0, 0, 0])
  })

  it('should handle custom day count', () => {
    const sessions = [makeSession('atlas', 0, 10)]
    const result = projectSparklineData(sessions, 'atlas', 3)
    expect(result).toHaveLength(3)
    expect(result[2]).toBe(10)
  })
})
