import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import type { PouchDBSelector, PouchDBFindResult, PouchDBFindOptions, DatabaseError } from '../types/database.js';
PouchDB.plugin(PouchDBFind);

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
  totalReigns: number;
}

export interface Brand {
  _id?: string;
  id?: number;
  type: 'Brand';
  name: string;
  desc: string;
  image: string | null;
  images: string[];
  color: string;
  backgroundColor: string;
  directorId: number | null;
  balance: number;
  companyId: number | null;
}

export interface Company {
  _id?: string;
  id?: number;
  type: 'Company';
  name: string;
  desc: string;
  image: string | null;
}

export interface Production {
  _id?: string;
  id?: number;
  type: 'Production';
  name: string;
  desc: string;
  image: string | null;
  color: string;
  backgroundColor: string;
  brandIds: number[];
  venueId: number | null;
  segmentIds: number[];
  showId: number | null;
  date: Date | null;
  wrestlersCost: number;
  segmentsCost: number;
  merchIncome: number;
  attendanceIncome: number;
  attendance: number;
  viewers: number;
  step: number;
  complete: boolean;
}

class PouchDBTable<T extends { _id?: string; id?: number; type: string }> {
  constructor(private db: PouchDB.Database, private docType: string) {}

  async add(item: Omit<T, '_id' | 'id' | 'type'>): Promise<number> {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const doc = {
      ...item,
      _id: `${this.docType.toLowerCase()}:${id}`,
      id,
      type: this.docType,
    } as T;
    
    await this.db.put(doc);
    return id;
  }

  async get(id: number): Promise<T | undefined> {
    try {
      const doc = await this.db.get(`${this.docType.toLowerCase()}:${id}`);
      return doc as unknown as T;
    } catch (e) {
      const error = e as DatabaseError;
      if (error.status === 404) return undefined;
      throw e;
    }
  }

  async update(id: number, updates: Partial<T>): Promise<void> {
    const doc = await this.db.get(`${this.docType.toLowerCase()}:${id}`);
    const updated = { ...doc, ...updates };
    await this.db.put(updated);
  }

  async delete(id: number): Promise<void> {
    const doc = await this.db.get(`${this.docType.toLowerCase()}:${id}`);
    await this.db.remove(doc);
  }

  async toArray(): Promise<T[]> {
    const result = await this.db.find({ selector: { type: this.docType } });
    return result.docs as unknown as T[];
  }

  where(field: keyof T) {
    return {
      equals: async (value: any): Promise<T[]> => {
        const result = await this.db.find({ 
          selector: { 
            type: this.docType,
            [field as string]: value 
          } 
        });
        return result.docs as unknown as T[];
      }
    };
  }

  filter(predicate: (item: T) => boolean) {
    return {
      toArray: async (): Promise<T[]> => {
        const all = await this.toArray();
        return all.filter(predicate);
      },
      reverse: () => ({
        toArray: async (): Promise<T[]> => {
          const all = await this.toArray();
          return all.filter(predicate).reverse();
        }
      })
    };
  }

  orderBy(field: keyof T) {
    return {
      toArray: async (): Promise<T[]> => {
        const all = await this.toArray();
        return all.sort((a, b) => {
          const aVal = a[field];
          const bVal = b[field];
          if (aVal < bVal) return -1;
          if (aVal > bVal) return 1;
          return 0;
        });
      },
      limit: (count: number) => ({
        toArray: async (): Promise<T[]> => {
          const all = await this.toArray();
          return all.sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];
            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
            return 0;
          }).slice(0, count);
        }
      }),
      reverse: () => ({
        toArray: async (): Promise<T[]> => {
          const all = await this.toArray();
          return all.sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];
            if (aVal < bVal) return 1;
            if (aVal > bVal) return -1;
            return 0;
          });
        },
        limit: (count: number) => ({
          toArray: async (): Promise<T[]> => {
            const all = await this.toArray();
            return all.sort((a, b) => {
              const aVal = a[field];
              const bVal = b[field];
              if (aVal < bVal) return 1;
              if (aVal > bVal) return -1;
              return 0;
            }).slice(0, count);
          }
        })
      })
    };
  }

  toCollection() {
    return {
      toArray: async (): Promise<T[]> => {
        return await this.toArray();
      },
      limit: (count: number) => ({
        toArray: async (): Promise<T[]> => {
          const all = await this.toArray();
          return all.slice(0, count);
        }
      }),
      filter: (predicate: (item: T) => boolean) => ({
        toArray: async (): Promise<T[]> => {
          const all = await this.toArray();
          return all.filter(predicate);
        },
        limit: (count: number) => ({
          toArray: async (): Promise<T[]> => {
            const all = await this.toArray();
            return all.filter(predicate).slice(0, count);
          }
        })
      })
    };
  }
}

export class FedSimDatabase {
  private db: PouchDB.Database;
  public Wrestler: PouchDBTable<Wrestler>;
  public Brand: PouchDBTable<Brand>;
  public Company: PouchDBTable<Company>;
  public Production: PouchDBTable<Production>;
  public Championship: PouchDBTable<any>;
  public Show: PouchDBTable<any>;
  public Venue: PouchDBTable<any>;
  public Segment: PouchDBTable<any>;
  public Appearance: PouchDBTable<any>;
  public Faction: PouchDBTable<any>;
  public Draft: PouchDBTable<any>;
  public Game: PouchDBTable<any>;
  public StorylineTemplate: PouchDBTable<any>;
  public ActiveStoryline: PouchDBTable<any>;
  public StorylineSegment: PouchDBTable<any>;
  public StorylineGoal: PouchDBTable<any>;
  public Reign: PouchDBTable<any>;
  public Rumble: PouchDBTable<any>;
  public Bet: PouchDBTable<any>;
  public Favourite: PouchDBTable<any>;
  public Notification: PouchDBTable<any>;

  constructor() {
    this.db = new PouchDB('fedsim-database');
    this.Wrestler = new PouchDBTable(this.db, 'Wrestler');
    this.Brand = new PouchDBTable(this.db, 'Brand');
    this.Company = new PouchDBTable(this.db, 'Company');
    this.Production = new PouchDBTable(this.db, 'Production');
    this.Championship = new PouchDBTable(this.db, 'Championship');
    this.Show = new PouchDBTable(this.db, 'Show');
    this.Venue = new PouchDBTable(this.db, 'Venue');
    this.Segment = new PouchDBTable(this.db, 'Segment');
    this.Appearance = new PouchDBTable(this.db, 'Appearance');
    this.Faction = new PouchDBTable(this.db, 'Faction');
    this.Draft = new PouchDBTable(this.db, 'Draft');
    this.Game = new PouchDBTable(this.db, 'Game');
    this.StorylineTemplate = new PouchDBTable(this.db, 'StorylineTemplate');
    this.ActiveStoryline = new PouchDBTable(this.db, 'ActiveStoryline');
    this.StorylineSegment = new PouchDBTable(this.db, 'StorylineSegment');
    this.StorylineGoal = new PouchDBTable(this.db, 'StorylineGoal');
    this.Reign = new PouchDBTable(this.db, 'Reign');
    this.Rumble = new PouchDBTable(this.db, 'Rumble');
    this.Bet = new PouchDBTable(this.db, 'Bet');
    this.Favourite = new PouchDBTable(this.db, 'Favourite');
    this.Notification = new PouchDBTable(this.db, 'Notification');
  }

  async open(): Promise<void> {
    // Create indexes for efficient queries
    await this.db.createIndex({ index: { fields: ['type'] } });
  }

  async find<T>(options: PouchDBFindOptions): Promise<PouchDBFindResult<T>> {
    try {
      const result = await this.db.find(options);
      return {
        docs: result.docs as T[],
        bookmark: (result as any).bookmark,
        warning: (result as any).warning
      };
    } catch (e) {
      const error = e as DatabaseError;
      throw new Error(`Database find failed: ${error.message || error.reason || 'Unknown error'}`);
    }
  }

  async delete(): Promise<void> {
    await this.db.destroy();
  }
}

let dbInstance: FedSimDatabase | null = null;

export async function initializeDatabase(): Promise<FedSimDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = new FedSimDatabase();
  
  try {
    await dbInstance.open();
    return dbInstance;
  } catch (error) {
    throw error;
  }
}

export function getDatabase(): FedSimDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbInstance;
}