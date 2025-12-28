/**
 * Tests for ViewStateManager
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { createViewStateManager } from '../../../../src/cli/dashboard/ViewStateManager.js'

describe('ViewStateManager', () => {
  let stateManager

  beforeEach(() => {
    stateManager = createViewStateManager()
  })

  afterEach(() => {
    if (stateManager) {
      stateManager.destroy()
    }
  })

  describe('initial state', () => {
    it('should have default values', () => {
      const state = stateManager.getState()

      expect(state.selectedIndex).toBe(0)
      expect(state.selectedProject).toBeNull()
      expect(state.filter).toBe('*')
      expect(state.searchTerm).toBe('')
      expect(state.allProjects).toEqual([])
      expect(state.filteredProjects).toEqual([])
      expect(state.activeSession).toBeNull()
      expect(state.theme).toBe('default')
    })

    it('should accept custom defaults', () => {
      const manager = createViewStateManager({
        defaultFilter: 'a',
        theme: 'dark'
      })

      expect(manager.get('filter')).toBe('a')
      expect(manager.get('theme')).toBe('dark')

      manager.destroy()
    })
  })

  describe('update', () => {
    it('should update state', () => {
      stateManager.update({ selectedIndex: 5 })
      expect(stateManager.get('selectedIndex')).toBe(5)
    })

    it('should update multiple fields', () => {
      stateManager.update({
        selectedIndex: 3,
        filter: 'a',
        searchTerm: 'test'
      })

      expect(stateManager.get('selectedIndex')).toBe(3)
      expect(stateManager.get('filter')).toBe('a')
      expect(stateManager.get('searchTerm')).toBe('test')
    })

    it('should return changed fields', () => {
      const changed = stateManager.update({
        selectedIndex: 5,
        filter: 'p'
      })

      expect(changed).toContain('selectedIndex')
      expect(changed).toContain('filter')
    })

    it('should not include unchanged fields', () => {
      stateManager.update({ filter: '*' }) // same as default
      const changed = stateManager.update({ filter: '*' })

      expect(changed).not.toContain('filter')
    })
  })

  describe('subscribe', () => {
    it('should notify subscribers on update', () => {
      const callback = jest.fn()
      stateManager.subscribe(callback)

      stateManager.update({ selectedIndex: 1 })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ selectedIndex: 1 }),
        ['selectedIndex']
      )
    })

    it('should allow unsubscribe', () => {
      const callback = jest.fn()
      const unsubscribe = stateManager.subscribe(callback)

      unsubscribe()
      stateManager.update({ selectedIndex: 2 })

      expect(callback).not.toHaveBeenCalled()
    })

    it('should not notify on silent update', () => {
      const callback = jest.fn()
      stateManager.subscribe(callback)

      stateManager.update({ selectedIndex: 5 }, { silent: true })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('subscribeToField', () => {
    it('should notify on specific field change', () => {
      const callback = jest.fn()
      stateManager.subscribeToField('filter', callback)

      stateManager.update({ filter: 'a' })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith('a', expect.any(Object))
    })

    it('should not notify on other field changes', () => {
      const callback = jest.fn()
      stateManager.subscribeToField('filter', callback)

      stateManager.update({ selectedIndex: 5 })

      expect(callback).not.toHaveBeenCalled()
    })

    it('should allow unsubscribe', () => {
      const callback = jest.fn()
      const unsubscribe = stateManager.subscribeToField('filter', callback)

      unsubscribe()
      stateManager.update({ filter: 'p' })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('setProjects', () => {
    const mockProjects = [
      { name: 'atlas', status: 'active' },
      { name: 'flow-cli', status: 'paused' },
      { name: 'mcp-server', status: 'stable' }
    ]

    it('should set all projects', () => {
      stateManager.setProjects(mockProjects)

      expect(stateManager.get('allProjects')).toHaveLength(3)
      expect(stateManager.get('filteredProjects')).toHaveLength(3)
    })

    it('should apply current filter', () => {
      stateManager.setFilter('a')
      stateManager.setProjects(mockProjects)

      expect(stateManager.get('filteredProjects')).toHaveLength(1)
      expect(stateManager.get('filteredProjects')[0].name).toBe('atlas')
    })

    it('should select first project', () => {
      stateManager.setProjects(mockProjects)

      expect(stateManager.get('selectedProject')).toEqual(mockProjects[0])
    })
  })

  describe('setFilter', () => {
    const mockProjects = [
      { name: 'atlas', status: 'active' },
      { name: 'flow-cli', status: 'paused' },
      { name: 'mcp-server', status: 'stable' },
      { name: 'research', status: 'active' }
    ]

    beforeEach(() => {
      stateManager.setProjects(mockProjects)
    })

    it('should filter by active', () => {
      stateManager.setFilter('a')

      const filtered = stateManager.get('filteredProjects')
      expect(filtered).toHaveLength(2)
      expect(filtered.every(p => p.status === 'active')).toBe(true)
    })

    it('should filter by paused', () => {
      stateManager.setFilter('p')

      const filtered = stateManager.get('filteredProjects')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].status).toBe('paused')
    })

    it('should filter by stable', () => {
      stateManager.setFilter('s')

      const filtered = stateManager.get('filteredProjects')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].status).toBe('stable')
    })

    it('should show all with * filter', () => {
      stateManager.setFilter('a')
      stateManager.setFilter('*')

      expect(stateManager.get('filteredProjects')).toHaveLength(4)
    })

    it('should adjust selection when filter reduces list', () => {
      stateManager.selectByIndex(3) // select 'research' (index 3)
      stateManager.setFilter('p') // only 1 project now

      expect(stateManager.get('selectedIndex')).toBe(0)
    })
  })

  describe('setSearchTerm', () => {
    const mockProjects = [
      { name: 'atlas', status: 'active', focus: 'Add stats command' },
      { name: 'flow-cli', status: 'paused', next: 'Fix bug' },
      { name: 'mcp-server', status: 'stable' }
    ]

    beforeEach(() => {
      stateManager.setProjects(mockProjects)
    })

    it('should search by name', () => {
      stateManager.setSearchTerm('atlas')

      expect(stateManager.get('filteredProjects')).toHaveLength(1)
      expect(stateManager.get('filteredProjects')[0].name).toBe('atlas')
    })

    it('should search by focus', () => {
      stateManager.setSearchTerm('stats')

      expect(stateManager.get('filteredProjects')).toHaveLength(1)
    })

    it('should search by next', () => {
      stateManager.setSearchTerm('bug')

      expect(stateManager.get('filteredProjects')).toHaveLength(1)
      expect(stateManager.get('filteredProjects')[0].name).toBe('flow-cli')
    })

    it('should be case insensitive', () => {
      stateManager.setSearchTerm('ATLAS')

      expect(stateManager.get('filteredProjects')).toHaveLength(1)
    })

    it('should combine with filter', () => {
      stateManager.setFilter('a')
      stateManager.setSearchTerm('atlas')

      expect(stateManager.get('filteredProjects')).toHaveLength(1)
    })

    it('should clear search with empty string', () => {
      stateManager.setSearchTerm('atlas')
      stateManager.setSearchTerm('')

      expect(stateManager.get('filteredProjects')).toHaveLength(3)
    })
  })

  describe('selectByIndex', () => {
    const mockProjects = [
      { name: 'project1' },
      { name: 'project2' },
      { name: 'project3' }
    ]

    beforeEach(() => {
      stateManager.setProjects(mockProjects)
    })

    it('should select by index', () => {
      const project = stateManager.selectByIndex(1)

      expect(project.name).toBe('project2')
      expect(stateManager.get('selectedIndex')).toBe(1)
      expect(stateManager.get('selectedProject')).toEqual(project)
    })

    it('should clamp to valid range', () => {
      stateManager.selectByIndex(100)
      expect(stateManager.get('selectedIndex')).toBe(2)

      stateManager.selectByIndex(-5)
      expect(stateManager.get('selectedIndex')).toBe(0)
    })

    it('should handle empty list', () => {
      stateManager.setProjects([])
      const project = stateManager.selectByIndex(0)

      expect(project).toBeNull()
      expect(stateManager.get('selectedProject')).toBeNull()
    })
  })

  describe('moveSelection', () => {
    const mockProjects = [
      { name: 'project1' },
      { name: 'project2' },
      { name: 'project3' }
    ]

    beforeEach(() => {
      stateManager.setProjects(mockProjects)
    })

    it('should move down', () => {
      stateManager.moveSelection(1)
      expect(stateManager.get('selectedIndex')).toBe(1)

      stateManager.moveSelection(1)
      expect(stateManager.get('selectedIndex')).toBe(2)
    })

    it('should move up', () => {
      stateManager.selectByIndex(2)
      stateManager.moveSelection(-1)
      expect(stateManager.get('selectedIndex')).toBe(1)
    })

    it('should not go below 0', () => {
      stateManager.moveSelection(-1)
      expect(stateManager.get('selectedIndex')).toBe(0)
    })

    it('should not exceed list length', () => {
      stateManager.selectByIndex(2)
      stateManager.moveSelection(1)
      expect(stateManager.get('selectedIndex')).toBe(2)
    })
  })

  describe('selectPosition', () => {
    const mockProjects = [
      { name: 'first' },
      { name: 'middle' },
      { name: 'last' }
    ]

    beforeEach(() => {
      stateManager.setProjects(mockProjects)
    })

    it('should select first', () => {
      stateManager.selectByIndex(2)
      stateManager.selectPosition('first')

      expect(stateManager.get('selectedIndex')).toBe(0)
      expect(stateManager.get('selectedProject').name).toBe('first')
    })

    it('should select last', () => {
      stateManager.selectPosition('last')

      expect(stateManager.get('selectedIndex')).toBe(2)
      expect(stateManager.get('selectedProject').name).toBe('last')
    })
  })

  describe('setActiveSession', () => {
    it('should set active session', () => {
      stateManager.setActiveSession('atlas')
      expect(stateManager.get('activeSession')).toBe('atlas')
    })

    it('should clear with null', () => {
      stateManager.setActiveSession('atlas')
      stateManager.setActiveSession(null)
      expect(stateManager.get('activeSession')).toBeNull()
    })

    it('should notify subscribers', () => {
      const callback = jest.fn()
      stateManager.subscribeToField('activeSession', callback)

      stateManager.setActiveSession('atlas')

      expect(callback).toHaveBeenCalledWith('atlas', expect.any(Object))
    })
  })

  describe('updatePomodoro', () => {
    it('should update pomodoro state', () => {
      stateManager.updatePomodoro({ isActive: true, remaining: 1500 })

      const pomodoro = stateManager.get('pomodoroState')
      expect(pomodoro.isActive).toBe(true)
      expect(pomodoro.remaining).toBe(1500)
    })

    it('should merge with existing state', () => {
      stateManager.updatePomodoro({ isActive: true })
      stateManager.updatePomodoro({ remaining: 1000 })

      const pomodoro = stateManager.get('pomodoroState')
      expect(pomodoro.isActive).toBe(true)
      expect(pomodoro.remaining).toBe(1000)
    })
  })

  describe('reset', () => {
    it('should reset to defaults', () => {
      stateManager.setProjects([{ name: 'test' }])
      stateManager.setFilter('a')
      stateManager.setSearchTerm('search')
      stateManager.setActiveSession('test')

      stateManager.reset()

      expect(stateManager.get('selectedIndex')).toBe(0)
      expect(stateManager.get('filter')).toBe('*')
      expect(stateManager.get('searchTerm')).toBe('')
      expect(stateManager.get('activeSession')).toBeNull()
    })
  })

  describe('destroy', () => {
    it('should clear all subscribers', () => {
      const callback = jest.fn()
      stateManager.subscribe(callback)
      stateManager.subscribeToField('filter', callback)

      stateManager.destroy()
      stateManager.update({ filter: 'a' })

      expect(callback).not.toHaveBeenCalled()
    })
  })
})
