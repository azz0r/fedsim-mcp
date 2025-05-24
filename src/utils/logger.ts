import chalk from 'chalk';

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  operation: string;
  details: any;
  result?: any;
}

export class Logger {
  private logs: LogEntry[] = [];

  log(level: LogEntry['level'], operation: string, details: any, result?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      operation,
      details,
      result,
    };

    this.logs.push(entry);
    this.printLog(entry);
  }

  info(operation: string, details: any, result?: any) {
    this.log('info', operation, details, result);
  }

  success(operation: string, details: any, result?: any) {
    this.log('success', operation, details, result);
  }

  warning(operation: string, details: any, result?: any) {
    this.log('warning', operation, details, result);
  }

  error(operation: string, details: any, result?: any) {
    this.log('error', operation, details, result);
  }

  private printLog(entry: LogEntry) {
    const timestamp = entry.timestamp.toISOString().slice(11, 23);
    const levelIcon = this.getLevelIcon(entry.level);
    const levelColor = this.getLevelColor(entry.level);
    
    console.log(levelColor(`${levelIcon} [${timestamp}] ${entry.operation}`));
    
    if (entry.details && Object.keys(entry.details).length > 0) {
      console.log(chalk.gray('   Details:'), this.formatObject(entry.details));
    }
    
    if (entry.result !== undefined) {
      console.log(chalk.gray('   Result:'), this.formatObject(entry.result));
    }
    
    console.log('');
  }

  private getLevelIcon(level: LogEntry['level']): string {
    switch (level) {
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
    }
  }

  private getLevelColor(level: LogEntry['level']) {
    switch (level) {
      case 'info': return chalk.blue;
      case 'success': return chalk.green;
      case 'warning': return chalk.yellow;
      case 'error': return chalk.red;
    }
  }

  private formatObject(obj: any): string {
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number') return obj.toString();
    if (typeof obj === 'boolean') return obj.toString();
    if (obj === null || obj === undefined) return String(obj);
    
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();