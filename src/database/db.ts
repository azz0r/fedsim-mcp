import Dexie, { Table } from 'dexie';
import 'fake-indexeddb/auto';
import { version, name, stores } from './schema.js';

export interface Wrestler {
  id?: number;
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

export interface Brand {
  id?: number;
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

export interface Production {
  id?: number;
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

export class FedSimDatabase extends Dexie {
  Wrestler!: Table<Wrestler>;
  Brand!: Table<Brand>;
  Company!: Table<any>;
  Championship!: Table<any>;
  Show!: Table<any>;
  Venue!: Table<any>;
  Production!: Table<Production>;
  Segment!: Table<any>;
  Appearance!: Table<any>;
  Faction!: Table<any>;
  Draft!: Table<any>;
  Game!: Table<any>;
  StorylineTemplate!: Table<any>;
  ActiveStoryline!: Table<any>;
  StorylineSegment!: Table<any>;
  StorylineGoal!: Table<any>;
  Reign!: Table<any>;
  Rumble!: Table<any>;
  Bet!: Table<any>;
  Favourite!: Table<any>;
  Notification!: Table<any>;

  constructor() {
    super(name);
    this.version(version).stores(stores);
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
    console.log('Database opened successfully');
    return dbInstance;
  } catch (error) {
    console.error('Failed to open database:', error);
    throw error;
  }
}

export function getDatabase(): FedSimDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbInstance;
}