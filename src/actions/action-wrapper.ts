import { FedSimDatabase } from '../database/db.js';
import { logger } from '../utils/logger.js';
import type { TableName, DatabaseTable } from '../types/database.js';

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  operation: string;
  timestamp: Date;
}

export function createActionWrapper<T extends any[], R>(
  operation: string,
  action: (...args: T) => Promise<R> | R
) {
  return async (...args: T): Promise<ActionResult<R>> => {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting ${operation}`, { args });
      
      const result = await action(...args);
      const duration = Date.now() - startTime;
      
      logger.success(`Completed ${operation}`, { 
        duration: `${duration}ms`,
        resultType: typeof result,
        resultLength: Array.isArray(result) ? result.length : undefined
      }, result);
      
      return {
        success: true,
        data: result,
        operation,
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`Failed ${operation}`, { 
        duration: `${duration}ms`,
        error: errorMessage,
        args 
      });
      
      return {
        success: false,
        error: errorMessage,
        operation,
        timestamp: new Date(),
      };
    }
  };
}

// Generic database operations
export class DatabaseActions {
  constructor(private db: FedSimDatabase) {}

  // Helper method to safely access database tables
  private getTable<T>(tableName: string): DatabaseTable<T> {
    const validTables: TableName[] = ['Wrestler', 'Brand', 'Company', 'Production', 'Championship', 'Show', 'Venue', 'Segment', 'Appearance', 'Faction'];
    
    if (!validTables.includes(tableName as TableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }
    
    const table = (this.db as any)[tableName];
    if (!table) {
      throw new Error(`Table '${tableName}' not found`);
    }
    
    return table as DatabaseTable<T>;
  }

  // Generic CRUD operations with logging
  createRecord = createActionWrapper('Create Record', async (table: string, data: any) => {
    const tableRef = this.getTable(table);
    
    const id = await tableRef.add(data);
    const record = await tableRef.get(id);
    
    logger.info(`Created ${table} record`, { id, data: record });
    return record;
  });

  updateRecord = createActionWrapper('Update Record', async (table: string, id: number, updates: any) => {
    const tableRef = this.getTable(table);
    
    await tableRef.update(id, updates);
    const record = await tableRef.get(id);
    
    logger.info(`Updated ${table} record`, { id, updates, result: record });
    return record;
  });

  deleteRecord = createActionWrapper('Delete Record', async (table: string, id: number) => {
    const tableRef = this.getTable(table);
    
    const record = await tableRef.get(id);
    await tableRef.delete(id);
    
    logger.info(`Deleted ${table} record`, { id, deletedRecord: record });
    return { id, deleted: true };
  });

  fetchById = createActionWrapper('Fetch by ID', async (table: string, id: number) => {
    const tableRef = this.getTable(table);
    
    const record = await tableRef.get(id);
    logger.info(`Fetched ${table} by ID`, { id, found: !!record });
    return record;
  });

  fetchAll = createActionWrapper('Fetch All', async (table: string, limit?: number) => {
    const tableRef = this.getTable(table);
    
    const records = limit 
      ? await tableRef.toCollection().limit(limit).toArray()
      : await tableRef.toCollection().toArray();
    
    logger.info(`Fetched all ${table} records`, { count: records.length, limit });
    return records;
  });

  countRecords = createActionWrapper('Count Records', async (table: string) => {
    const tableRef = this.getTable(table);
    
    const count = await tableRef.count();
    logger.info(`Counted ${table} records`, { count });
    return count;
  });

  resetTable = createActionWrapper('Reset Table', async (table: string) => {
    const tableRef = this.getTable(table);
    
    const countBefore = await tableRef.count();
    await tableRef.clear();
    
    logger.warning(`Reset ${table} table`, { recordsDeleted: countBefore });
    return { recordsDeleted: countBefore };
  });
}