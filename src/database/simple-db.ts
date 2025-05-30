import type { PouchDBSelector, PouchDBFindResult, PouchDBFindOptions, DatabaseError } from '../types/database.js';

export interface Wrestler {
  _id?: string;
  id?: number;
  type: 'Wrestler';
  name: string;
  desc: string;
  image: string | null;
  images: string[];
  color: string;
  backgroundColor: string;
  brandIds: number[];
  entranceVideoUrl: string;
  pushed: boolean;
  remainingAppearances: number;
  contractType: string;
  contractExpires: Date;
  status: string;
  billedFrom: string;
  region: string;
  country: string;
  dob: Date | null;
  height: number;
  weight: number;
  alignment: string;
  gender: string;
  role: string;
  followers: number;
  losses: number;
  wins: number;
  streak: number;
  draws: number;
  points: number;
  morale: number;
  stamina: number;
  popularity: number;
  charisma: number;
  damage: number;
  active: boolean;
  retired: boolean;
  cost: number;
  special: string;
  finisher: string;
  musicUrl: string;
}

// Simple in-memory database for MCP server
class SimpleDBTable<T extends { _id?: string; id?: number; type: string }> {
  private storage = new Map<string, T>();

  constructor(private docType: string) {}

  async add(item: Omit<T, '_id' | 'id' | 'type'>): Promise<number> {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const doc = {
      ...item,
      _id: `${this.docType.toLowerCase()}:${id}`,
      id,
      type: this.docType,
    } as T;
    
    this.storage.set(doc._id!, doc);
    return id;
  }

  async get(id: number): Promise<T | undefined> {
    const docId = `${this.docType.toLowerCase()}:${id}`;
    return this.storage.get(docId);
  }

  async update(id: number, updates: Partial<T>): Promise<void> {
    const docId = `${this.docType.toLowerCase()}:${id}`;
    const existing = this.storage.get(docId);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.storage.set(docId, updated);
    }
  }

  async delete(id: number): Promise<void> {
    const docId = `${this.docType.toLowerCase()}:${id}`;
    this.storage.delete(docId);
  }

  async toArray(): Promise<T[]> {
    return Array.from(this.storage.values()).filter(doc => doc.type === this.docType);
  }

  where(field: keyof T) {
    return {
      equals: async (value: any): Promise<T[]> => {
        const results = Array.from(this.storage.values()).filter(doc => 
          doc.type === this.docType && doc[field] === value
        );
        return results;
      },
      contains: async (value: any): Promise<T[]> => {
        const results = Array.from(this.storage.values()).filter(doc => 
          doc.type === this.docType && 
          Array.isArray(doc[field]) && 
          (doc[field] as any[]).includes(value)
        );
        return results;
      },
      like: async (value: string): Promise<T[]> => {
        const results = Array.from(this.storage.values()).filter(doc => 
          doc.type === this.docType && 
          String(doc[field]).toLowerCase().includes(value.toLowerCase())
        );
        return results;
      }
    };
  }

  async count(): Promise<number> {
    return Array.from(this.storage.values()).filter(doc => doc.type === this.docType).length;
  }

  async clear(): Promise<void> {
    const keysToDelete = Array.from(this.storage.keys()).filter(key => 
      key.startsWith(`${this.docType.toLowerCase()}:`)
    );
    keysToDelete.forEach(key => this.storage.delete(key));
  }

  toCollection() {
    const self = this;
    return {
      offset(count: number) {
        return {
          async toArray(): Promise<T[]> {
            const all = await self.toArray();
            return all.slice(count);
          }
        };
      },
      sortBy(field: string) {
        return {
          async toArray(): Promise<T[]> {
            const all = await self.toArray();
            return all.sort((a, b) => {
              const aVal = a[field as keyof T];
              const bVal = b[field as keyof T];
              if (aVal < bVal) return -1;
              if (aVal > bVal) return 1;
              return 0;
            });
          }
        };
      },
      async toArray(): Promise<T[]> {
        return self.toArray();
      }
    };
  }

  filter(predicate: (item: T) => boolean) {
    const self = this;
    return {
      async toArray(): Promise<T[]> {
        const all = Array.from(self.storage.values()).filter(doc => doc.type === self.docType) as T[];
        return all.filter(predicate);
      }
    };
  }

  async query(selector: any, options: any = {}): Promise<T[]> {
    let results = Array.from(this.storage.values()).filter(doc => doc.type === this.docType);
    
    // Apply selector
    if (selector) {
      Object.keys(selector).forEach(key => {
        if (key !== 'type') {
          const value = selector[key];
          results = results.filter(doc => doc[key as keyof T] === value);
        }
      });
    }
    
    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }
}

export class SimpleDatabase {
  public Wrestler: SimpleDBTable<any>;
  public Brand: SimpleDBTable<any>;
  public Company: SimpleDBTable<any>;
  public Production: SimpleDBTable<any>;
  public Championship: SimpleDBTable<any>;
  public Show: SimpleDBTable<any>;
  public Venue: SimpleDBTable<any>;
  public Segment: SimpleDBTable<any>;
  public Appearance: SimpleDBTable<any>;
  public MatchResult: SimpleDBTable<any>;
  public Storyline: SimpleDBTable<any>;
  public StorylineSegment: SimpleDBTable<any>;
  public StorylineGoal: SimpleDBTable<any>;
  public Reign: SimpleDBTable<any>;
  public Rumble: SimpleDBTable<any>;
  public Bet: SimpleDBTable<any>;
  public Favourite: SimpleDBTable<any>;
  public Notification: SimpleDBTable<any>;

  constructor() {
    this.Wrestler = new SimpleDBTable('Wrestler');
    this.Brand = new SimpleDBTable('Brand');
    this.Company = new SimpleDBTable('Company');
    this.Production = new SimpleDBTable('Production');
    this.Championship = new SimpleDBTable('Championship');
    this.Show = new SimpleDBTable('Show');
    this.Venue = new SimpleDBTable('Venue');
    this.Segment = new SimpleDBTable('Segment');
    this.Appearance = new SimpleDBTable('Appearance');
    this.MatchResult = new SimpleDBTable('MatchResult');
    this.Storyline = new SimpleDBTable('Storyline');
    this.StorylineSegment = new SimpleDBTable('StorylineSegment');
    this.StorylineGoal = new SimpleDBTable('StorylineGoal');
    this.Reign = new SimpleDBTable('Reign');
    this.Rumble = new SimpleDBTable('Rumble');
    this.Bet = new SimpleDBTable('Bet');
    this.Favourite = new SimpleDBTable('Favourite');
    this.Notification = new SimpleDBTable('Notification');
  }

  async getSchema(): Promise<{ [tableName: string]: string[] }> {
    const schema: { [tableName: string]: string[] } = {};
    const tables = [
      'Wrestler', 'Brand', 'Company', 'Production', 'Championship', 
      'Show', 'Venue', 'Segment', 'MatchResult', 'Storyline',
      'StorylineSegment', 'StorylineGoal', 'Reign', 'Rumble', 
      'Bet', 'Favourite', 'Notification'
    ];
    
    tables.forEach(tableName => {
      schema[tableName] = ['id', 'type', '_id']; // Basic fields all tables have
    });
    
    return schema;
  }

  async backup(): Promise<any> {
    const backup: any = {};
    const tables = [
      'Wrestler', 'Brand', 'Company', 'Production', 'Championship', 
      'Show', 'Venue', 'Segment', 'MatchResult', 'Storyline',
      'StorylineSegment', 'StorylineGoal', 'Reign', 'Rumble', 
      'Bet', 'Favourite', 'Notification'
    ];
    
    for (const tableName of tables) {
      const table = this[tableName as keyof this] as SimpleDBTable<any>;
      backup[tableName] = await table.toArray();
    }
    
    return backup;
  }

  async find(options: any): Promise<{ docs: any[] }> {
    const { selector, sort, limit } = options;
    let results: any[] = [];

    // Get all documents and filter by selector
    const allTables = [
      this.Wrestler, this.Brand, this.Company, this.Production, 
      this.Championship, this.Show, this.Venue, this.Segment,
      this.MatchResult, this.Storyline, this.StorylineSegment, 
      this.StorylineGoal, this.Reign, this.Rumble, this.Bet, 
      this.Favourite, this.Notification
    ];

    for (const table of allTables) {
      const tableData = await table.toArray();
      results.push(...tableData);
    }

    // Apply selector filter
    if (selector) {
      results = results.filter(doc => {
        return Object.keys(selector).every(key => {
          const value = selector[key];
          
          if (key === 'brandIds' && value.$elemMatch !== undefined) {
            // Handle $elemMatch for array fields
            return Array.isArray(doc[key]) && doc[key].includes(value.$elemMatch);
          }
          
          return doc[key] === value;
        });
      });
    }

    // Apply sorting
    if (sort && Array.isArray(sort)) {
      results.sort((a, b) => {
        for (const sortField of sort) {
          const fieldName = Object.keys(sortField)[0];
          const direction = sortField[fieldName];
          
          const aVal = a[fieldName];
          const bVal = b[fieldName];
          
          let comparison = 0;
          if (aVal < bVal) comparison = -1;
          else if (aVal > bVal) comparison = 1;
          
          if (direction === 'desc') comparison *= -1;
          
          if (comparison !== 0) return comparison;
        }
        return 0;
      });
    }

    // Apply limit
    if (limit) {
      results = results.slice(0, limit);
    }

    return { docs: results };
  }
}

export const db = new SimpleDatabase();