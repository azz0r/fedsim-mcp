import { FedSimDatabase, Wrestler } from '../database/db.js';
import { DatabaseActions, createActionWrapper } from '../actions/action-wrapper.js';
import { logger } from '../utils/logger.js';
import type { PouchDBSelector, WrestlerSearchQuery } from '../types/database.js';

export function createWrestlerTools(db: FedSimDatabase) {
  const dbActions = new DatabaseActions(db);

  // Helper function to build safe database selectors
  const buildWrestlerSelector = (query: WrestlerSearchQuery): PouchDBSelector => {
    const selector: PouchDBSelector = { type: 'Wrestler' };
    
    // Only add validated fields to selector
    if (query.active !== undefined) {
      selector.active = query.active;
    }
    
    if (query.alignment && ['FACE', 'HEEL', 'NEUTRAL'].includes(query.alignment)) {
      selector.alignment = query.alignment;
    }
    
    if (query.brand && typeof query.brand === 'number' && query.brand > 0) {
      selector.brandIds = { $elemMatch: query.brand };
    }
    
    return selector;
  };

  // Wrestler-specific actions
  const boostWrestler = createActionWrapper('Boost Wrestler', async (id: number) => {
    const wrestler = await db.Wrestler.get(id);
    if (!wrestler) {
      throw new Error(`Wrestler with ID ${id} not found`);
    }

    const updates = {
      morale: Math.min(100, wrestler.morale + 5),
      popularity: Math.min(100, wrestler.popularity + 5),
      damage: Math.max(0, wrestler.damage - 2),
      charisma: Math.min(100, wrestler.charisma + 3),
      stamina: Math.min(100, wrestler.stamina + 3),
      points: Math.min(100, wrestler.points + 2),
    };

    await db.Wrestler.update(id, updates);
    const updatedWrestler = await db.Wrestler.get(id);
    
    logger.success('Wrestler boosted', { 
      wrestler: wrestler.name,
      changes: updates,
      newStats: {
        morale: updatedWrestler?.morale,
        popularity: updatedWrestler?.popularity,
        damage: updatedWrestler?.damage,
        charisma: updatedWrestler?.charisma,
        stamina: updatedWrestler?.stamina,
        points: updatedWrestler?.points,
      }
    });
    
    return updatedWrestler;
  });

  const penalizeWrestler = createActionWrapper('Penalize Wrestler', async (id: number) => {
    const wrestler = await db.Wrestler.get(id);
    if (!wrestler) {
      throw new Error(`Wrestler with ID ${id} not found`);
    }

    const updates = {
      morale: Math.max(0, wrestler.morale - 3),
      popularity: Math.max(0, wrestler.popularity - 3),
      damage: Math.min(100, wrestler.damage + 5),
      stamina: Math.max(0, wrestler.stamina - 3),
      points: Math.max(0, wrestler.points - 2),
    };

    await db.Wrestler.update(id, updates);
    const updatedWrestler = await db.Wrestler.get(id);
    
    logger.warning('Wrestler penalized', { 
      wrestler: wrestler.name,
      changes: updates,
      newStats: {
        morale: updatedWrestler?.morale,
        popularity: updatedWrestler?.popularity,
        damage: updatedWrestler?.damage,
        stamina: updatedWrestler?.stamina,
        points: updatedWrestler?.points,
      }
    });
    
    return updatedWrestler;
  });

  const createWrestler = createActionWrapper('Create Wrestler', async (wrestlerData: Partial<Wrestler>) => {
    const defaultWrestler: Partial<Wrestler> = {
      name: 'New Wrestler',
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
      contractExpires: new Date(new Date().setDate(new Date().getDate() + 365)),
      status: 'SIGNED',
      billedFrom: '',
      region: '',
      country: '',
      dob: null,
      height: 180,
      weight: 170,
      alignment: 'NEUTRAL',
      gender: 'MALE',
      role: 'DEFAULT',
      followers: 1000,
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
    };

    const newWrestler = { ...defaultWrestler, ...wrestlerData };
    const id = await db.Wrestler.add(newWrestler as Wrestler);
    const createdWrestler = await db.Wrestler.get(id);
    
    logger.success('Created new wrestler', { 
      id,
      name: createdWrestler?.name,
      alignment: createdWrestler?.alignment,
      stats: {
        points: createdWrestler?.points,
        morale: createdWrestler?.morale,
        charisma: createdWrestler?.charisma,
      }
    });
    
    return createdWrestler;
  });

  const searchWrestlers = createActionWrapper('Search Wrestlers', async (query: WrestlerSearchQuery) => {
    // Input validation
    if (query.name && query.name.length > 50) {
      throw new Error('Search term too long (maximum 50 characters)');
    }
    
    if (query.limit && (query.limit < 1 || query.limit > 100)) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Build safe selector using helper function
    const selector = buildWrestlerSelector(query);
    
    // Fetch from PouchDB with typed method
    const result = await db.find<Wrestler>({ selector });
    let wrestlers = result.docs;
    
    // In-memory name filter (partial match) with input sanitization
    if (query.name) {
      const searchTerm = query.name.toLowerCase().trim();
      wrestlers = wrestlers.filter(w =>
        w.name && w.name.toLowerCase().includes(searchTerm)
      );
    }
    
    // In-memory limit
    if (query.limit) {
      wrestlers = wrestlers.slice(0, query.limit);
    }
    
    logger.info('Searched wrestlers', {
      queryType: query.name ? 'name_search' : 'filter_search',
      resultsCount: wrestlers.length,
      hasNameFilter: !!query.name,
      hasAlignmentFilter: !!query.alignment
    });
    
    return wrestlers;
  });

  const getWrestlerStats = createActionWrapper('Get Wrestler Stats', async (id: number) => {
    const wrestler = await db.Wrestler.get(id);
    if (!wrestler) {
      throw new Error(`Wrestler with ID ${id} not found`);
    }

    const stats = {
      basicInfo: {
        id: wrestler.id,
        name: wrestler.name,
        alignment: wrestler.alignment,
        gender: wrestler.gender,
        active: wrestler.active,
        retired: wrestler.retired,
      },
      physicalStats: {
        height: wrestler.height,
        weight: wrestler.weight,
        billedFrom: wrestler.billedFrom,
      },
      performanceStats: {
        points: wrestler.points,
        morale: wrestler.morale,
        stamina: wrestler.stamina,
        popularity: wrestler.popularity,
        charisma: wrestler.charisma,
        damage: wrestler.damage,
      },
      record: {
        wins: wrestler.wins,
        losses: wrestler.losses,
        draws: wrestler.draws,
        streak: wrestler.streak,
      },
      contract: {
        type: wrestler.contractType,
        remainingAppearances: wrestler.remainingAppearances,
        expires: wrestler.contractExpires,
        cost: wrestler.cost,
        status: wrestler.status,
      },
      brands: wrestler.brandIds,
      followers: wrestler.followers,
    };

    logger.info('Retrieved wrestler stats', { 
      wrestler: wrestler.name,
      overall: wrestler.points,
      record: `${wrestler.wins}-${wrestler.losses}-${wrestler.draws}`
    });

    return stats;
  });

  // Return tools map
  return new Map([
    ['create_wrestler', {
      name: 'create_wrestler',
      description: 'Create a new wrestler with specified attributes',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Wrestler name' },
          alignment: { 
            type: 'string', 
            enum: ['FACE', 'HEEL', 'NEUTRAL'], 
            description: 'Wrestler alignment' 
          },
          gender: { 
            type: 'string', 
            enum: ['MALE', 'FEMALE'], 
            description: 'Wrestler gender' 
          },
          height: { type: 'number', description: 'Height in cm' },
          weight: { type: 'number', description: 'Weight in lbs' },
          billedFrom: { type: 'string', description: 'Billed location' },
          finisher: { type: 'string', description: 'Finishing move' },
          points: { type: 'number', description: 'Overall rating (0-100)' },
          charisma: { type: 'number', description: 'Charisma rating (0-100)' },
        },
        required: ['name'],
      },
      handler: async (args: any) => {
        const result = await createWrestler(args);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['boost_wrestler', {
      name: 'boost_wrestler',
      description: 'Boost a wrestler\'s stats (morale, popularity, charisma, etc.)',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Wrestler ID' },
        },
        required: ['id'],
      },
      handler: async (args: any) => {
        const result = await boostWrestler(args.id);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['penalize_wrestler', {
      name: 'penalize_wrestler',
      description: 'Penalize a wrestler\'s stats (reduce morale, popularity, etc.)',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Wrestler ID' },
        },
        required: ['id'],
      },
      handler: async (args: any) => {
        const result = await penalizeWrestler(args.id);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['search_wrestlers', {
      name: 'search_wrestlers',
      description: 'Search for wrestlers by various criteria',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Search by name (partial match)' },
          alignment: { 
            type: 'string', 
            enum: ['FACE', 'HEEL', 'NEUTRAL'], 
            description: 'Filter by alignment' 
          },
          brand: { type: 'number', description: 'Filter by brand ID' },
          active: { type: 'boolean', description: 'Filter by active status' },
          limit: { type: 'number', description: 'Limit results' },
        },
      },
      handler: async (args: any) => {
        const result = await searchWrestlers(args);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['get_wrestler_stats', {
      name: 'get_wrestler_stats',
      description: 'Get detailed stats for a specific wrestler',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Wrestler ID' },
        },
        required: ['id'],
      },
      handler: async (args: any) => {
        const result = await getWrestlerStats(args.id);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['list_wrestlers', {
      name: 'list_wrestlers',
      description: 'List all wrestlers with optional limit',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of wrestlers to return' },
        },
      },
      handler: async (args: any) => {
        const result = await dbActions.fetchAll('Wrestler', args?.limit);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['update_wrestler', {
      name: 'update_wrestler',
      description: 'Update a wrestler\'s information',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Wrestler ID' },
          updates: { 
            type: 'object', 
            description: 'Fields to update',
            properties: {
              name: { type: 'string' },
              alignment: { type: 'string', enum: ['FACE', 'HEEL', 'NEUTRAL'] },
              active: { type: 'boolean' },
              retired: { type: 'boolean' },
              points: { type: 'number', minimum: 0, maximum: 100 },
              morale: { type: 'number', minimum: 0, maximum: 100 },
              charisma: { type: 'number', minimum: 0, maximum: 100 },
              popularity: { type: 'number', minimum: 0, maximum: 100 },
              stamina: { type: 'number', minimum: 0, maximum: 100 },
              damage: { type: 'number', minimum: 0, maximum: 100 },
            }
          },
        },
        required: ['id', 'updates'],
      },
      handler: async (args: any) => {
        const result = await dbActions.updateRecord('Wrestler', args.id, args.updates);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['delete_wrestler', {
      name: 'delete_wrestler',
      description: 'Delete a wrestler (permanent)',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Wrestler ID' },
        },
        required: ['id'],
      },
      handler: async (args: any) => {
        const result = await dbActions.deleteRecord('Wrestler', args.id);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
  ]);
}