// Fed Simulator's randomization algorithms ported from the main codebase

export interface RandomizationConfig {
  maxTeams: number;
  minPoints: number;
  itemCountConfig: {
    options: number[];
    weights: number[];
  };
  groupConfig: {
    options: boolean[];
    weights: number[];
    perGroup: number;
  };
  propertyConfig: {
    options: string[];
    weights: number[];
  };
}

const defaultConfig: RandomizationConfig = {
  maxTeams: 4,
  minPoints: 40,
  itemCountConfig: {
    options: [2, 3, 4],
    weights: [0.7, 0.2, 0.1],
  },
  groupConfig: {
    options: [true, false],
    weights: [0.3, 0.7],
    perGroup: 2,
  },
  propertyConfig: {
    options: ['MALE', 'FEMALE'],
    weights: [0.75, 0.25],
  },
};

/**
 * Generate random ID (simplified version)
 */
function getId(): number {
  return Math.floor(Math.random() * 1000000);
}

/**
 * Select random item from array with optional weights
 */
function selectRandomItem<T>(items: T[], weights?: number[]): T {
  if (!weights || weights.length !== items.length) {
    return items[Math.floor(Math.random() * items.length)];
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let threshold = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) {
      return items[i];
    }
  }

  return items[0]; // Fallback
}

/**
 * Pick option based on weights
 */
function pickOption({ options = [], weights = [] }: { options: any[]; weights: number[] }): any {
  return selectRandomItem(options, weights);
}

/**
 * Filter wrestlers by property
 */
const filterBy = (prop: string) => (value: any) => (items: any[]) => 
  items.filter(item => item[prop] === value);

/**
 * Exclude wrestlers by property values
 */
const excludeBy = (prop: string) => (values: any[]) => (items: any[]) => 
  items.filter(item => !values.includes(item[prop]));

/**
 * Create team function
 */
const createTeam = (usedIds: number[]) => {
  let groupId = getId();

  return (selectedItem: any, remainingItems: any[]) => {
    groupId = getId();

    if (usedIds.includes(selectedItem.id)) {
      const availableItems = remainingItems.filter(item => !usedIds.includes(item.id));

      if (availableItems.length > 0) {
        selectedItem = selectRandomItem(availableItems);
        remainingItems = remainingItems.filter(item => item.id !== selectedItem.id);
      }
    }

    usedIds.push(selectedItem.id);

    return { ...selectedItem, groupId };
  };
};

/**
 * Fed Simulator's appearance generation algorithm
 * From: src/helpers/randomise.jsx
 */
export function generateAppearances({
  wrestlers = [],
  config = defaultConfig,
  exclude = [],
  minPoints = 40,
}: {
  wrestlers: any[];
  config?: RandomizationConfig;
  exclude?: number[];
  minPoints?: number;
}): any[] {
  const { itemCountConfig, propertyConfig, maxTeams } = config;

  // Filter available wrestlers
  let availableWrestlers = wrestlers
    .filter(wrestler => 
      wrestler.active && 
      wrestler.points >= minPoints && 
      !exclude.includes(wrestler.id)
    );

  if (availableWrestlers.length < 2) {
    return []; // Not enough wrestlers
  }

  // Pick number of participants
  const participantCount = pickOption(itemCountConfig);
  const actualCount = Math.min(participantCount, availableWrestlers.length);

  // Pick gender preference
  const preferredGender = pickOption(propertyConfig);
  const genderFilteredWrestlers = filterBy('gender')(preferredGender)(availableWrestlers);
  
  // Use gender-filtered if enough wrestlers, otherwise use all
  if (genderFilteredWrestlers.length >= actualCount) {
    availableWrestlers = genderFilteredWrestlers;
  }

  // Determine if this should be a faction/team match
  const shouldUseGroups = pickOption(config.groupConfig);
  const usedIds: number[] = [];
  const appearances: any[] = [];

  if (shouldUseGroups && availableWrestlers.length >= 4) {
    // Team/faction match
    const teamCount = Math.min(2, Math.floor(actualCount / 2));
    const wrestlersPerTeam = Math.floor(actualCount / teamCount);
    
    for (let teamIndex = 0; teamIndex < teamCount; teamIndex++) {
      const groupId = getId();
      
      for (let memberIndex = 0; memberIndex < wrestlersPerTeam; memberIndex++) {
        const availableForTeam = availableWrestlers.filter(w => !usedIds.includes(w.id));
        if (availableForTeam.length === 0) break;
        
        const selectedWrestler = selectRandomItem(availableForTeam);
        usedIds.push(selectedWrestler.id);
        
        appearances.push({
          wrestlerId: selectedWrestler.id,
          groupId,
          manager: false,
          cost: selectedWrestler.cost || 0,
          winner: false,
          loser: false,
          wrestler: selectedWrestler,
        });
      }
    }
  } else {
    // Individual match
    const groupId = getId();
    
    for (let i = 0; i < actualCount; i++) {
      const availableForMatch = availableWrestlers.filter(w => !usedIds.includes(w.id));
      if (availableForMatch.length === 0) break;
      
      const selectedWrestler = selectRandomItem(availableForMatch);
      usedIds.push(selectedWrestler.id);
      
      appearances.push({
        wrestlerId: selectedWrestler.id,
        groupId: i + 1, // Each wrestler in their own group
        manager: false,
        cost: selectedWrestler.cost || 0,
        winner: false,
        loser: false,
        wrestler: selectedWrestler,
      });
    }
  }

  return appearances;
}

/**
 * Randomize segment duration
 */
export function randomizeSegmentDuration(segmentType = 'DEFAULT'): number {
  const durationRanges: Record<string, [number, number]> = {
    DEFAULT: [10, 20],
    MAIN_EVENT: [20, 30],
    OPENING: [15, 25],
    MID_CARD: [12, 18],
    SQUASH: [5, 10],
    PROMO: [3, 8],
    BACKSTAGE: [2, 5],
  };

  const [min, max] = durationRanges[segmentType] || durationRanges.DEFAULT;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random segment name
 */
export function generateSegmentName(wrestlers: any[]): string {
  if (wrestlers.length === 0) return 'Untitled Segment';
  
  if (wrestlers.length === 2) {
    return `${wrestlers[0].name} vs ${wrestlers[1].name}`;
  }
  
  if (wrestlers.length === 3) {
    return `Triple Threat: ${wrestlers.map(w => w.name).join(' vs ')}`;
  }
  
  if (wrestlers.length === 4) {
    return `Fatal Four-Way: ${wrestlers.map(w => w.name).join(' vs ')}`;
  }
  
  return `${wrestlers.length}-Way Match: ${wrestlers.slice(0, 2).map(w => w.name).join(' vs ')} and ${wrestlers.length - 2} others`;
}

/**
 * Randomize all segments in a production
 */
export function randomizeProductionSegments(segments: any[], wrestlers: any[]): any[] {
  return segments.map(segment => {
    const appearances = generateAppearances({
      wrestlers,
      exclude: [], // Could add logic to prevent wrestler overuse
      minPoints: 30, // Lower threshold for variety
    });

    const duration = randomizeSegmentDuration(segment.type);
    const segmentWrestlers = appearances.map(a => a.wrestler);
    const name = generateSegmentName(segmentWrestlers);

    return {
      ...segment,
      name,
      duration,
      appearances,
      complete: false,
      rating: 0,
    };
  });
}