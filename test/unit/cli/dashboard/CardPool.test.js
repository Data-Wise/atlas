/**
 * Tests for CardPool utility
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Create mock box factory
function createMockBox() {
  return {
    show: jest.fn(),
    hide: jest.fn(),
    destroy: jest.fn(),
    top: 0,
    style: { border: {}, bg: 'black' },
    setContent: jest.fn(),
    // Pre-create line properties that CardPool expects
    _line1: null,
    _line2: null,
    _line3: null
  }
}

// Mock blessed using unstable_mockModule for ESM compatibility
jest.unstable_mockModule('blessed', () => ({
  default: {
    box: jest.fn(() => createMockBox())
  }
}))

// Dynamic import after mock is set up
const { createCardPool } = await import('../../../../src/cli/dashboard/CardPool.js')

describe('CardPool', () => {
  let mockContainer
  let cardPool

  beforeEach(() => {
    mockContainer = {
      append: jest.fn(),
      remove: jest.fn()
    }
    cardPool = createCardPool(mockContainer, { maxSize: 5 })
  })

  afterEach(() => {
    if (cardPool) {
      cardPool.destroy()
    }
  })

  describe('acquire', () => {
    it('should create a new card when pool is empty', () => {
      const card = cardPool.acquire()
      expect(card).toBeDefined()
      expect(card.show).toBeDefined()
    })

    it('should reuse cards from pool', () => {
      const card1 = cardPool.acquire()
      cardPool.release(card1, 0)

      const card2 = cardPool.acquire()
      expect(card2).toBe(card1)
    })

    it('should show acquired card', () => {
      const card = cardPool.acquire()
      expect(card.show).toHaveBeenCalled()
    })
  })

  describe('release', () => {
    it('should hide released card', () => {
      const card = cardPool.acquire()
      cardPool.release(card, 0)
      expect(card.hide).toHaveBeenCalled()
    })

    it('should clear card content on release', () => {
      const card = cardPool.getCard(0)
      cardPool.release(card, 0)

      expect(card._line1.setContent).toHaveBeenCalledWith('')
      expect(card._line2.setContent).toHaveBeenCalledWith('')
      expect(card._line3.setContent).toHaveBeenCalledWith('')
    })

    it('should remove from inUse tracking', () => {
      cardPool.getCard(0)
      expect(cardPool.getInUseIndices().has(0)).toBe(true)

      const card = cardPool.getCard(0)
      cardPool.release(card, 0)
      expect(cardPool.getInUseIndices().has(0)).toBe(false)
    })
  })

  describe('releaseAll', () => {
    it('should release all cards in use', () => {
      cardPool.getCard(0)
      cardPool.getCard(1)
      cardPool.getCard(2)

      expect(cardPool.getInUseIndices().size).toBe(3)

      cardPool.releaseAll()
      expect(cardPool.getInUseIndices().size).toBe(0)
    })
  })

  describe('getCard', () => {
    it('should return existing card for same index', () => {
      const card1 = cardPool.getCard(0)
      const card2 = cardPool.getCard(0)
      expect(card1).toBe(card2)
    })

    it('should track card in inUse', () => {
      cardPool.getCard(5)
      expect(cardPool.getInUseIndices().has(5)).toBe(true)
    })
  })

  describe('updateCard', () => {
    it('should update card properties', () => {
      const card = cardPool.getCard(0)

      cardPool.updateCard(card, {
        top: 100,
        borderColor: 'cyan',
        bgColor: '#111',
        line1: 'Test Line 1',
        line2: 'Test Line 2',
        line3: 'Test Line 3'
      })

      expect(card.top).toBe(100)
      expect(card.style.border.fg).toBe('cyan')
      expect(card.style.bg).toBe('#111')
      expect(card._line1.setContent).toHaveBeenCalledWith('Test Line 1')
      expect(card._line2.setContent).toHaveBeenCalledWith('Test Line 2')
      expect(card._line3.setContent).toHaveBeenCalledWith('Test Line 3')
    })
  })

  describe('getStats', () => {
    it('should return pool statistics', () => {
      cardPool.getCard(0)
      cardPool.getCard(1)
      const card = cardPool.getCard(2)
      cardPool.release(card, 2)

      const stats = cardPool.getStats()
      expect(stats.inUse).toBe(2)
      expect(stats.available).toBe(1)
      expect(stats.total).toBe(3)
    })
  })

  describe('pool size limit', () => {
    it('should respect maxSize for pooled cards', () => {
      // Acquire and release more than maxSize
      for (let i = 0; i < 10; i++) {
        const card = cardPool.getCard(i)
        cardPool.release(card, i)
      }

      const stats = cardPool.getStats()
      expect(stats.available).toBeLessThanOrEqual(5)
    })
  })

  describe('destroy', () => {
    it('should destroy all cards', () => {
      const card1 = cardPool.getCard(0)
      const card2 = cardPool.getCard(1)
      cardPool.release(card2, 1)

      cardPool.destroy()

      expect(card1.destroy).toHaveBeenCalled()
      expect(card2.destroy).toHaveBeenCalled()
    })

    it('should clear all tracking', () => {
      cardPool.getCard(0)
      cardPool.destroy()

      expect(cardPool.getInUseIndices().size).toBe(0)
      expect(cardPool.getStats().total).toBe(0)
    })
  })
})
