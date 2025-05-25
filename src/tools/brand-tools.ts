import { FedSimDatabase, Brand } from '../database/db.js';
import { DatabaseActions, createActionWrapper } from '../actions/action-wrapper.js';
import { logger } from '../utils/logger.js';

export function createBrandTools(db: FedSimDatabase) {
  const dbActions = new DatabaseActions(db);

  const createBrand = createActionWrapper('Create Brand', async (brandData: Partial<Brand>) => {
    const defaultBrand: Partial<Brand> = {
      name: 'New Brand',
      desc: '',
      image: null,
      images: [],
      color: '#fff',
      backgroundColor: '#999',
      directorId: null,
      balance: 1000000, // Start with $1M
      companyId: null,
    };

    const newBrand = { ...defaultBrand, ...brandData };
    const id = await db.Brand.add(newBrand as Brand);
    const createdBrand = await db.Brand.get(id);
    
    logger.success('Created new brand', { 
      id,
      name: createdBrand?.name,
      balance: createdBrand?.balance,
    });
    
    return createdBrand;
  });

  const updateBrandBalance = createActionWrapper('Update Brand Balance', async (id: number, amount: number) => {
    const brand = await db.Brand.get(id);
    if (!brand) {
      throw new Error(`Brand with ID ${id} not found`);
    }

    const newBalance = brand.balance + amount;
    await db.Brand.update(id, { balance: newBalance });
    
    const updatedBrand = await db.Brand.get(id);
    
    logger.info('Updated brand balance', { 
      brand: brand.name,
      oldBalance: brand.balance,
      change: amount,
      newBalance: newBalance,
      operation: amount > 0 ? 'credit' : 'debit'
    });
    
    return updatedBrand;
  });

  const getBrandRoster = createActionWrapper('Get Brand Roster', async (brandId: number) => {
    const brand = await db.Brand.get(brandId);
    if (!brand) {
      throw new Error(`Brand with ID ${brandId} not found`);
    }
    // PouchDB: find all active wrestlers for this brand
    const wrestlers = (await (db as any).find({
      selector: { type: 'Wrestler', brandIds: { $elemMatch: brandId }, active: true }
    })).docs as any[];
    const rosterStats = {
      totalWrestlers: wrestlers.length,
      byAlignment: {
        face: wrestlers.filter(w => w.alignment === 'FACE').length,
        heel: wrestlers.filter(w => w.alignment === 'HEEL').length,
        neutral: wrestlers.filter(w => w.alignment === 'NEUTRAL').length,
      },
      byGender: {
        male: wrestlers.filter(w => w.gender === 'MALE').length,
        female: wrestlers.filter(w => w.gender === 'FEMALE').length,
      },
      averageRating: Math.round(wrestlers.reduce((sum, w) => sum + w.points, 0) / wrestlers.length || 0),
      totalCost: wrestlers.reduce((sum, w) => sum + w.cost, 0),
    };
    logger.info('Retrieved brand roster', {
      brand: brand.name,
      stats: rosterStats,
      wrestlers: wrestlers.map(w => ({ id: w._id, name: w.name, alignment: w.alignment, points: w.points }))
    });
    return {
      brand: { id: brand.id, name: brand.name },
      wrestlers,
      stats: rosterStats,
    };
  });

  const getBrandFinancials = createActionWrapper('Get Brand Financials', async (brandId: number) => {
    const brand = await db.Brand.get(brandId);
    if (!brand) {
      throw new Error(`Brand with ID ${brandId} not found`);
    }
    // PouchDB: find recent productions for this brand, sorted by date desc, limit 10
    const recentProductions = (await (db as any).find({
      selector: { type: 'Production', brandIds: { $elemMatch: brandId } },
      sort: [{ date: 'desc' }],
      limit: 10
    })).docs as any[];
    const totalRevenue = recentProductions.reduce((sum, p) => sum + (p.attendanceIncome + p.merchIncome), 0);
    const totalCosts = recentProductions.reduce((sum, p) => sum + (p.wrestlersCost + p.segmentsCost), 0);
    const netProfit = totalRevenue - totalCosts;
    const financials = {
      currentBalance: brand.balance,
      recentShows: recentProductions.length,
      totalRevenue,
      totalCosts,
      netProfit,
      averagePerShow: recentProductions.length > 0 ? Math.round(netProfit / recentProductions.length) : 0,
    };
    logger.info('Retrieved brand financials', {
      brand: brand.name,
      financials
    });
    return {
      brand: { id: brand.id, name: brand.name },
      financials,
      recentProductions: recentProductions.map(p => ({
        id: p._id,
        name: p.name,
        date: p.date,
        revenue: p.attendanceIncome + p.merchIncome,
        costs: p.wrestlersCost + p.segmentsCost,
        profit: (p.attendanceIncome + p.merchIncome) - (p.wrestlersCost + p.segmentsCost),
      })),
    };
  });

  const assignWrestlerToBrand = createActionWrapper('Assign Wrestler to Brand', async (wrestlerId: number, brandId: number) => {
    const wrestler = await db.Wrestler.get(wrestlerId);
    const brand = await db.Brand.get(brandId);
    
    if (!wrestler) {
      throw new Error(`Wrestler with ID ${wrestlerId} not found`);
    }
    if (!brand) {
      throw new Error(`Brand with ID ${brandId} not found`);
    }

    // Add brand to wrestler's brandIds if not already there
    const updatedBrandIds = wrestler.brandIds.includes(brandId) 
      ? wrestler.brandIds 
      : [...wrestler.brandIds, brandId];

    await db.Wrestler.update(wrestlerId, { brandIds: updatedBrandIds });
    const updatedWrestler = await db.Wrestler.get(wrestlerId);

    logger.info('Assigned wrestler to brand', {
      wrestler: wrestler.name,
      brand: brand.name,
      wasAlreadyAssigned: wrestler.brandIds.includes(brandId),
      newBrandIds: updatedBrandIds,
    });

    return {
      wrestler: updatedWrestler,
      brand,
      success: true,
    };
  });

  return new Map([
    ['create_brand', {
      name: 'create_brand',
      description: 'Create a new wrestling brand',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Brand name' },
          desc: { type: 'string', description: 'Brand description' },
          color: { type: 'string', description: 'Brand primary color (hex)' },
          backgroundColor: { type: 'string', description: 'Brand background color (hex)' },
          balance: { type: 'number', description: 'Starting balance' },
          companyId: { type: 'number', description: 'Parent company ID' },
        },
        required: ['name'],
      },
      handler: async (args: any) => {
        const result = await createBrand(args);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['list_brands', {
      name: 'list_brands',
      description: 'List all brands',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of brands to return' },
        },
      },
      handler: async (args: any) => {
        const result = await dbActions.fetchAll('Brand', args?.limit);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['update_brand_balance', {
      name: 'update_brand_balance',
      description: 'Credit or debit a brand\'s balance',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Brand ID' },
          amount: { type: 'number', description: 'Amount to add (positive) or subtract (negative)' },
        },
        required: ['id', 'amount'],
      },
      handler: async (args: any) => {
        const result = await updateBrandBalance(args.id, args.amount);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['get_brand_roster', {
      name: 'get_brand_roster',
      description: 'Get all wrestlers assigned to a brand with stats',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Brand ID' },
        },
        required: ['id'],
      },
      handler: async (args: any) => {
        const result = await getBrandRoster(args.id);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['get_brand_financials', {
      name: 'get_brand_financials',
      description: 'Get financial overview for a brand including recent show profits',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Brand ID' },
        },
        required: ['id'],
      },
      handler: async (args: any) => {
        const result = await getBrandFinancials(args.id);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['assign_wrestler_to_brand', {
      name: 'assign_wrestler_to_brand',
      description: 'Assign a wrestler to a brand roster',
      inputSchema: {
        type: 'object',
        properties: {
          wrestlerId: { type: 'number', description: 'Wrestler ID' },
          brandId: { type: 'number', description: 'Brand ID' },
        },
        required: ['wrestlerId', 'brandId'],
      },
      handler: async (args: any) => {
        const result = await assignWrestlerToBrand(args.wrestlerId, args.brandId);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['update_brand', {
      name: 'update_brand',
      description: 'Update brand information',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Brand ID' },
          updates: { 
            type: 'object', 
            description: 'Fields to update',
            properties: {
              name: { type: 'string' },
              desc: { type: 'string' },
              color: { type: 'string' },
              backgroundColor: { type: 'string' },
              directorId: { type: 'number' },
              balance: { type: 'number' },
            }
          },
        },
        required: ['id', 'updates'],
      },
      handler: async (args: any) => {
        const result = await dbActions.updateRecord('Brand', args.id, args.updates);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['delete_brand', {
      name: 'delete_brand',
      description: 'Delete a brand (permanent)',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Brand ID' },
        },
        required: ['id'],
      },
      handler: async (args: any) => {
        const result = await dbActions.deleteRecord('Brand', args.id);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
  ]);
}