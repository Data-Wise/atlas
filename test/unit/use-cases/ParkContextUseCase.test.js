/**
 * ParkContextUseCase tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ParkContextUseCase } from '../../../src/use-cases/context/ParkContextUseCase.js';

describe('ParkContextUseCase', () => {
  let useCase;
  let mockSessionRepository;
  let mockBreadcrumbRepository;
  let mockProjectRepository;
  let mockCaptureRepository;

  beforeEach(() => {
    mockSessionRepository = {
      findActive: jest.fn(),
      save: jest.fn()
    };
    mockBreadcrumbRepository = {
      findRecent: jest.fn()
    };
    mockProjectRepository = {
      findById: jest.fn()
    };
    mockCaptureRepository = {
      save: jest.fn()
    };

    useCase = new ParkContextUseCase({
      sessionRepository: mockSessionRepository,
      breadcrumbRepository: mockBreadcrumbRepository,
      projectRepository: mockProjectRepository,
      captureRepository: mockCaptureRepository
    });
  });

  describe('execute()', () => {
    it('returns error when no active session and not forced', async () => {
      mockSessionRepository.findActive.mockResolvedValue(null);

      const result = await useCase.execute();

      expect(result.success).toBe(false);
      expect(result.message).toContain('No active session');
    });

    it('allows parking without session when forced', async () => {
      mockSessionRepository.findActive.mockResolvedValue(null);
      mockCaptureRepository.save.mockResolvedValue();

      const result = await useCase.execute('my note', { force: true });

      expect(result.success).toBe(true);
      expect(result.parkedContext).toBeDefined();
      expect(result.parkedContext.note).toBe('my note');
    });

    it('parks active session with breadcrumbs', async () => {
      const mockSession = {
        project: 'test-project',
        task: 'Test task',
        startTime: new Date(Date.now() - 30 * 60000).toISOString(), // 30 min ago
        end: jest.fn()
      };
      const mockProject = { name: 'Test Project', focus: 'Current focus' };
      const mockBreadcrumbs = [
        { text: 'First step', createdAt: new Date() },
        { text: 'Second step', createdAt: new Date() }
      ];

      mockSessionRepository.findActive.mockResolvedValue(mockSession);
      mockProjectRepository.findById.mockResolvedValue(mockProject);
      mockBreadcrumbRepository.findRecent.mockResolvedValue(mockBreadcrumbs);
      mockCaptureRepository.save.mockResolvedValue();
      mockSessionRepository.save.mockResolvedValue();

      const result = await useCase.execute('need to switch');

      expect(result.success).toBe(true);
      expect(result.parkedContext.project).toBe('test-project');
      expect(result.parkedContext.projectName).toBe('Test Project');
      expect(result.parkedContext.task).toBe('Test task');
      expect(result.parkedContext.note).toBe('need to switch');
      expect(result.parkedContext.breadcrumbs).toHaveLength(2);
      expect(result.parkedContext.sessionDuration).toBeGreaterThan(0);

      // Should end session
      expect(mockSession.end).toHaveBeenCalledWith('interrupted');
      expect(mockSessionRepository.save).toHaveBeenCalledWith(mockSession);
    });

    it('keeps session running with keepSession option', async () => {
      const mockSession = {
        project: 'test-project',
        task: 'Test task',
        startTime: new Date().toISOString(),
        end: jest.fn()
      };

      mockSessionRepository.findActive.mockResolvedValue(mockSession);
      mockProjectRepository.findById.mockResolvedValue(null);
      mockBreadcrumbRepository.findRecent.mockResolvedValue([]);
      mockCaptureRepository.save.mockResolvedValue();

      const result = await useCase.execute('', { keepSession: true });

      expect(result.success).toBe(true);
      expect(mockSession.end).not.toHaveBeenCalled();
      expect(mockSessionRepository.save).not.toHaveBeenCalled();
    });

    it('saves capture with parked status', async () => {
      const mockSession = {
        project: 'test-project',
        task: 'Test task',
        startTime: new Date().toISOString(),
        end: jest.fn()
      };

      mockSessionRepository.findActive.mockResolvedValue(mockSession);
      mockProjectRepository.findById.mockResolvedValue(null);
      mockBreadcrumbRepository.findRecent.mockResolvedValue([]);
      mockCaptureRepository.save.mockResolvedValue();
      mockSessionRepository.save.mockResolvedValue();

      await useCase.execute('note');

      expect(mockCaptureRepository.save).toHaveBeenCalled();
      const savedCapture = mockCaptureRepository.save.mock.calls[0][0];
      expect(savedCapture.status).toBe('parked');
      expect(savedCapture.type).toBe('parked');
    });

    it('formats park message correctly', async () => {
      const mockSession = {
        project: 'my-project',
        task: 'Important work',
        startTime: new Date(Date.now() - 60 * 60000).toISOString(), // 1 hour ago
        end: jest.fn()
      };

      mockSessionRepository.findActive.mockResolvedValue(mockSession);
      mockProjectRepository.findById.mockResolvedValue({ name: 'My Project' });
      mockBreadcrumbRepository.findRecent.mockResolvedValue([{ text: 'breadcrumb', createdAt: new Date() }]);
      mockCaptureRepository.save.mockResolvedValue();
      mockSessionRepository.save.mockResolvedValue();

      const result = await useCase.execute('parking now');

      expect(result.message).toContain('Context parked');
      expect(result.message).toContain('My Project');
      expect(result.message).toContain('Important work');
      expect(result.message).toContain('parking now');
      expect(result.message).toContain('Breadcrumbs: 1 saved');
    });
  });
});
