/**
 * Unit tests for FocusScorePresenter
 */

import {
  formatFocusScore,
  focusTierIcon,
  focusTierColor,
  focusTierLabel,
  getTierFromScore,
} from '../../../../src/adapters/presenters/FocusScorePresenter.js'

describe('FocusScorePresenter', () => {
  describe('getTierFromScore', () => {
    it('should return drift for score 0', () => {
      const tier = getTierFromScore(0)
      expect(tier.label).toBe('drift')
      expect(tier.symbol).toBe('○')
      expect(tier.index).toBe(0)
    })

    it('should return warming for score 20', () => {
      const tier = getTierFromScore(20)
      expect(tier.label).toBe('warming')
      expect(tier.symbol).toBe('◔')
      expect(tier.index).toBe(1)
    })

    it('should return steady for score 40', () => {
      const tier = getTierFromScore(40)
      expect(tier.label).toBe('steady')
      expect(tier.symbol).toBe('◑')
      expect(tier.index).toBe(2)
    })

    it('should return strong for score 60', () => {
      const tier = getTierFromScore(60)
      expect(tier.label).toBe('strong')
      expect(tier.symbol).toBe('◕')
      expect(tier.index).toBe(3)
    })

    it('should return deep for score 80', () => {
      const tier = getTierFromScore(80)
      expect(tier.label).toBe('deep')
      expect(tier.symbol).toBe('●')
      expect(tier.index).toBe(4)
    })

    it('should return deep for score 100', () => {
      const tier = getTierFromScore(100)
      expect(tier.label).toBe('deep')
      expect(tier.index).toBe(4)
    })

    it('should return drift for score 19', () => {
      const tier = getTierFromScore(19)
      expect(tier.label).toBe('drift')
    })

    it('should not use red for any tier color', () => {
      for (let score = 0; score <= 100; score += 10) {
        const tier = getTierFromScore(score)
        expect(tier.color).not.toBe('red')
      }
    })
  })

  describe('formatFocusScore', () => {
    it('should format as "symbol score label"', () => {
      expect(formatFocusScore(72)).toBe('◕ 72 strong')
    })

    it('should format zero score', () => {
      expect(formatFocusScore(0)).toBe('○ 0 drift')
    })

    it('should format perfect score', () => {
      expect(formatFocusScore(100)).toBe('● 100 deep')
    })
  })

  describe('focusTierIcon', () => {
    it('should return circle symbols', () => {
      expect(focusTierIcon(0)).toBe('○')
      expect(focusTierIcon(30)).toBe('◔')
      expect(focusTierIcon(50)).toBe('◑')
      expect(focusTierIcon(70)).toBe('◕')
      expect(focusTierIcon(90)).toBe('●')
    })
  })

  describe('focusTierColor', () => {
    it('should return color for each tier', () => {
      expect(focusTierColor(0)).toBe('gray')
      expect(focusTierColor(30)).toBe('yellow')
      expect(focusTierColor(50)).toBe('cyan')
      expect(focusTierColor(70)).toBe('green')
      expect(focusTierColor(90)).toBe('greenBright')
    })
  })

  describe('focusTierLabel', () => {
    it('should return label for each tier', () => {
      expect(focusTierLabel(0)).toBe('drift')
      expect(focusTierLabel(30)).toBe('warming')
      expect(focusTierLabel(50)).toBe('steady')
      expect(focusTierLabel(70)).toBe('strong')
      expect(focusTierLabel(90)).toBe('deep')
    })
  })
})
