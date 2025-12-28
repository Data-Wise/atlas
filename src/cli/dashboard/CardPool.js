/**
 * CardPool - Object Pool for Dashboard Cards
 *
 * Implements the Object Pool pattern for blessed card elements.
 * Instead of destroying and recreating cards on every render,
 * cards are recycled from a pool to reduce DOM operations.
 */

import blessed from 'blessed'
import { CARD_HEIGHT, CARD_POOL_SIZE } from './constants.js'

/**
 * Create a card pool for efficient card management
 * @param {Object} container - Blessed container for cards
 * @param {Object} options - Pool configuration
 * @returns {Object} Card pool instance
 */
export function createCardPool(container, options = {}) {
  const maxSize = options.maxSize || CARD_POOL_SIZE

  // Pool of available (hidden) cards
  const available = []

  // Cards currently in use (visible)
  const inUse = new Map() // index -> card

  /**
   * Create a new card element (internal)
   * @private
   */
  function createCardElement() {
    const card = blessed.box({
      parent: container,
      top: 0,
      left: 0,
      width: '100%-2',
      height: CARD_HEIGHT - 1,
      tags: true,
      border: { type: 'line', fg: 'gray' },
      style: { bg: 'black' },
      hidden: true
    })

    // Pre-create child elements for content lines
    card._line1 = blessed.box({
      parent: card,
      top: 0,
      left: 1,
      width: '100%-4',
      height: 1,
      tags: true
    })

    card._line2 = blessed.box({
      parent: card,
      top: 1,
      left: 1,
      width: '100%-4',
      height: 1,
      tags: true
    })

    card._line3 = blessed.box({
      parent: card,
      top: 2,
      left: 1,
      width: '100%-4',
      height: 1,
      tags: true
    })

    return card
  }

  /**
   * Acquire a card from the pool
   * @returns {Object} Card element
   */
  function acquire() {
    let card

    if (available.length > 0) {
      card = available.pop()
    } else {
      card = createCardElement()
    }

    card.show()
    return card
  }

  /**
   * Release a card back to the pool
   * @param {Object} card - Card to release
   * @param {number} index - Index key used in inUse map
   */
  function release(card, index) {
    card.hide()
    card._line1.setContent('')
    card._line2.setContent('')
    card._line3.setContent('')

    inUse.delete(index)

    // Only keep up to maxSize in pool
    if (available.length < maxSize) {
      available.push(card)
    } else {
      // Destroy excess cards
      card.destroy()
    }
  }

  /**
   * Release all cards in use
   */
  function releaseAll() {
    for (const [index, card] of inUse) {
      release(card, index)
    }
  }

  /**
   * Update a card's content and position
   * @param {Object} card - Card element
   * @param {Object} config - Card configuration
   */
  function updateCard(card, config) {
    const {
      top,
      borderColor = 'gray',
      bgColor = 'black',
      line1 = '',
      line2 = '',
      line3 = ''
    } = config

    card.top = top
    card.style.border.fg = borderColor
    card.style.bg = bgColor

    card._line1.setContent(line1)
    card._line2.setContent(line2)
    card._line3.setContent(line3)
  }

  /**
   * Get or create a card for a specific index
   * @param {number} index - Logical index in the list
   * @returns {Object} Card element
   */
  function getCard(index) {
    if (inUse.has(index)) {
      return inUse.get(index)
    }

    const card = acquire()
    inUse.set(index, card)
    return card
  }

  /**
   * Get indices of cards currently in use
   * @returns {Set} Set of indices
   */
  function getInUseIndices() {
    return new Set(inUse.keys())
  }

  /**
   * Get pool statistics
   * @returns {Object} Stats
   */
  function getStats() {
    return {
      available: available.length,
      inUse: inUse.size,
      total: available.length + inUse.size
    }
  }

  /**
   * Destroy all cards and clean up
   */
  function destroy() {
    for (const card of available) {
      card.destroy()
    }
    for (const [, card] of inUse) {
      card.destroy()
    }
    available.length = 0
    inUse.clear()
  }

  return {
    acquire,
    release,
    releaseAll,
    getCard,
    updateCard,
    getInUseIndices,
    getStats,
    destroy
  }
}

export default createCardPool
