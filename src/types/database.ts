// TypeScript interfaces for database operations and selectors

export interface PouchDBSelector {
  [key: string]: any;
  type?: string;
  active?: boolean;
  alignment?: 'FACE' | 'HEEL' | 'NEUTRAL';
  brandIds?: {
    $elemMatch?: number;
  };
}

export interface PouchDBFindResult<T> {
  docs: T[];
  bookmark?: string;
  warning?: string;
}

export interface PouchDBFindOptions {
  selector: PouchDBSelector;
  limit?: number;
  skip?: number;
  sort?: Array<{ [key: string]: 'asc' | 'desc' }>;
  fields?: string[];
  use_index?: string | [string, string];
}

export interface WrestlerSearchQuery {
  name?: string;
  alignment?: 'FACE' | 'HEEL' | 'NEUTRAL';
  brand?: number;
  active?: boolean;
  limit?: number;
}

export interface DatabaseError extends Error {
  status?: number;
  reason?: string;
}

export interface TypedDatabase {
  find<T>(options: PouchDBFindOptions): Promise<PouchDBFindResult<T>>;
}

// Table interface for generic operations
export interface DatabaseTable<T> {
  get(id: number): Promise<T | undefined>;
  add(item: Omit<T, '_id' | 'id' | 'type'>): Promise<number>;
  update(id: number, updates: Partial<T>): Promise<void>;
  delete(id: number): Promise<void>;
  count(): Promise<number>;
  clear(): Promise<void>;
  toArray(): Promise<T[]>;
  where(field: string): {
    equals(value: any): Promise<T[]>;
  };
  toCollection(): {
    limit(count: number): {
      toArray(): Promise<T[]>;
    };
    toArray(): Promise<T[]>;
  };
}

// Valid table names in the database
export type TableName = 'Wrestler' | 'Brand' | 'Company' | 'Production' | 'Championship' | 'Show' | 'Venue' | 'Segment' | 'Appearance' | 'Faction';

// Enhanced FedSimDatabase interface with typed methods
export interface TypedFedSimDatabase {
  find<T>(options: PouchDBFindOptions): Promise<PouchDBFindResult<T>>;
  Wrestler: DatabaseTable<import('../database/db.js').Wrestler>;
  Brand: DatabaseTable<import('../database/db.js').Brand>;
  Company: DatabaseTable<import('../database/db.js').Company>;
  Production: DatabaseTable<import('../database/db.js').Production>;
}