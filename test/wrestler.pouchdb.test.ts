import { describe, it, expect, beforeEach } from 'vitest';
import PouchDB from 'pouchdb';
// Use dynamic require for pouchdb-find and pouchdb-adapter-memory for compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
PouchDB.plugin(require('pouchdb-find'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
PouchDB.plugin(require('pouchdb-adapter-memory'));

import {
  addWrestler,
  getWrestler,
  updateWrestler,
  deleteWrestler,
  listWrestlers,
  initializeDB,
  Wrestler,
} from '../src/database/pouchdb';

// Test data factory
function createTestWrestler(overrides: Partial<Omit<Wrestler, '_id' | 'type'>> = {}): Omit<Wrestler, '_id' | 'type'> {
  return {
    name: 'Test Wrestler',
    desc: 'Test Description',
    image: null,
    images: [],
    color: '#fff',
    backgroundColor: '#000',
    brandIds: [],
    entranceVideoUrl: '',
    pushed: false,
    remainingAppearances: 10,
    contractType: 'FULL',
    contractExpires: new Date(),
    status: 'SIGNED',
    billedFrom: '',
    region: '',
    country: '',
    dob: null,
    height: 180,
    weight: 200,
    alignment: 'FACE',
    gender: 'MALE',
    role: 'DEFAULT',
    followers: 0,
    losses: 0,
    wins: 0,
    streak: 0,
    draws: 0,
    points: 50,
    morale: 50,
    stamina: 50,
    popularity: 0,
    charisma: 50,
    damage: 0,
    active: true,
    retired: false,
    cost: 100,
    special: '',
    finisher: '',
    musicUrl: '',
    ...overrides
  };
}

// Initialize test database before each test
beforeEach(() => {
  // Use in-memory adapter for tests to avoid file system persistence
  initializeDB(`testdb-${Date.now()}`, { adapter: 'memory' });
});

describe('PouchDB Wrestler CRUD', () => {
  it('should add and get a wrestler', async () => {
    const wrestler = createTestWrestler({ name: 'Test' });
    const added = await addWrestler(wrestler);
    expect(added._id).toBeDefined();
    const fetched = await getWrestler(added._id!);
    expect(fetched?.name).toBe('Test');
  });

  it('should update a wrestler', async () => {
    const wrestler = createTestWrestler({ name: 'Test' });
    const added = await addWrestler(wrestler);
    const updated = await updateWrestler(added._id!, { name: 'Updated' });
    expect(updated.name).toBe('Updated');
  });

  it('should delete a wrestler', async () => {
    const wrestler = createTestWrestler({ name: 'Test' });
    const added = await addWrestler(wrestler);
    await deleteWrestler(added._id!);
    const fetched = await getWrestler(added._id!);
    expect(fetched).toBeNull();
  });

  it('should list wrestlers', async () => {
    const wrestler = createTestWrestler({ name: 'Test' });
    await addWrestler(wrestler);
    const wrestlers = await listWrestlers();
    expect(wrestlers.length).toBeGreaterThan(0);
  });
}); 