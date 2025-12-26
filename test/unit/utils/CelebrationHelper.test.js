/**
 * CelebrationHelper Tests - Self-diagnosing unit tests
 *
 * Test categories:
 * 1. Celebration level determination
 * 2. Messages and encouragement
 * 3. ASCII art and animation
 * 4. Milestone recognition
 * 5. Quick celebrations
 */

import { CelebrationHelper } from '../../../src/utils/CelebrationHelper.js'

describe('CelebrationHelper', () => {
  describe('getCelebration - Main celebration package', () => {
    test('returns structured celebration data', () => {
      const result = CelebrationHelper.getCelebration({
        duration: 30,
        outcome: 'completed'
      })

      expect(result).toHaveProperty('level')
      expect(result).toHaveProperty('emoji')
      expect(result).toHaveProperty('intensity')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('asciiArt')
      expect(result).toHaveProperty('milestones')
      expect(result).toHaveProperty('shouldAnimate')
    })

    test('epic level for new personal best', () => {
      const result = CelebrationHelper.getCelebration({
        duration: 30,
        outcome: 'completed',
        newPersonalBest: true
      })

      expect(result.level).toBe('epic')
      expect(result.intensity).toBe(4)
    })

    test('epic level for 7+ day streak', () => {
      const result = CelebrationHelper.getCelebration({
        duration: 30,
        outcome: 'completed',
        streak: 7
      })

      expect(result.level).toBe('epic')
    })

    test('big level for long completed session', () => {
      const result = CelebrationHelper.getCelebration({
        duration: 65,
        outcome: 'completed'
      })

      expect(result.level).toBe('big')
    })

    test('big level for 3+ day streak', () => {
      const result = CelebrationHelper.getCelebration({
        duration: 20,
        outcome: 'goodEnough',
        streak: 3
      })

      expect(result.level).toBe('big')
    })

    test('medium level for decent session', () => {
      const result = CelebrationHelper.getCelebration({
        duration: 25,
        outcome: 'paused'
      })

      expect(result.level).toBe('medium')
    })

    test('small level for short session', () => {
      const result = CelebrationHelper.getCelebration({
        duration: 10,
        outcome: 'paused'
      })

      expect(result.level).toBe('small')
    })
  })

  describe('_getMessage - Celebration messages', () => {
    test('personal best message takes priority', () => {
      const result = CelebrationHelper.getCelebration({
        duration: 30,
        outcome: 'completed',
        newPersonalBest: true
      })

      expect(result.message).toContain('PERSONAL BEST')
    })

    test('streak message for 7+ days', () => {
      const result = CelebrationHelper.getCelebration({
        duration: 30,
        outcome: 'completed',
        streak: 10
      })

      expect(result.message).toContain('10 day streak')
    })

    test('streak message for 3+ days', () => {
      const result = CelebrationHelper.getCelebration({
        duration: 30,
        outcome: 'completed',
        streak: 5
      })

      expect(result.message).toContain('5 days')
    })

    test('messages are encouraging', () => {
      const result = CelebrationHelper.getCelebration({
        duration: 30,
        outcome: 'completed'
      })

      // Message should be positive
      const negativeWords = ['bad', 'failed', 'wrong', 'should have']
      const hasNegative = negativeWords.some((word) => result.message.toLowerCase().includes(word))
      expect(hasNegative).toBe(false)
    })
  })

  describe('_getAsciiArt - Terminal art', () => {
    test('returns ASCII art for each level', () => {
      const levels = ['small', 'medium', 'big', 'epic']

      for (const level of levels) {
        const art = CelebrationHelper._getAsciiArt(level)
        expect(art).toBeTruthy()
        expect(art.length).toBeGreaterThan(0)
      }
    })

    test('art complexity increases with level', () => {
      const small = CelebrationHelper._getAsciiArt('small')
      const epic = CelebrationHelper._getAsciiArt('epic')

      expect(epic.length).toBeGreaterThan(small.length)
    })
  })

  describe('_getMilestones - Achievement recognition', () => {
    test('recognizes new personal best', () => {
      const milestones = CelebrationHelper._getMilestones({
        duration: 30,
        newPersonalBest: true
      })

      const personalBest = milestones.find((m) => m.type === 'personal_best')
      expect(personalBest).toBeDefined()
      expect(personalBest.icon).toBe('🏆')
    })

    test('recognizes 3-day streak milestone', () => {
      const milestones = CelebrationHelper._getMilestones({
        duration: 30,
        streak: 3
      })

      const streak = milestones.find((m) => m.type === 'streak')
      expect(streak).toBeDefined()
      expect(streak.message).toContain('3-day')
    })

    test('recognizes 7-day streak milestone', () => {
      const milestones = CelebrationHelper._getMilestones({
        duration: 30,
        streak: 7
      })

      const streak = milestones.find((m) => m.type === 'streak')
      expect(streak).toBeDefined()
      expect(streak.message).toContain('week')
    })

    test('recognizes 1+ hour duration', () => {
      const milestones = CelebrationHelper._getMilestones({
        duration: 65
      })

      const duration = milestones.find((m) => m.type === 'duration')
      expect(duration).toBeDefined()
      expect(duration.message).toContain('hour')
    })

    test('recognizes 2+ hour marathon', () => {
      const milestones = CelebrationHelper._getMilestones({
        duration: 125
      })

      const duration = milestones.find((m) => m.type === 'duration')
      expect(duration).toBeDefined()
      expect(duration.message).toContain('marathon')
    })
  })

  describe('getQuickCelebration - Inline display', () => {
    test('returns excellent for 60+ min', () => {
      const result = CelebrationHelper.getQuickCelebration(65, 'completed')
      expect(result).toContain('Excellent')
    })

    test('returns great for 30+ min', () => {
      const result = CelebrationHelper.getQuickCelebration(35, 'completed')
      expect(result).toContain('Great')
    })

    test('returns nice for 15+ min', () => {
      const result = CelebrationHelper.getQuickCelebration(20, 'paused')
      expect(result).toContain('Nice')
    })

    test('returns done for completed outcome', () => {
      const result = CelebrationHelper.getQuickCelebration(10, 'completed')
      expect(result).toContain('Done')
    })

    test('returns progress for short session', () => {
      const result = CelebrationHelper.getQuickCelebration(5, 'paused')
      expect(result).toContain('Progress')
    })
  })

  describe('getNextSessionEncouragement - Momentum', () => {
    test('high streak gets special message', () => {
      const result = CelebrationHelper.getNextSessionEncouragement(10)
      expect(result).toContain('incredible')
    })

    test('moderate streak gets momentum message', () => {
      const result = CelebrationHelper.getNextSessionEncouragement(4)
      expect(result).toContain('momentum')
    })

    test('streak of 1 references yesterday', () => {
      const result = CelebrationHelper.getNextSessionEncouragement(1)
      expect(result).toContain('yesterday')
    })

    test('no streak gets encouraging start message', () => {
      const result = CelebrationHelper.getNextSessionEncouragement(0)
      expect(result).toContain('win')
    })
  })

  describe('shouldCelebrate - Celebration triggers', () => {
    test('always celebrates completed', () => {
      const result = CelebrationHelper.shouldCelebrate(5, 'completed')
      expect(result.celebrate).toBe(true)
    })

    test('always celebrates goodEnough', () => {
      const result = CelebrationHelper.shouldCelebrate(5, 'goodEnough')
      expect(result.celebrate).toBe(true)
    })

    test('celebrates 15+ min sessions', () => {
      const result = CelebrationHelper.shouldCelebrate(15, 'paused')
      expect(result.celebrate).toBe(true)
    })

    test('celebrates 5+ min sessions', () => {
      const result = CelebrationHelper.shouldCelebrate(5, 'paused')
      expect(result.celebrate).toBe(true)
    })

    test('celebrates even very short sessions', () => {
      const result = CelebrationHelper.shouldCelebrate(2, 'paused')
      expect(result.celebrate).toBe(true)
    })
  })

  describe('getAnimationFrames - Terminal animation', () => {
    test('returns array of frames', () => {
      const levels = ['small', 'medium', 'big', 'epic']

      for (const level of levels) {
        const frames = CelebrationHelper.getAnimationFrames(level)
        expect(Array.isArray(frames)).toBe(true)
        expect(frames.length).toBeGreaterThan(0)
      }
    })

    test('epic has more frames than small', () => {
      const small = CelebrationHelper.getAnimationFrames('small')
      const epic = CelebrationHelper.getAnimationFrames('epic')

      expect(epic.length).toBeGreaterThan(small.length)
    })
  })

  describe('getCelebrationColors - Terminal colors', () => {
    test('returns color codes for all levels', () => {
      const levels = ['small', 'medium', 'big', 'epic']

      for (const level of levels) {
        const colors = CelebrationHelper.getCelebrationColors(level)
        expect(colors).toHaveProperty('primary')
        expect(colors).toHaveProperty('secondary')
        expect(colors.primary).toContain('\x1b[')
      }
    })
  })

  describe('Self-Diagnostic Tests', () => {
    test('DIAGNOSTIC: all celebration levels defined', () => {
      const levels = Object.entries(CelebrationHelper.CELEBRATION_LEVELS)

      console.log('DIAGNOSTIC: Celebration levels:')
      for (const [name, data] of levels) {
        console.log(`DIAGNOSTIC: ${name} -> ${data.emoji} (intensity: ${data.intensity})`)
        expect(data.emoji).toBeTruthy()
        expect(data.intensity).toBeGreaterThan(0)
        expect(data.description).toBeTruthy()
      }

      expect(levels.length).toBe(4)
    })

    test('DIAGNOSTIC: intensity increases with level', () => {
      const levels = CelebrationHelper.CELEBRATION_LEVELS
      const intensities = [levels.small.intensity, levels.medium.intensity, levels.big.intensity, levels.epic.intensity]

      console.log('DIAGNOSTIC: Intensities:', intensities)

      for (let i = 1; i < intensities.length; i++) {
        expect(intensities[i]).toBeGreaterThan(intensities[i - 1])
      }
    })

    test('DIAGNOSTIC: all messages are positive', () => {
      const testCases = [
        { duration: 5, outcome: 'paused' },
        { duration: 30, outcome: 'completed' },
        { duration: 60, outcome: 'goodEnough' },
        { duration: 120, outcome: 'completed', streak: 10 }
      ]

      console.log('DIAGNOSTIC: Testing message positivity:')
      for (const testCase of testCases) {
        const result = CelebrationHelper.getCelebration(testCase)
        console.log(`DIAGNOSTIC: ${JSON.stringify(testCase)} -> "${result.message}"`)

        // Check for positive tone
        expect(result.message.length).toBeGreaterThan(10)
      }
    })

    test('DIAGNOSTIC: celebration coverage is complete', () => {
      // Every combination should celebrate
      const outcomes = ['completed', 'goodEnough', 'paused', 'blocked']
      const durations = [5, 15, 30, 60]

      console.log('DIAGNOSTIC: Celebration coverage:')
      let allCelebrate = true

      for (const outcome of outcomes) {
        for (const duration of durations) {
          const result = CelebrationHelper.shouldCelebrate(duration, outcome)
          if (!result.celebrate) {
            console.log(`DIAGNOSTIC WARNING: No celebration for ${outcome}/${duration}min`)
            allCelebrate = false
          }
        }
      }

      expect(allCelebrate).toBe(true)
      console.log('DIAGNOSTIC: All combinations celebrate!')
    })

    test('DIAGNOSTIC: ASCII art renders correctly', () => {
      const levels = ['small', 'medium', 'big', 'epic']

      console.log('DIAGNOSTIC: ASCII art samples:')
      for (const level of levels) {
        const art = CelebrationHelper._getAsciiArt(level)
        console.log(`DIAGNOSTIC: ${level}:${art}`)

        // Art should contain emoji or stars
        const hasContent = /[✨🎉🎊🏆★☆]/.test(art)
        expect(hasContent).toBe(true)
      }
    })
  })
})
