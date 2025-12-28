/**
 * Debounce Utility
 *
 * Prevents excessive function calls by delaying execution
 * until after a specified wait period of inactivity.
 */

/**
 * Create a debounced function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute on leading edge instead of trailing
 * @returns {Function} Debounced function with cancel() method
 */
export function debounce(func, wait, immediate = false) {
  let timeout = null
  let lastArgs = null
  let lastThis = null

  function debounced(...args) {
    lastArgs = args
    lastThis = this

    const callNow = immediate && !timeout

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      timeout = null
      if (!immediate) {
        func.apply(lastThis, lastArgs)
      }
    }, wait)

    if (callNow) {
      func.apply(lastThis, lastArgs)
    }
  }

  debounced.cancel = function () {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  debounced.flush = function () {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
      func.apply(lastThis, lastArgs)
    }
  }

  return debounced
}

/**
 * Throttle utility - limits function calls to once per wait period
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, wait) {
  let lastTime = 0
  let timeout = null

  function throttled(...args) {
    const now = Date.now()
    const remaining = wait - (now - lastTime)

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      lastTime = now
      func.apply(this, args)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastTime = Date.now()
        timeout = null
        func.apply(this, args)
      }, remaining)
    }
  }

  throttled.cancel = function () {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return throttled
}

export default debounce
