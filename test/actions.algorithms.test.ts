import { describe, it, expect } from 'vitest';
import {
  calculateSegmentRating,
  simulateMatch,
  calculateAttendance,
  calculateRevenue,
  calculateViewership,
  Appearance,
  Wrestler
} from '../src/actions/fed-simulator-algorithms';

import {
  generateAppearances,
  randomizeSegmentDuration,
  generateSegmentName
} from '../src/actions/randomization-algorithms';

describe('Fed Simulator Algorithms', () => {
  describe('calculateSegmentRating', () => {
    it('should calculate rating for high-point wrestlers', () => {
      const appearances: Appearance[] = [
        { 
          wrestlerId: 1, 
          groupId: 1, 
          manager: false, 
          cost: 100, 
          winner: false, 
          loser: false,
          wrestler: { id: 1, name: 'Test1', points: 95, popularity: 80, morale: 70, stamina: 80, charisma: 75, damage: 0, alignment: 'FACE', wins: 10, losses: 2, streak: 3, role: 'MAIN_EVENTER' }
        },
        { 
          wrestlerId: 2, 
          groupId: 2, 
          manager: false, 
          cost: 90, 
          winner: false, 
          loser: false,
          wrestler: { id: 2, name: 'Test2', points: 90, popularity: 75, morale: 65, stamina: 75, charisma: 70, damage: 0, alignment: 'HEEL', wins: 8, losses: 3, streak: 2, role: 'UPPER_MIDCARD' }
        }
      ];
      
      const result = calculateSegmentRating(appearances);
      expect(result.score).toBeGreaterThan(0);
      expect(typeof result.score).toBe('number');
      expect(Array.isArray(result.history)).toBe(true);
    });

    it('should calculate rating for low-point wrestlers', () => {
      const appearances: Appearance[] = [
        { 
          wrestlerId: 1, 
          groupId: 1, 
          manager: false, 
          cost: 50, 
          winner: false, 
          loser: false,
          wrestler: { id: 1, name: 'Test1', points: 40, popularity: 20, morale: 30, stamina: 40, charisma: 25, damage: 0, alignment: 'NEUTRAL', wins: 2, losses: 5, streak: -2, role: 'JOBBER' }
        },
        { 
          wrestlerId: 2, 
          groupId: 2, 
          manager: false, 
          cost: 45, 
          winner: false, 
          loser: false,
          wrestler: { id: 2, name: 'Test2', points: 35, popularity: 15, morale: 25, stamina: 35, charisma: 20, damage: 0, alignment: 'NEUTRAL', wins: 1, losses: 6, streak: -3, role: 'JOBBER' }
        }
      ];
      
      const result = calculateSegmentRating(appearances);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(typeof result.score).toBe('number');
    });

    it('should handle single wrestler', () => {
      const appearances: Appearance[] = [
        { 
          wrestlerId: 1, 
          groupId: 1, 
          manager: false, 
          cost: 75, 
          winner: false, 
          loser: false,
          wrestler: { id: 1, name: 'Test1', points: 75, popularity: 50, morale: 60, stamina: 70, charisma: 55, damage: 0, alignment: 'FACE', wins: 5, losses: 3, streak: 1, role: 'MIDCARD' }
        }
      ];
      
      const result = calculateSegmentRating(appearances);
      expect(result.score).toBe(0); // Single wrestler returns 0
      expect(typeof result.score).toBe('number');
    });

    it('should handle empty wrestler array', () => {
      const appearances: Appearance[] = [];
      
      const result = calculateSegmentRating(appearances);
      expect(result.score).toBe(0);
    });
  });

  describe('simulateMatch', () => {
    it('should simulate match and return results', () => {
      const appearances: Appearance[] = [
        { 
          wrestlerId: 1, 
          groupId: 1, 
          manager: false, 
          cost: 100, 
          winner: false, 
          loser: false,
          wrestler: { id: 1, name: 'Test1', points: 95, popularity: 80, morale: 70, stamina: 80, charisma: 75, damage: 0, alignment: 'FACE', wins: 10, losses: 2, streak: 3, role: 'MAIN_EVENTER' }
        },
        { 
          wrestlerId: 2, 
          groupId: 2, 
          manager: false, 
          cost: 90, 
          winner: false, 
          loser: false,
          wrestler: { id: 2, name: 'Test2', points: 80, popularity: 75, morale: 65, stamina: 75, charisma: 70, damage: 0, alignment: 'HEEL', wins: 8, losses: 5, streak: 1, role: 'UPPER_MIDCARD' }
        }
      ];
      
      const result = simulateMatch(appearances);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result.some(a => a.winner)).toBe(true);
      expect(result.some(a => a.loser)).toBe(true);
    });

    it('should handle single wrestler match', () => {
      const appearances: Appearance[] = [
        { 
          wrestlerId: 1, 
          groupId: 1, 
          manager: false, 
          cost: 100, 
          winner: false, 
          loser: false,
          wrestler: { id: 1, name: 'Test1', points: 95, popularity: 80, morale: 70, stamina: 80, charisma: 75, damage: 0, alignment: 'FACE', wins: 10, losses: 2, streak: 3, role: 'MAIN_EVENTER' }
        }
      ];
      
      const result = simulateMatch(appearances);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      // Single wrestler in same group - no winner/loser changes
      expect(result[0].winner).toBe(false);
      expect(result[0].loser).toBe(false);
    });

    it('should handle wrestlers with equal points', () => {
      const appearances: Appearance[] = [
        { 
          wrestlerId: 1, 
          groupId: 1, 
          manager: false, 
          cost: 75, 
          winner: false, 
          loser: false,
          wrestler: { id: 1, name: 'Test1', points: 75, popularity: 60, morale: 50, stamina: 60, charisma: 55, damage: 0, alignment: 'FACE', wins: 5, losses: 5, streak: 0, role: 'MIDCARD' }
        },
        { 
          wrestlerId: 2, 
          groupId: 2, 
          manager: false, 
          cost: 75, 
          winner: false, 
          loser: false,
          wrestler: { id: 2, name: 'Test2', points: 75, popularity: 60, morale: 50, stamina: 60, charisma: 55, damage: 0, alignment: 'HEEL', wins: 5, losses: 5, streak: 0, role: 'MIDCARD' }
        }
      ];
      
      const result = simulateMatch(appearances);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.some(a => a.winner)).toBe(true);
      expect(result.some(a => a.loser)).toBe(true);
    });
  });

  describe('calculateAttendance', () => {
    it('should calculate attendance based on wrestler popularity', () => {
      const wrestlers: Wrestler[] = [
        { id: 1, name: 'Test1', points: 85, popularity: 90, morale: 70, stamina: 80, charisma: 75, damage: 0, alignment: 'FACE', wins: 10, losses: 2, streak: 3, role: 'MAIN_EVENTER' },
        { id: 2, name: 'Test2', points: 80, popularity: 85, morale: 65, stamina: 75, charisma: 70, damage: 0, alignment: 'HEEL', wins: 8, losses: 3, streak: 2, role: 'UPPER_MIDCARD' },
        { id: 3, name: 'Test3', points: 75, popularity: 80, morale: 60, stamina: 70, charisma: 65, damage: 0, alignment: 'FACE', wins: 6, losses: 4, streak: 1, role: 'MIDCARD' }
      ];
      
      const attendance = calculateAttendance(wrestlers);
      expect(attendance).toBeGreaterThan(5000); // Should be more than base
      expect(typeof attendance).toBe('number');
    });

    it('should handle custom base attendance', () => {
      const wrestlers: Wrestler[] = [
        { id: 1, name: 'Test1', points: 85, popularity: 90, morale: 70, stamina: 80, charisma: 75, damage: 0, alignment: 'FACE', wins: 10, losses: 2, streak: 3, role: 'MAIN_EVENTER' }
      ];
      
      const attendance = calculateAttendance(wrestlers, 10000);
      expect(attendance).toBeGreaterThan(10000); // Should be more than custom base
      expect(typeof attendance).toBe('number');
    });

    it('should handle low popularity wrestlers', () => {
      const wrestlers: Wrestler[] = [
        { id: 1, name: 'Test1', points: 30, popularity: 10, morale: 30, stamina: 40, charisma: 25, damage: 0, alignment: 'NEUTRAL', wins: 2, losses: 8, streak: -3, role: 'JOBBER' },
        { id: 2, name: 'Test2', points: 25, popularity: 5, morale: 25, stamina: 35, charisma: 20, damage: 0, alignment: 'NEUTRAL', wins: 1, losses: 9, streak: -4, role: 'JOBBER' }
      ];
      
      const attendance = calculateAttendance(wrestlers);
      expect(attendance).toBeGreaterThanOrEqual(0);
      expect(typeof attendance).toBe('number');
    });
  });

  describe('calculateRevenue', () => {
    it('should calculate revenue from attendance and merchandise', () => {
      const attendance = 15000;
      
      const revenue = calculateRevenue(attendance);
      expect(revenue).toBeDefined();
      expect(revenue.attendanceIncome).toBeGreaterThan(0);
      expect(revenue.merchIncome).toBeGreaterThan(0);
      expect(revenue.totalRevenue).toBe(revenue.attendanceIncome + revenue.merchIncome);
    });

    it('should handle zero attendance', () => {
      const attendance = 0;
      
      const revenue = calculateRevenue(attendance);
      expect(revenue.attendanceIncome).toBe(0);
      expect(revenue.merchIncome).toBe(0);
      expect(revenue.totalRevenue).toBe(0);
    });

    it('should scale with ticket price', () => {
      const attendance = 10000;
      
      const lowPriceRevenue = calculateRevenue(attendance, 30);
      const highPriceRevenue = calculateRevenue(attendance, 100);
      
      expect(highPriceRevenue.totalRevenue).toBeGreaterThan(lowPriceRevenue.totalRevenue);
    });
  });

  describe('calculateViewership', () => {
    it('should calculate TV viewership', () => {
      const attendance = 12000;
      
      const viewership = calculateViewership(attendance);
      expect(viewership).toBeGreaterThan(0);
      expect(typeof viewership).toBe('number');
    });

    it('should scale with attendance and multiplier', () => {
      const lowViews = calculateViewership(5000, 2.0);
      const highViews = calculateViewership(20000, 4.5);
      
      expect(highViews).toBeGreaterThan(lowViews);
    });

    it('should handle zero attendance', () => {
      const viewership = calculateViewership(0);
      expect(viewership).toBe(0);
    });
  });
});

describe('Randomization Algorithms', () => {
  describe('generateAppearances', () => {
    it('should generate appearances for wrestlers', () => {
      const wrestlers = [
        { id: 1, name: 'Test1', points: 95, active: true, gender: 'MALE', cost: 100 },
        { id: 2, name: 'Test2', points: 80, active: true, gender: 'MALE', cost: 90 },
        { id: 3, name: 'Test3', points: 70, active: true, gender: 'FEMALE', cost: 80 }
      ];
      
      const appearances = generateAppearances({ wrestlers, minPoints: 60 });
      expect(appearances.length).toBeGreaterThan(0);
      expect(appearances.every(app => app.wrestlerId)).toBe(true);
    });

    it('should respect minimum points requirement', () => {
      const wrestlers = [
        { id: 1, name: 'Test1', points: 95, active: true, gender: 'MALE', cost: 100 },
        { id: 2, name: 'Test2', points: 60, active: true, gender: 'MALE', cost: 90 },
        { id: 3, name: 'Test3', points: 40, active: true, gender: 'FEMALE', cost: 80 }
      ];
      
      const appearances = generateAppearances({ wrestlers, minPoints: 80 });
      // Should only include wrestler with points >= 80
      expect(appearances.length).toBeLessThanOrEqual(1);
    });

    it('should handle inactive wrestlers', () => {
      const wrestlers = [
        { id: 1, name: 'Test1', points: 95, active: false, gender: 'MALE', cost: 100 },
        { id: 2, name: 'Test2', points: 80, active: true, gender: 'MALE', cost: 90 }
      ];
      
      const appearances = generateAppearances({ wrestlers, minPoints: 70 });
      // Should only include active wrestler
      expect(appearances.length).toBeLessThanOrEqual(1);
    });

    it('should handle excluded wrestlers', () => {
      const wrestlers = [
        { id: 1, name: 'Test1', points: 95, active: true, gender: 'MALE', cost: 100 },
        { id: 2, name: 'Test2', points: 80, active: true, gender: 'MALE', cost: 90 }
      ];
      
      const appearances = generateAppearances({ wrestlers, exclude: [1], minPoints: 70 });
      // Should only include non-excluded wrestler
      expect(appearances.length).toBeLessThanOrEqual(1);
      if (appearances.length > 0) {
        expect(appearances[0].wrestlerId).toBe(2);
      }
    });
  });

  describe('randomizeSegmentDuration', () => {
    it('should generate duration within valid range', () => {
      for (let i = 0; i < 10; i++) {
        const duration = randomizeSegmentDuration();
        expect(duration).toBeGreaterThanOrEqual(5);
        expect(duration).toBeLessThanOrEqual(30);
        expect(Number.isInteger(duration)).toBe(true);
      }
    });

    it('should generate different durations', () => {
      const durations = new Set();
      for (let i = 0; i < 20; i++) {
        durations.add(randomizeSegmentDuration());
      }
      // Should have some variety (not all the same)
      expect(durations.size).toBeGreaterThan(1);
    });
  });

  describe('generateSegmentName', () => {
    it('should generate segment names for single wrestler', () => {
      const wrestlers = [
        { name: 'John Cena' }
      ];
      
      const name = generateSegmentName(wrestlers);
      expect(name).toContain('John Cena');
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('should generate segment names for two wrestlers', () => {
      const wrestlers = [
        { name: 'John Cena' },
        { name: 'The Rock' }
      ];
      
      const name = generateSegmentName(wrestlers);
      expect(name).toContain('vs');
      expect(name).toContain('John Cena');
      expect(name).toContain('The Rock');
    });

    it('should generate segment names for multiple wrestlers', () => {
      const wrestlers = [
        { name: 'John Cena' },
        { name: 'The Rock' },
        { name: 'Triple H' }
      ];
      
      const name = generateSegmentName(wrestlers);
      expect(name).toContain('Triple Threat');
      expect(name).toContain('John Cena');
      expect(name).toContain('The Rock');
      expect(name).toContain('Triple H');
    });

    it('should handle four wrestlers', () => {
      const wrestlers = [
        { name: 'John Cena' },
        { name: 'The Rock' },
        { name: 'Triple H' },
        { name: 'Stone Cold' }
      ];
      
      const name = generateSegmentName(wrestlers);
      expect(name).toContain('Fatal Four-Way');
      wrestlers.forEach(wrestler => {
        expect(name).toContain(wrestler.name);
      });
    });

    it('should handle many wrestlers', () => {
      const wrestlers = [
        { name: 'Wrestler 1' },
        { name: 'Wrestler 2' },
        { name: 'Wrestler 3' },
        { name: 'Wrestler 4' },
        { name: 'Wrestler 5' },
        { name: 'Wrestler 6' }
      ];
      
      const name = generateSegmentName(wrestlers);
      expect(name).toContain('6-Way Match');
      expect(name).toContain('Wrestler 1');
      expect(name).toContain('Wrestler 2');
    });

    it('should handle empty wrestler array', () => {
      const wrestlers: any[] = [];
      
      const name = generateSegmentName(wrestlers);
      expect(name).toBe('Untitled Segment');
    });
  });
});