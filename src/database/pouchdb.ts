import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
PouchDB.plugin(PouchDBFind);

export interface Wrestler {
  _id?: string; // PouchDB doc id
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

// Allow the db instance to be overridden for testing
let db: PouchDB.Database = new PouchDB('fedsim-pouch');

export function initializeDB(dbName = 'fedsim-pouch', options?: PouchDB.Configuration.DatabaseConfiguration) {
  db = new PouchDB(dbName, options);
  return db;
}

export async function addWrestler(wrestler: Omit<Wrestler, '_id' | 'type'>): Promise<Wrestler> {
  const doc: Wrestler = {
    ...wrestler,
    type: 'Wrestler',
    _id: `wrestler:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
  };
  await db.put(doc);
  return doc;
}

export async function getWrestler(id: string): Promise<Wrestler | null> {
  try {
    const doc = await db.get(id);
    return doc as unknown as Wrestler;
  } catch (e) {
    if ((e as any).status === 404) return null;
    throw e;
  }
}

export async function updateWrestler(id: string, updates: Partial<Wrestler>): Promise<Wrestler> {
  const doc = await db.get(id);
  const updated = { ...doc, ...updates };
  await db.put(updated);
  return updated as Wrestler;
}

export async function deleteWrestler(id: string): Promise<void> {
  const doc = await db.get(id);
  await db.remove(doc);
}

export async function listWrestlers(): Promise<Wrestler[]> {
  const result = await db.find({ selector: { type: 'Wrestler' } });
  return result.docs as unknown as Wrestler[];
}

// Create an index on 'type' for efficient queries
(async () => {
  await db.createIndex({ index: { fields: ['type'] } });
})(); 