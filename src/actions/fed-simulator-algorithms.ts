// Fed Simulator's actual simulation algorithms ported from the main codebase

export interface Appearance {
  id?: number;
  wrestlerId: number;
  groupId: number;
  manager: boolean;
  cost: number;
  winner: boolean;
  loser: boolean;
  wrestler?: Wrestler;
}

export interface Wrestler {
  id?: number;
  name: string;
  points: number;
  morale: number;
  stamina: number;
  popularity: number;
  charisma: number;
  damage: number;
  alignment: string;
  wins: number;
  losses: number;
  streak: number;
  role: string;
}

/**
 * Fed Simulator's weighted winner selection algorithm
 * From: src/helpers/simulate.js
 */
export function selectWinner(appearances: Appearance[]): number | null {
  const items = appearances.filter(a => a.wrestler && !a.manager);
  
  if (items.length === 0) return null;

  const totalWeight = items.reduce((sum, item) => {
    const wrestler = item.wrestler!;
    const points = wrestler.points || 1;
    const morale = wrestler.morale || 0;
    const stamina = wrestler.stamina || 0;
    const popularity = wrestler.popularity || 0;
    const charisma = wrestler.charisma || 0;
    const weight = points + 0.5 * morale + 0.3 * stamina + 0.2 * (popularity + charisma);
    return sum + weight;
  }, 0);

  let threshold = Math.random() * totalWeight;
  for (const item of items) {
    const wrestler = item.wrestler!;
    const points = wrestler.points || 1;
    const morale = wrestler.morale || 0;
    const stamina = wrestler.stamina || 0;
    const popularity = wrestler.popularity || 0;
    const charisma = wrestler.charisma || 0;
    const weight = points + 0.5 * morale + 0.3 * stamina + 0.2 * (popularity + charisma);
    threshold -= weight;
    if (threshold <= 0) {
      return item.wrestlerId;
    }
  }
  return items[0].wrestlerId; // Fallback
}

/**
 * Simulate match results based on Fed Simulator logic
 * From: src/helpers/simulate.js
 */
export function simulateMatch(appearances: Appearance[]): Appearance[] {
  const groupIds = [...new Set(appearances.map(a => a.groupId))];

  if (groupIds.length > 1) {
    const winnerId = selectWinner(appearances);
    const winningGroupId = appearances.find(item => item.wrestlerId === winnerId)?.groupId;

    return appearances.map(item => ({
      ...item,
      winner: item.groupId === winningGroupId,
      loser: item.groupId !== winningGroupId,
    }));
  }

  return appearances;
}

/**
 * Fed Simulator's comprehensive segment rating calculation
 * From: src/stateMachines/calculateSegmentRating.js
 */
export function calculateSegmentRating(appearances: Appearance[]): { score: number; history: any[] } {
  if (appearances.length < 2) return { score: 0, history: [] };

  let score = 0;
  const history: any[] = [];

  // Points calculation
  const avgPoints = appearances.reduce((sum, a) => sum + (a.wrestler?.points || 0), 0) / appearances.length;
  const hasHighPoints = appearances.some(a => (a.wrestler?.points || 0) >= 50);
  const hasZeroPoints = appearances.some(a => (a.wrestler?.points || 0) === 0);
  const hasLowPoints = appearances.some(a => (a.wrestler?.points || 0) <= 20);
  const stars = appearances.filter(a => (a.wrestler?.points || 0) >= 90);

  if (hasHighPoints) score += 50;
  if (avgPoints > 50) score += 50;
  if (hasZeroPoints) score -= 50;
  if (hasLowPoints) score -= 20;
  score += stars.length ? 100 * stars.length : 0;

  // Morale calculation
  const hasHighMorale = appearances.some(a => (a.wrestler?.morale || 0) >= 50);
  const hasZeroMorale = appearances.some(a => (a.wrestler?.morale || 0) === 0);
  const hasLowMorale = appearances.some(a => (a.wrestler?.morale || 0) <= 20);
  const allHighMorale = appearances.every(a => (a.wrestler?.morale || 0) >= 60);
  const avgMorale = appearances.reduce((sum, a) => sum + (a.wrestler?.morale || 0), 0) / appearances.length;

  if (hasHighMorale) score += 50;
  if (allHighMorale) score += 20;
  if (hasZeroMorale) score -= 5;
  if (hasLowMorale) score -= 30;
  if (avgMorale > 50) score += 50;

  // Popularity calculation
  const hasLowPopularity = appearances.some(a => (a.wrestler?.popularity || 0) <= 5);
  const hasMiddlingPopularity = appearances.some(a => (a.wrestler?.popularity || 0) <= 30);
  const allHighPopularity = appearances.every(a => (a.wrestler?.popularity || 0) >= 80);
  const superHighPopularity = appearances.some(a => (a.wrestler?.popularity || 0) >= 90);
  const avgPopularity = appearances.reduce((sum, a) => sum + (a.wrestler?.popularity || 0), 0) / appearances.length;

  if (hasLowPopularity) score -= 50;
  if (hasMiddlingPopularity) score -= 50;
  if (allHighPopularity) score += 40;
  if (avgPopularity > 50) score += 50;
  if (avgPopularity > 80) score += 20;
  if (avgPopularity > 90) score += 10;
  if (avgPopularity > 95) score += 100;
  if (superHighPopularity) score += 70;

  // Alignment calculation
  const hasHeel = appearances.some(a => a.wrestler?.alignment === 'HEEL');
  const hasFace = appearances.some(a => a.wrestler?.alignment === 'FACE');
  const hasNeutral = appearances.some(a => a.wrestler?.alignment === 'NEUTRAL');
  const allHasSameAlignment = appearances.every(a => a.wrestler?.alignment === appearances[0].wrestler?.alignment);

  if ((hasHeel && hasFace) || (hasHeel && hasNeutral) || (hasFace && hasNeutral)) {
    score += 50;
  }
  if (allHasSameAlignment) score -= 200;
  if (hasHeel || hasFace) score += 50;

  // Charisma calculation
  const hasHighCharisma = appearances.some(a => (a.wrestler?.charisma || 0) >= 70);
  const hasZeroCharisma = appearances.some(a => (a.wrestler?.charisma || 0) === 0);
  const hasLowCharisma = appearances.some(a => (a.wrestler?.charisma || 0) <= 20);
  const avgCharisma = appearances.reduce((sum, a) => sum + (a.wrestler?.charisma || 0), 0) / appearances.length;

  if (hasHighCharisma) score += 50;
  if (avgCharisma > 50) score += 50;
  if (hasZeroCharisma) score -= 50;
  if (hasLowCharisma) score -= 50;

  // Final score calculation
  const finalScore = Math.max(0, score / 100);

  history.push({
    avgPoints, hasHighPoints, hasZeroPoints, hasLowPoints, stars: stars.length,
    avgMorale, hasHighMorale, hasZeroMorale, hasLowMorale, allHighMorale,
    avgPopularity, hasLowPopularity, hasMiddlingPopularity, allHighPopularity, superHighPopularity,
    hasHeel, hasFace, hasNeutral, allHasSameAlignment,
    avgCharisma, hasHighCharisma, hasZeroCharisma, hasLowCharisma,
    finalScore
  });

  return { score: finalScore, history };
}

/**
 * Calculate production attendance based on wrestler stats
 * Simplified version of Fed Simulator's production calculations
 */
export function calculateAttendance(wrestlers: Wrestler[], baseAttendance = 5000): number {
  if (wrestlers.length === 0) return baseAttendance;

  const avgPoints = wrestlers.reduce((sum, w) => sum + w.points, 0) / wrestlers.length;
  const avgPopularity = wrestlers.reduce((sum, w) => sum + w.popularity, 0) / wrestlers.length;
  const stars = wrestlers.filter(w => w.points >= 90).length;
  
  // Base attendance modified by star power and popularity
  const starMultiplier = 1 + (stars * 0.3);
  const popularityMultiplier = 1 + (avgPopularity / 100);
  const pointsMultiplier = 1 + ((avgPoints - 50) / 100);
  
  return Math.floor(baseAttendance * starMultiplier * popularityMultiplier * pointsMultiplier);
}

/**
 * Calculate production revenue
 */
export function calculateRevenue(attendance: number, ticketPrice = 50, merchMultiplier = 15): {
  attendanceIncome: number;
  merchIncome: number;
  totalRevenue: number;
} {
  const attendanceIncome = attendance * ticketPrice;
  const merchIncome = Math.floor(attendance * merchMultiplier);
  
  return {
    attendanceIncome,
    merchIncome,
    totalRevenue: attendanceIncome + merchIncome,
  };
}

/**
 * Calculate viewership based on attendance
 */
export function calculateViewership(attendance: number, tvMultiplier = 3.5): number {
  return Math.floor(attendance * tvMultiplier);
}