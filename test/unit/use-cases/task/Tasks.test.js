import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { AddTaskUseCase } from '../../../../src/use-cases/task/AddTaskUseCase.js'
import { ListTasksUseCase } from '../../../../src/use-cases/task/ListTasksUseCase.js'
import { CompleteTaskUseCase } from '../../../../src/use-cases/task/CompleteTaskUseCase.js'
import { RemoveTaskUseCase } from '../../../../src/use-cases/task/RemoveTaskUseCase.js'
import { ReceiveSchedulePushUseCase } from '../../../../src/use-cases/task/ReceiveSchedulePushUseCase.js'
import { AgendaUseCase } from '../../../../src/use-cases/task/AgendaUseCase.js'
import { Task } from '../../../../src/domain/entities/Task.js'
import { ScheduleRecord } from '../../../../src/domain/entities/ScheduleRecord.js'

describe('Task Use Cases', () => {
  let mockTaskRepository
  let mockScheduleRecordRepository
  let mockProjectRepository
  let mockEventPublisher

  beforeEach(() => {
    mockTaskRepository = {
      save: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
      search: jest.fn()
    }
    mockScheduleRecordRepository = {
      saveAll: jest.fn(),
      findAll: jest.fn()
    }
    mockProjectRepository = {
      findAll: jest.fn()
    }
    mockEventPublisher = {
      publish: jest.fn()
    }
  })

  describe('AddTaskUseCase', () => {
    it('creates a task with correct properties and publishes event', async () => {
      const useCase = new AddTaskUseCase({
        taskRepository: mockTaskRepository,
        eventPublisher: mockEventPublisher
      })

      const task = await useCase.execute({
        description: 'Implement tests',
        options: {
          projectId: 'atlas',
          dueDate: '2026-07-10',
          priority: 'high'
        }
      })

      expect(task).toBeInstanceOf(Task)
      expect(task.description).toBe('Implement tests')
      expect(task.projectId).toBe('atlas')
      expect(task.priority.value).toBe('high')
      expect(mockTaskRepository.save).toHaveBeenCalledWith(task)
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TaskAdded' })
      )
    })
  })

  describe('ListTasksUseCase', () => {
    it('lists tasks with filters', async () => {
      const t1 = new Task('t1', 'T1', { projectId: 'p1', completed: false })
      const t2 = new Task('t2', 'T2', { projectId: 'p2', completed: true })
      mockTaskRepository.findAll.mockResolvedValue([t1, t2])

      const useCase = new ListTasksUseCase({ taskRepository: mockTaskRepository })

      const activeTasks = await useCase.execute({ completed: false })
      expect(activeTasks).toHaveLength(1)
      expect(activeTasks[0].description).toBe('T1')

      const projTasks = await useCase.execute({ project: 'p2' })
      expect(projTasks).toHaveLength(1)
      expect(projTasks[0].description).toBe('T2')
    })
  })

  describe('CompleteTaskUseCase', () => {
    it('completes task and publishes event', async () => {
      const task = new Task('t1', 'T1', { completed: false })
      mockTaskRepository.findById.mockResolvedValue(task)

      const useCase = new CompleteTaskUseCase({
        taskRepository: mockTaskRepository,
        eventPublisher: mockEventPublisher
      })

      const result = await useCase.execute({ taskId: task.id })
      expect(result.completed).toBe(true)
      expect(mockTaskRepository.save).toHaveBeenCalledWith(task)
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TaskCompleted' })
      )
    })
  })

  describe('RemoveTaskUseCase', () => {
    it('removes task and publishes event', async () => {
      const task = new Task('t1', 'T1')
      mockTaskRepository.findById.mockResolvedValue(task)
      mockTaskRepository.delete.mockResolvedValue(true)

      const useCase = new RemoveTaskUseCase({
        taskRepository: mockTaskRepository,
        eventPublisher: mockEventPublisher
      })

      const result = await useCase.execute({ taskId: task.id })
      expect(result).toBe(true)
      expect(mockTaskRepository.delete).toHaveBeenCalledWith(task.id)
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TaskRemoved' })
      )
    })
  })

  describe('ReceiveSchedulePushUseCase', () => {
    it('upserts schedule records avoiding duplicates', async () => {
      const r1 = new ScheduleRecord({ date: '2026-07-05', label: 'L1', project: 'p1', type: 'research' })
      mockScheduleRecordRepository.findAll.mockResolvedValue([r1])

      const useCase = new ReceiveSchedulePushUseCase({
        scheduleRecordRepository: mockScheduleRecordRepository,
        eventPublisher: mockEventPublisher
      })

      // Updates existing (L1, p1) and adds new (L2, p2)
      const data = [
        { date: '2026-07-05', label: 'L1', project: 'p1', type: 'general' },
        { date: '2026-07-06', label: 'L2', project: 'p2', type: 'teaching' }
      ]

      const result = await useCase.execute({ data })
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(r1.id) // Same ID (upsert)
      expect(result[0].type).toBe('general') // Updated
      expect(result[1].project).toBe('p2')

      expect(mockScheduleRecordRepository.saveAll).toHaveBeenCalledWith(result)
    })
  })

  describe('AgendaUseCase', () => {
    it('merges tasks and schedule records in window', async () => {
      const now = new Date()
      const tzOffset = now.getTimezoneOffset() * 60000
      const localToday = new Date(now.getTime() - tzOffset)
      const todayStr = localToday.toISOString().split('T')[0]

      const task = new Task('t1', 'Task 1', {
        projectId: 'p1',
        dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2) // 2 days in future
      })
      const record = new ScheduleRecord({
        date: todayStr,
        label: 'Meeting',
        project: 'p1',
        type: 'teaching'
      })

      mockTaskRepository.findAll.mockResolvedValue([task])
      mockScheduleRecordRepository.findAll.mockResolvedValue([record])
      mockProjectRepository.findAll.mockResolvedValue([])

      const useCase = new AgendaUseCase({
        taskRepository: mockTaskRepository,
        scheduleRecordRepository: mockScheduleRecordRepository,
        projectRepository: mockProjectRepository
      })

      const result = await useCase.execute({ windowDays: 7 })
      expect(result).toHaveLength(2)
      // Sorted by date: record (todayStr) first, task (2 days from now) second
      expect(result[0].label).toBe('Meeting')
      expect(result[1].label).toBe('Task 1')
    })
  })
})
