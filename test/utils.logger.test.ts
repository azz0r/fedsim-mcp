import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger, logger } from '../src/utils/logger';

describe('Logger Utility', () => {
  let mockConsoleLog: any;
  let testLogger: Logger;

  beforeEach(() => {
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    testLogger = new Logger();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe('Logger class', () => {
    it('should log info messages with correct format', () => {
      testLogger.info('Test Operation', { arg: 'value' });

      // Check that console.log was called multiple times (for operation, details, and empty line)
      expect(mockConsoleLog).toHaveBeenCalledTimes(3);
      
      // Check first call contains operation info with emoji and timestamp
      const firstCall = mockConsoleLog.mock.calls[0][0];
      expect(firstCall).toContain('ℹ️');
      expect(firstCall).toContain('Test Operation');
      expect(firstCall).toMatch(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/);
    });

    it('should log success messages with correct format', () => {
      testLogger.success('Test Operation', { arg: 'value' }, { result: 'success' });

      expect(mockConsoleLog).toHaveBeenCalledTimes(4); // operation, details, result, empty line
      
      const firstCall = mockConsoleLog.mock.calls[0][0];
      expect(firstCall).toContain('✅');
      expect(firstCall).toContain('Test Operation');
    });

    it('should log warning messages with correct format', () => {
      testLogger.warning('Test Operation', { arg: 'value' });

      expect(mockConsoleLog).toHaveBeenCalledTimes(3);
      
      const firstCall = mockConsoleLog.mock.calls[0][0];
      expect(firstCall).toContain('⚠️');
      expect(firstCall).toContain('Test Operation');
    });

    it('should log error messages with correct format', () => {
      testLogger.error('Test Operation', { arg: 'value' });

      expect(mockConsoleLog).toHaveBeenCalledTimes(3);
      
      const firstCall = mockConsoleLog.mock.calls[0][0];
      expect(firstCall).toContain('❌');
      expect(firstCall).toContain('Test Operation');
    });

    it('should include timestamp in log format', () => {
      testLogger.info('Test Operation', { arg: 'value' });

      const firstCall = mockConsoleLog.mock.calls[0][0];
      expect(firstCall).toMatch(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/);
    });

    it('should format details properly', () => {
      const details = { nested: { object: 'value' }, array: [1, 2, 3] };
      testLogger.info('Test Operation', details);

      expect(mockConsoleLog).toHaveBeenCalledTimes(3);
      
      // Check that details are logged
      const detailsCall = mockConsoleLog.mock.calls[1];
      expect(detailsCall[0]).toContain('Details:');
      expect(detailsCall[1]).toContain('nested');
    });

    it('should store log entries', () => {
      testLogger.info('Test 1', { arg: 'value1' });
      testLogger.success('Test 2', { arg: 'value2' });

      const logs = testLogger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].operation).toBe('Test 1');
      expect(logs[1].operation).toBe('Test 2');
    });

    it('should clear logs', () => {
      testLogger.info('Test 1', { arg: 'value1' });
      testLogger.clearLogs();

      const logs = testLogger.getLogs();
      expect(logs).toHaveLength(0);
    });

    it('should handle different result types', () => {
      testLogger.success('String result', {}, 'string result');
      testLogger.success('Number result', {}, 42);
      testLogger.success('Boolean result', {}, true);
      testLogger.success('Object result', {}, { key: 'value' });

      // Each success call makes 3 calls: operation, result, empty line
      expect(mockConsoleLog).toHaveBeenCalledTimes(12);
    });

    it('should handle null and undefined values', () => {
      testLogger.info('Null test', null);
      testLogger.info('Undefined test', undefined, null);

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle circular references in objects', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      expect(() => {
        testLogger.info('Circular test', circular);
      }).not.toThrow();

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should format different log levels correctly', () => {
      testLogger.info('Info test', {});
      testLogger.success('Success test', {});
      testLogger.warning('Warning test', {});
      testLogger.error('Error test', {});

      const calls = mockConsoleLog.mock.calls.map(call => call[0]).filter(call => typeof call === 'string');
      
      expect(calls.some(call => call.includes('ℹ️'))).toBe(true);
      expect(calls.some(call => call.includes('✅'))).toBe(true);
      expect(calls.some(call => call.includes('⚠️'))).toBe(true);
      expect(calls.some(call => call.includes('❌'))).toBe(true);
    });
  });

  describe('Global logger instance', () => {
    it('should be available as singleton', () => {
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should work with singleton instance', () => {
      logger.info('Test with singleton', { test: true });

      expect(mockConsoleLog).toHaveBeenCalledTimes(3);
      
      const firstCall = mockConsoleLog.mock.calls[0][0];
      expect(firstCall).toContain('ℹ️');
      expect(firstCall).toContain('Test with singleton');
    });

    it('should maintain separate log history', () => {
      const initialLogs = logger.getLogs().length;
      
      logger.info('Singleton test', {});
      testLogger.info('Instance test', {});

      expect(logger.getLogs().length).toBe(initialLogs + 1);
      expect(testLogger.getLogs().length).toBe(1);
    });
  });
});