/**
 * UnparkContextUseCase tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UnparkContextUseCase } from '../../../src/use-cases/context/UnparkContextUseCase.js';

describe('UnparkContextUseCase', () => {
  let useCase;
  let mockSessionRepository;
  let mockCaptureRepository;
  let mockProjectRepository;

  beforeEach(() => {
    mockSessionRepository = {
      findActive: jest.fn(),
      save: jest.fn()
    };
    mockCaptureRepository = {
      findByStatus: jest.fn(),
      delete: jest.fn()
    };
    mockProjectRepository = {
      findById: jest.fn()
    };

    useCase = new UnparkContextUseCase({
      sessionRepository: mockSessionRepository,
      captureRepository: mockCaptureRepository,
      projectRepository: mockProjectRepository
    });
  });

  describe('execute()', () => {
    it('returns error when no parked contexts', async () => {
      mockCaptureRepository.findByStatus.mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result.success).toBe(false);
      expect(result.message).toContain('No parked contexts');
    });

    it('returns error when active session exists', async () => {
      const parkedContext = {
        id: 'ctx-123',
        context: { project: 'test', projectName: 'Test' },
        createdAt: new Date().toISOString()
      };
      mockCaptureRepository.findByStatus.mockResolvedValue([parkedContext]);
      mockSessionRepository.findActive.mockResolvedValue({ project: 'other-project' });

      const result = await useCase.execute();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot unpark');
      expect(result.message).toContain('active session');
    });

    it('restores most recent parked context by default', async () => {
      const olderContext = {
        id: 'ctx-older',
        context: {
          project: 'old-project',
          projectName: 'Old Project',
          task: 'Old task',
          parkedAt: new Date(Date.now() - 3600000).toISOString()
        },
        createdAt: new Date(Date.now() - 3600000).toISOString()
      };
      const newerContext = {
        id: 'ctx-newer',
        context: {
          project: 'new-project',
          projectName: 'New Project',
          task: 'New task',
          note: 'Important',
          parkedAt: new Date().toISOString(),
          breadcrumbs: []
        },
        createdAt: new Date().toISOString()
      };

      mockCaptureRepository.findByStatus.mockResolvedValue([olderContext, newerContext]);
      mockSessionRepository.findActive.mockResolvedValue(null);
      mockSessionRepository.save.mockResolvedValue();
      mockCaptureRepository.delete.mockResolvedValue();

      const result = await useCase.execute();

      expect(result.success).toBe(true);
      expect(result.context.project).toBe('new-project');
      expect(mockCaptureRepository.delete).toHaveBeenCalledWith('ctx-newer');
    });

    it('restores specific context by ID', async () => {
      const context1 = {
        id: 'ctx-123',
        context: {
          project: 'project-1',
          projectName: 'Project 1',
          parkedAt: new Date().toISOString(),
          breadcrumbs: []
        },
        createdAt: new Date().toISOString()
      };
      const context2 = {
        id: 'ctx-456',
        context: {
          project: 'project-2',
          projectName: 'Project 2',
          parkedAt: new Date().toISOString(),
          breadcrumbs: []
        },
        createdAt: new Date().toISOString()
      };

      mockCaptureRepository.findByStatus.mockResolvedValue([context1, context2]);
      mockSessionRepository.findActive.mockResolvedValue(null);
      mockSessionRepository.save.mockResolvedValue();
      mockCaptureRepository.delete.mockResolvedValue();

      const result = await useCase.execute('ctx-456');

      expect(result.success).toBe(true);
      expect(result.context.project).toBe('project-2');
    });

    it('returns error for unknown context ID', async () => {
      const context = {
        id: 'ctx-123',
        context: { project: 'test', projectName: 'Test' },
        createdAt: new Date().toISOString()
      };
      mockCaptureRepository.findByStatus.mockResolvedValue([context]);

      const result = await useCase.execute('unknown-id');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No parked context found');
    });

    it('starts new session on restore', async () => {
      const parkedContext = {
        id: 'ctx-123',
        context: {
          project: 'my-project',
          projectName: 'My Project',
          task: 'My task',
          parkedAt: new Date().toISOString(),
          breadcrumbs: []
        },
        createdAt: new Date().toISOString()
      };

      mockCaptureRepository.findByStatus.mockResolvedValue([parkedContext]);
      mockSessionRepository.findActive.mockResolvedValue(null);
      mockSessionRepository.save.mockResolvedValue();
      mockCaptureRepository.delete.mockResolvedValue();

      await useCase.execute();

      expect(mockSessionRepository.save).toHaveBeenCalled();
      const savedSession = mockSessionRepository.save.mock.calls[0][0];
      expect(savedSession.project).toBe('my-project');
    });

    it('deletes parked context after restore', async () => {
      const parkedContext = {
        id: 'ctx-to-delete',
        context: {
          project: 'project',
          projectName: 'Project',
          parkedAt: new Date().toISOString(),
          breadcrumbs: []
        },
        createdAt: new Date().toISOString()
      };

      mockCaptureRepository.findByStatus.mockResolvedValue([parkedContext]);
      mockSessionRepository.findActive.mockResolvedValue(null);
      mockSessionRepository.save.mockResolvedValue();
      mockCaptureRepository.delete.mockResolvedValue();

      await useCase.execute();

      expect(mockCaptureRepository.delete).toHaveBeenCalledWith('ctx-to-delete');
    });
  });

  describe('list()', () => {
    it('returns empty list when no parked contexts', async () => {
      mockCaptureRepository.findByStatus.mockResolvedValue([]);

      const result = await useCase.list();

      expect(result.contexts).toHaveLength(0);
      expect(result.message).toContain('No parked contexts');
    });

    it('returns list of parked contexts', async () => {
      const contexts = [
        {
          id: 'ctx-123-456-789',
          context: {
            projectName: 'Project 1',
            task: 'Task 1',
            note: 'Note 1',
            sessionDuration: 30,
            parkedAt: new Date().toISOString(),
            breadcrumbs: [{ text: 'step 1' }, { text: 'step 2' }]
          },
          createdAt: new Date().toISOString()
        },
        {
          id: 'ctx-abc-def-ghi',
          context: {
            projectName: 'Project 2',
            task: null,
            note: null,
            sessionDuration: 15,
            parkedAt: new Date().toISOString(),
            breadcrumbs: []
          },
          createdAt: new Date().toISOString()
        }
      ];

      mockCaptureRepository.findByStatus.mockResolvedValue(contexts);

      const result = await useCase.list();

      expect(result.contexts).toHaveLength(2);
      expect(result.contexts[0].id).toBe('ctx-123-');
      expect(result.contexts[0].project).toBe('Project 1');
      expect(result.contexts[0].breadcrumbs).toBe(2);
      expect(result.message).toContain('Parked Contexts');
    });
  });

  describe('getParkedContexts()', () => {
    it('returns contexts sorted by date descending', async () => {
      const older = {
        id: 'old',
        context: {},
        createdAt: new Date(Date.now() - 3600000).toISOString()
      };
      const newer = {
        id: 'new',
        context: {},
        createdAt: new Date().toISOString()
      };

      mockCaptureRepository.findByStatus.mockResolvedValue([older, newer]);

      const result = await useCase.getParkedContexts();

      expect(result[0].id).toBe('new');
      expect(result[1].id).toBe('old');
    });
  });
});
