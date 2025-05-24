import { FedSimDatabase, Production } from '../database/db.js';
import { DatabaseActions, createActionWrapper } from '../actions/action-wrapper.js';
import { logger } from '../utils/logger.js';
import { 
  calculateSegmentRating, 
  simulateMatch, 
  calculateAttendance, 
  calculateRevenue, 
  calculateViewership 
} from '../actions/fed-simulator-algorithms.js';
import {
  generateAppearances,
  randomizeSegmentDuration,
  generateSegmentName,
  randomizeProductionSegments
} from '../actions/randomization-algorithms.js';

export function createProductionTools(db: FedSimDatabase) {
  const dbActions = new DatabaseActions(db);

  const createProduction = createActionWrapper('Create Production', async (productionData: Partial<Production>) => {
    const defaultProduction: Partial<Production> = {
      name: 'New Show',
      desc: '',
      image: null,
      color: '#fff',
      backgroundColor: '#999',
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
      complete: false,
    };

    const newProduction = { ...defaultProduction, ...productionData };
    const id = await db.Production.add(newProduction as Production);
    const createdProduction = await db.Production.get(id);
    
    logger.success('Created new production', { 
      id,
      name: createdProduction?.name,
      date: createdProduction?.date,
      brands: createdProduction?.brandIds,
    });
    
    return createdProduction;
  });

  const simulateProduction = createActionWrapper('Simulate Production', async (productionId: number) => {
    const production = await db.Production.get(productionId);
    if (!production) {
      throw new Error(`Production with ID ${productionId} not found`);
    }

    if (production.complete) {
      throw new Error(`Production "${production.name}" is already complete`);
    }

    // Get segments for this production
    const segments = await db.Segment
      .filter(segment => production.segmentIds.includes(segment.id!))
      .toArray();

    // Simulate each segment using Fed Simulator's algorithms
    let totalRating = 0;
    let totalDuration = 0;
    let wrestlersCost = 0;
    const segmentResults: any[] = [];

    for (const segment of segments) {
      if (!segment.complete) {
        // Get appearances for this segment
        const appearances = await db.Appearance
          .filter(appearance => segment.appearanceIds.includes(appearance.id!))
          .toArray();

        // Get wrestler data for each appearance
        const appearancesWithWrestlers = await Promise.all(
          appearances.map(async (appearance) => {
            const wrestler = await db.Wrestler.get(appearance.wrestlerId);
            return { ...appearance, wrestler };
          })
        );

        // Calculate costs
        const segmentCost = appearances.reduce((sum, appearance) => sum + appearance.cost, 0);
        wrestlersCost += segmentCost;

        // Use Fed Simulator's actual rating calculation
        const { score: segmentRating } = calculateSegmentRating(appearancesWithWrestlers);
        
        // Simulate match results if it's a competitive segment
        const simulatedAppearances = simulateMatch(appearancesWithWrestlers);
        
        // Update appearances with match results
        for (const appearance of simulatedAppearances) {
          await db.Appearance.update(appearance.id!, {
            winner: appearance.winner,
            loser: appearance.loser,
          });
          
          // Update wrestler records
          if (appearance.winner || appearance.loser) {
            const wrestler = appearance.wrestler!;
            const newWins = wrestler.wins + (appearance.winner ? 1 : 0);
            const newLosses = wrestler.losses + (appearance.loser ? 1 : 0);
            const newStreak = appearance.winner ? wrestler.streak + 1 : 0;
            
            await db.Wrestler.update(wrestler.id!, {
              wins: newWins,
              losses: newLosses,
              streak: newStreak,
              morale: Math.min(100, wrestler.morale + (appearance.winner ? 5 : -2)),
              popularity: Math.min(100, wrestler.popularity + (appearance.winner ? 2 : -1)),
            });
          }
        }

        totalRating += segmentRating;
        totalDuration += segment.duration || 15; // Default 15 minutes

        // Update segment as complete with real rating
        await db.Segment.update(segment.id!, { 
          complete: true, 
          rating: Math.round(segmentRating)
        });

        segmentResults.push({
          segment: segment.name,
          rating: Math.round(segmentRating),
          duration: segment.duration || 15,
          cost: segmentCost,
          competitors: appearancesWithWrestlers.map(a => a.wrestler?.name || 'Unknown'),
          winner: simulatedAppearances.find(a => a.winner)?.wrestler?.name || 'No winner',
        });

        logger.info('Simulated segment', {
          segment: segment.name,
          rating: Math.round(segmentRating),
          duration: segment.duration || 15,
          cost: segmentCost,
          winner: simulatedAppearances.find(a => a.winner)?.wrestler?.name || 'No winner',
        });
      }
    }

    // Get all wrestlers involved in the production for attendance calculation
    const allWrestlerIds = await db.Appearance
      .filter(appearance => 
        segments.some(segment => segment.appearanceIds.includes(appearance.id!))
      )
      .toArray()
      .then(appearances => [...new Set(appearances.map(a => a.wrestlerId))]);
    
    const wrestlers = await Promise.all(
      allWrestlerIds.map(id => db.Wrestler.get(id))
    ).then(wrestlers => wrestlers.filter(Boolean));

    // Calculate show results using Fed Simulator's algorithms
    const averageRating = segments.length > 0 ? Math.round(totalRating / segments.length) : 0;
    const attendance = calculateAttendance(wrestlers as any[], 5000);
    const { attendanceIncome, merchIncome, totalRevenue } = calculateRevenue(attendance);
    const viewers = calculateViewership(attendance);

    // Update production
    await db.Production.update(productionId, {
      complete: true,
      wrestlersCost,
      segmentsCost: 0,
      attendanceIncome,
      merchIncome,
      attendance,
      viewers,
      step: 100,
    });

    const completedProduction = await db.Production.get(productionId);

    logger.success('Production simulation complete', {
      production: production.name,
      segments: segments.length,
      averageRating,
      attendance,
      totalRevenue,
      totalCosts: wrestlersCost,
      profit: totalRevenue - wrestlersCost,
      segmentResults,
    });

    return {
      production: completedProduction,
      results: {
        segments: segments.length,
        averageRating,
        attendance,
        viewers,
        revenue: totalRevenue,
        costs: wrestlersCost,
        profit: totalRevenue - wrestlersCost,
        segmentResults,
      },
    };
  });

  const getProductionReport = createActionWrapper('Get Production Report', async (productionId: number) => {
    const production = await db.Production.get(productionId);
    if (!production) {
      throw new Error(`Production with ID ${productionId} not found`);
    }

    // Get segments
    const segments = await db.Segment
      .filter(segment => production.segmentIds.includes(segment.id!))
      .toArray();

    // Get brand names
    const brands = await db.Brand
      .filter(brand => production.brandIds.includes(brand.id!))
      .toArray();

    // Get venue
    const venue = production.venueId ? await db.Venue.get(production.venueId) : null;

    const report = {
      production: {
        id: production.id,
        name: production.name,
        date: production.date,
        complete: production.complete,
      },
      venue: venue ? { id: venue.id, name: venue.name } : null,
      brands: brands.map(b => ({ id: b.id, name: b.name })),
      segments: segments.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        duration: s.duration,
        rating: s.rating,
        complete: s.complete,
      })),
      financial: {
        wrestlersCost: production.wrestlersCost,
        attendanceIncome: production.attendanceIncome,
        merchIncome: production.merchIncome,
        totalRevenue: production.attendanceIncome + production.merchIncome,
        profit: (production.attendanceIncome + production.merchIncome) - production.wrestlersCost,
      },
      audience: {
        attendance: production.attendance,
        viewers: production.viewers,
      },
    };

    logger.info('Generated production report', {
      production: production.name,
      segments: segments.length,
      profit: report.financial.profit,
    });

    return report;
  });

  const listRecentProductions = createActionWrapper('List Recent Productions', async (limit = 10) => {
    const productions = await db.Production
      .orderBy('date')
      .reverse()
      .limit(limit)
      .toArray();

    const productionsWithDetails = await Promise.all(
      productions.map(async (production) => {
        const brands = await db.Brand
          .filter(brand => production.brandIds.includes(brand.id!))
          .toArray();

        const venue = production.venueId ? await db.Venue.get(production.venueId) : null;

        return {
          id: production.id,
          name: production.name,
          date: production.date,
          complete: production.complete,
          brands: brands.map(b => b.name),
          venue: venue?.name || 'No venue',
          profit: (production.attendanceIncome + production.merchIncome) - production.wrestlersCost,
          attendance: production.attendance,
        };
      })
    );

    logger.info('Listed recent productions', {
      count: productions.length,
      limit,
    });

    return productionsWithDetails;
  });

  const randomizeProduction = createActionWrapper('Randomize Production', async (productionId: number, options?: {
    minPoints?: number;
    maxSegments?: number;
    createSegments?: boolean;
  }) => {
    const production = await db.Production.get(productionId);
    if (!production) {
      throw new Error(`Production with ID ${productionId} not found`);
    }

    // Get all active wrestlers for randomization
    const wrestlers = await db.Wrestler.filter(w => w.active).toArray();
    if (wrestlers.length < 2) {
      throw new Error('Not enough active wrestlers for randomization (minimum 2 required)');
    }

    let segments = await db.Segment
      .filter(segment => production.segmentIds.includes(segment.id!))
      .toArray();

    // Create segments if none exist and createSegments is true
    if (segments.length === 0 && options?.createSegments) {
      const segmentCount = Math.min(options.maxSegments || 5, Math.floor(wrestlers.length / 2));
      const newSegmentIds: number[] = [];

      for (let i = 0; i < segmentCount; i++) {
        const segmentId = await db.Segment.add({
          name: `Segment ${i + 1}`,
          desc: '',
          championshipIds: [],
          appearanceIds: [],
          date: production.date,
          type: i === segmentCount - 1 ? 'MAIN_EVENT' : 'DEFAULT',
          duration: 0,
          rating: 0,
          complete: false,
        });
        newSegmentIds.push(segmentId);
      }

      // Update production with new segments
      await db.Production.update(productionId, {
        segmentIds: [...production.segmentIds, ...newSegmentIds]
      });

      segments = await db.Segment
        .filter(segment => newSegmentIds.includes(segment.id!))
        .toArray();
    }

    if (segments.length === 0) {
      throw new Error('No segments found. Use createSegments: true to create segments automatically.');
    }

    // Track used wrestlers to prevent overuse
    const usedWrestlerIds: number[] = [];
    const randomizedSegments: any[] = [];

    for (const segment of segments) {
      // Clear existing appearances
      const existingAppearances = await db.Appearance
        .filter(appearance => segment.appearanceIds.includes(appearance.id!))
        .toArray();
      
      for (const appearance of existingAppearances) {
        await db.Appearance.delete(appearance.id!);
      }

      // Generate new appearances
      const availableWrestlers = wrestlers.filter(w => 
        w.points >= (options?.minPoints || 30) && 
        !usedWrestlerIds.includes(w.id!)
      );

      // If running low on fresh wrestlers, allow reuse of some
      const wrestlersPool = availableWrestlers.length >= 2 ? availableWrestlers : wrestlers;

      const appearances = generateAppearances({
        wrestlers: wrestlersPool,
        exclude: usedWrestlerIds.slice(-4), // Only exclude last 4 used
        minPoints: options?.minPoints || 30,
      });

      if (appearances.length === 0) {
        logger.warning('No suitable wrestlers found for segment', { segment: segment.name });
        continue;
      }

      // Create appearances in database
      const newAppearanceIds: number[] = [];
      for (const appearance of appearances) {
        const appearanceId = await db.Appearance.add({
          wrestlerId: appearance.wrestlerId,
          groupId: appearance.groupId,
          manager: appearance.manager,
          cost: appearance.cost,
          winner: false,
          loser: false,
        });
        newAppearanceIds.push(appearanceId);
        usedWrestlerIds.push(appearance.wrestlerId);
      }

      // Update segment
      const duration = randomizeSegmentDuration(segment.type);
      const segmentWrestlers = appearances.map(a => a.wrestler);
      const name = generateSegmentName(segmentWrestlers);

      await db.Segment.update(segment.id!, {
        name,
        duration,
        appearanceIds: newAppearanceIds,
        complete: false,
        rating: 0,
      });

      randomizedSegments.push({
        id: segment.id,
        name,
        duration,
        wrestlers: segmentWrestlers.map(w => w.name),
        type: segment.type,
      });

      logger.info('Randomized segment', {
        segment: name,
        wrestlers: segmentWrestlers.map(w => w.name),
        duration,
      });
    }

    const updatedProduction = await db.Production.get(productionId);

    logger.success('Production randomization complete', {
      production: production.name,
      segmentsRandomized: randomizedSegments.length,
      totalWrestlersUsed: usedWrestlerIds.length,
    });

    return {
      production: updatedProduction,
      randomizedSegments,
      summary: {
        segmentsRandomized: randomizedSegments.length,
        wrestlersUsed: usedWrestlerIds.length,
        minPointsUsed: options?.minPoints || 30,
      },
    };
  });

  const createRandomSegment = createActionWrapper('Create Random Segment', async (productionId: number, options?: {
    segmentType?: string;
    minPoints?: number;
    wrestlerCount?: number;
  }) => {
    const production = await db.Production.get(productionId);
    if (!production) {
      throw new Error(`Production with ID ${productionId} not found`);
    }

    // Get available wrestlers
    const wrestlers = await db.Wrestler.filter(w => w.active).toArray();
    
    // Generate appearances
    const appearances = generateAppearances({
      wrestlers,
      minPoints: options?.minPoints || 40,
    });

    if (appearances.length === 0) {
      throw new Error('No suitable wrestlers found for random segment');
    }

    // Create segment
    const segmentWrestlers = appearances.map(a => a.wrestler);
    const name = generateSegmentName(segmentWrestlers);
    const duration = randomizeSegmentDuration(options?.segmentType || 'DEFAULT');

    const segmentId = await db.Segment.add({
      name,
      desc: `Randomly generated segment featuring ${segmentWrestlers.map(w => w.name).join(', ')}`,
      championshipIds: [],
      appearanceIds: [],
      date: production.date,
      type: options?.segmentType || 'DEFAULT',
      duration,
      rating: 0,
      complete: false,
    });

    // Create appearances
    const appearanceIds: number[] = [];
    for (const appearance of appearances) {
      const appearanceId = await db.Appearance.add({
        wrestlerId: appearance.wrestlerId,
        groupId: appearance.groupId,
        manager: appearance.manager,
        cost: appearance.cost,
        winner: false,
        loser: false,
      });
      appearanceIds.push(appearanceId);
    }

    // Update segment with appearances
    await db.Segment.update(segmentId, { appearanceIds });

    // Add segment to production
    await db.Production.update(productionId, {
      segmentIds: [...production.segmentIds, segmentId]
    });

    const createdSegment = await db.Segment.get(segmentId);

    logger.success('Created random segment', {
      segment: name,
      wrestlers: segmentWrestlers.map(w => w.name),
      duration,
      type: options?.segmentType || 'DEFAULT',
    });

    return {
      segment: createdSegment,
      wrestlers: segmentWrestlers,
      appearances,
    };
  });

  return new Map([
    ['create_production', {
      name: 'create_production',
      description: 'Create a new wrestling production/show',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Production name' },
          desc: { type: 'string', description: 'Production description' },
          date: { type: 'string', format: 'date-time', description: 'Show date' },
          brandIds: { 
            type: 'array', 
            items: { type: 'number' },
            description: 'Brand IDs participating' 
          },
          venueId: { type: 'number', description: 'Venue ID' },
        },
        required: ['name'],
      },
      handler: async (args: any) => {
        if (args.date) {
          args.date = new Date(args.date);
        }
        const result = await createProduction(args);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['simulate_production', {
      name: 'simulate_production',
      description: 'Simulate a production to generate ratings, attendance, and revenue',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Production ID' },
        },
        required: ['id'],
      },
      handler: async (args: any) => {
        const result = await simulateProduction(args.id);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['get_production_report', {
      name: 'get_production_report',
      description: 'Get detailed report for a production including financial and audience data',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Production ID' },
        },
        required: ['id'],
      },
      handler: async (args: any) => {
        const result = await getProductionReport(args.id);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['list_productions', {
      name: 'list_productions',
      description: 'List recent productions with summary information',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of productions to return', default: 10 },
        },
      },
      handler: async (args: any) => {
        const result = await listRecentProductions(args?.limit);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['update_production', {
      name: 'update_production',
      description: 'Update production information',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Production ID' },
          updates: { 
            type: 'object', 
            description: 'Fields to update',
            properties: {
              name: { type: 'string' },
              desc: { type: 'string' },
              date: { type: 'string', format: 'date-time' },
              brandIds: { type: 'array', items: { type: 'number' } },
              venueId: { type: 'number' },
            }
          },
        },
        required: ['id', 'updates'],
      },
      handler: async (args: any) => {
        if (args.updates.date) {
          args.updates.date = new Date(args.updates.date);
        }
        const result = await dbActions.updateRecord('Production', args.id, args.updates);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['randomize_production', {
      name: 'randomize_production',
      description: 'Randomize all segments in a production with Fed Simulator\'s booking algorithms',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Production ID' },
          minPoints: { type: 'number', description: 'Minimum wrestler rating (default: 30)', default: 30 },
          maxSegments: { type: 'number', description: 'Maximum segments to create if none exist (default: 5)', default: 5 },
          createSegments: { type: 'boolean', description: 'Create segments if none exist (default: false)', default: false },
        },
        required: ['id'],
      },
      handler: async (args: any) => {
        const result = await randomizeProduction(args.id, {
          minPoints: args.minPoints,
          maxSegments: args.maxSegments,
          createSegments: args.createSegments,
        });
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['create_random_segment', {
      name: 'create_random_segment',
      description: 'Create a new random segment for a production',
      inputSchema: {
        type: 'object',
        properties: {
          productionId: { type: 'number', description: 'Production ID' },
          segmentType: { 
            type: 'string', 
            enum: ['DEFAULT', 'MAIN_EVENT', 'OPENING', 'MID_CARD', 'SQUASH', 'PROMO', 'BACKSTAGE'],
            description: 'Type of segment (default: DEFAULT)',
            default: 'DEFAULT'
          },
          minPoints: { type: 'number', description: 'Minimum wrestler rating (default: 40)', default: 40 },
          wrestlerCount: { type: 'number', description: 'Number of wrestlers (2-4, auto-selected if not specified)' },
        },
        required: ['productionId'],
      },
      handler: async (args: any) => {
        const result = await createRandomSegment(args.productionId, {
          segmentType: args.segmentType,
          minPoints: args.minPoints,
          wrestlerCount: args.wrestlerCount,
        });
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['delete_production', {
      name: 'delete_production',
      description: 'Delete a production (permanent)',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Production ID' },
        },
        required: ['id'],
      },
      handler: async (args: any) => {
        const result = await dbActions.deleteRecord('Production', args.id);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
  ]);
}