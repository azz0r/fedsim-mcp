import { describe, it, expect, beforeEach } from 'vitest';
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import PouchDBMemory from 'pouchdb-adapter-memory';

PouchDB.plugin(PouchDBFind);
PouchDB.plugin(PouchDBMemory);

import { FedSimDatabase } from '../src/database/db';

describe('FedSimDatabase', () => {
  let db: FedSimDatabase;
  let companyId: number;

  beforeEach(async () => {
    // Create fresh database instance for each test
    db = new FedSimDatabase();
    
    // Add a test company for tests that need it
    companyId = await db.Company.add({
      name: 'Test Company',
      desc: 'A test company',
      image: null
    });
  });

  describe('Database Initialization', () => {
    it('should initialize database successfully', async () => {
      expect(db).toBeDefined();
      expect(db.Wrestler).toBeDefined();
      expect(db.Brand).toBeDefined();
      expect(db.Company).toBeDefined();
      expect(db.Production).toBeDefined();
    });
  });

  describe('Company Operations', () => {
    it('should add a company', async () => {
      const newCompanyId = await db.Company.add({
        name: 'Test Wrestling Federation',
        desc: 'A test federation',
        image: null
      });

      expect(newCompanyId).toBeDefined();
      expect(typeof newCompanyId).toBe('number');
    });

    it('should get a company by id', async () => {
      const retrievedCompany = await db.Company.get(companyId);
      expect(retrievedCompany).toBeDefined();
      expect(retrievedCompany!.name).toBe('Test Company');
    });

    it('should update a company', async () => {
      await db.Company.update(companyId, { name: 'Updated Company' });
      const updatedCompany = await db.Company.get(companyId);
      expect(updatedCompany!.name).toBe('Updated Company');
    });

    it('should delete a company', async () => {
      await db.Company.delete(companyId);
      const deletedCompany = await db.Company.get(companyId);
      expect(deletedCompany).toBeUndefined();
    });

    it('should list all companies', async () => {
      const companies = await db.Company.toArray();
      expect(companies.length).toBeGreaterThan(0);
      expect(companies.some(c => c.name === 'Test Company')).toBe(true);
    });
  });

  describe('Brand Operations', () => {
    it('should add a brand', async () => {
      const brandId = await db.Brand.add({
        name: 'Test Brand',
        desc: 'A test brand',
        image: null,
        images: [],
        color: '#FF0000',
        backgroundColor: '#FFFFFF',
        directorId: null,
        balance: 1000000,
        companyId: companyId
      });

      expect(brandId).toBeDefined();
      expect(typeof brandId).toBe('number');
    });

    it('should get brands by company', async () => {
      await db.Brand.add({
        name: 'Test Brand',
        desc: 'A test brand',
        image: null,
        images: [],
        color: '#FF0000',
        backgroundColor: '#FFFFFF',
        directorId: null,
        balance: 1000000,
        companyId: companyId
      });

      const brands = await db.Brand.where('companyId').equals(companyId);
      expect(brands.length).toBeGreaterThan(0);
      expect(brands[0].name).toBe('Test Brand');
    });
  });

  describe('Wrestler Operations', () => {
    it('should add a wrestler', async () => {
      const wrestlerId = await db.Wrestler.add({
        name: 'Test Wrestler',
        desc: 'A test wrestler',
        image: null,
        images: [],
        color: '#FF0000',
        backgroundColor: '#FFFFFF',
        brandIds: [],
        entranceVideoUrl: '',
        pushed: false,
        remainingAppearances: 52,
        contractType: 'FULL',
        contractExpires: new Date(),
        status: 'SIGNED',
        billedFrom: 'Test City',
        region: 'North America',
        country: 'USA',
        dob: new Date('1990-01-01'),
        height: 180,
        weight: 200,
        alignment: 'FACE',
        gender: 'MALE',
        role: 'MIDCARD',
        followers: 1000,
        losses: 0,
        wins: 0,
        streak: 0,
        draws: 0,
        points: 75,
        morale: 70,
        stamina: 80,
        popularity: 50,
        charisma: 60,
        damage: 0,
        active: true,
        retired: false,
        cost: 1000,
        special: '',
        finisher: 'Test Finisher',
        musicUrl: ''
      });

      expect(wrestlerId).toBeDefined();
      expect(typeof wrestlerId).toBe('number');
    });

    it('should filter wrestlers by alignment', async () => {
      // Add a wrestler with unique alignment for testing
      await db.Wrestler.add({
        name: 'Heel Test Wrestler',
        desc: '',
        image: null,
        images: [],
        color: '#fff',
        backgroundColor: '#999',
        brandIds: [],
        entranceVideoUrl: '',
        pushed: false,
        remainingAppearances: 52,
        contractType: 'FULL',
        contractExpires: new Date(),
        status: 'SIGNED',
        billedFrom: 'Heel City',
        region: 'North America',
        country: 'USA',
        dob: new Date('1990-01-01'),
        height: 180,
        weight: 200,
        alignment: 'HEEL',
        gender: 'MALE',
        role: 'MIDCARD',
        followers: 1000,
        losses: 0,
        wins: 0,
        streak: 0,
        draws: 0,
        points: 75,
        morale: 70,
        stamina: 80,
        popularity: 50,
        charisma: 60,
        damage: 0,
        active: true,
        retired: false,
        cost: 1000,
        special: '',
        finisher: 'Heel Finisher',
        musicUrl: ''
      });

      const heelWrestlers = await db.Wrestler.where('alignment').equals('HEEL');
      expect(heelWrestlers.length).toBeGreaterThan(0);
      expect(heelWrestlers.some(w => w.name === 'Heel Test Wrestler')).toBe(true);
    });
  });

  describe('Production Operations', () => {
    it('should add a production', async () => {
      const productionId = await db.Production.add({
        name: 'Test Show',
        desc: 'A test show',
        image: null,
        color: '#FF0000',
        backgroundColor: '#FFFFFF',
        brandIds: [],
        venueId: null,
        segmentIds: [],
        showId: null,
        date: new Date(),
        wrestlersCost: 0,
        segmentsCost: 0,
        merchIncome: 0,
        attendanceIncome: 0,
        attendance: 0,
        viewers: 0,
        step: 0,
        complete: false
      });

      expect(productionId).toBeDefined();
      expect(typeof productionId).toBe('number');
    });

    it('should filter productions by completion status', async () => {
      await db.Production.add({
        name: 'Incomplete Show',
        desc: 'An incomplete show',
        image: null,
        color: '#FF0000',
        backgroundColor: '#FFFFFF',
        brandIds: [],
        venueId: null,
        segmentIds: [],
        showId: null,
        date: new Date(),
        wrestlersCost: 0,
        segmentsCost: 0,
        merchIncome: 0,
        attendanceIncome: 0,
        attendance: 0,
        viewers: 0,
        step: 0,
        complete: false
      });

      const incompleteProductions = await db.Production.where('complete').equals(false);
      expect(incompleteProductions.length).toBeGreaterThan(0);
      expect(incompleteProductions[0].name).toBe('Incomplete Show');
    });
  });

  describe('Error Handling', () => {
    it('should handle getting non-existent records', async () => {
      const nonExistentWrestler = await db.Wrestler.get(99999);
      expect(nonExistentWrestler).toBeUndefined();
    });
  });
});