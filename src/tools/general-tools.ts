import { DatabaseActions, createActionWrapper } from '../actions/action-wrapper.js';
import { logger } from '../utils/logger.js';

export function createGeneralTools(db: any) {
  const dbActions = new DatabaseActions(db);

  const getDatabaseStats = createActionWrapper('Get Database Stats', async () => {
    const tables = ['Wrestler', 'Brand', 'Company', 'Production', 'Segment', 'Championship', 'Venue', 'Show'];
    const stats: Record<string, number> = {};

    for (const table of tables) {
      try {
        const count = await (db as any)[table].count();
        stats[table] = count;
      } catch (error) {
        stats[table] = 0;
      }
    }

    const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);

    logger.info('Retrieved database statistics', { 
      stats,
      totalRecords,
    });

    return {
      tables: stats,
      totalRecords,
      timestamp: new Date(),
    };
  });

  const searchDatabase = createActionWrapper('Search Database', async (query: {
    table: string;
    searchTerm: string;
    limit?: number;
  }) => {
    const { table, searchTerm, limit = 20 } = query;
    
    const tableRef = (db as any)[table];
    if (!tableRef) {
      throw new Error(`Table '${table}' not found`);
    }

    // Search by name field (most tables have this)
    const results = await tableRef
      .filter((record: any) => 
        record.name && record.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .limit(limit)
      .toArray();

    logger.info('Performed database search', {
      table,
      searchTerm,
      resultsCount: results.length,
      limit,
    });

    return {
      table,
      searchTerm,
      results,
      count: results.length,
    };
  });

  const backupData = createActionWrapper('Backup Data', async (tables?: string[]) => {
    const tablesToBackup = tables || ['Wrestler', 'Brand', 'Company', 'Production', 'Championship', 'Venue', 'Show'];
    const backup: Record<string, any[]> = {};

    for (const table of tablesToBackup) {
      try {
        const data = await (db as any)[table].toArray();
        backup[table] = data;
      } catch (error) {
        logger.warning(`Failed to backup table ${table}`, { error: error instanceof Error ? error.message : String(error) });
        backup[table] = [];
      }
    }

    const totalRecords = Object.values(backup).reduce((sum, data) => sum + data.length, 0);

    logger.success('Created data backup', {
      tables: tablesToBackup,
      totalRecords,
      backupSize: JSON.stringify(backup).length,
    });

    return {
      backup,
      metadata: {
        timestamp: new Date(),
        tables: tablesToBackup,
        totalRecords,
      },
    };
  });

  const exportDexieData = createActionWrapper('Export Dexie Data', async (tables?: string[]) => {
    // Export all Fed Simulator tables to ensure compatibility
    const tablesToExport = tables || [
      'Venue', 'Company', 'Brand', 'Wrestler', 'Championship', 'Show', 'Production', 
      'Segment', 'Appearance', 'Faction', 'Draft', 'Game', 'StorylineTemplate', 
      'Storyline', 'StorylineBeat', 'Reign', 'Rumble', 'Favourite', 'Bet'
    ];
    
    // Define proper schemas for each table based on Fed Simulator X
    const tableSchemas: Record<string, string> = {
      Venue: "++id,name,desc,image,color,backgroundColor,images,capacity,location,cost,revenueMultiplier,timeZone,setupTimeInDays,historicalRating,pyroRating,lightingRating,parkingRating",
      Company: "++id,name,desc,image,color,backgroundColor",
      Brand: "++id,name,desc,image,color,backgroundColor,images,directorId,balance,companyId",
      Wrestler: "++id,name,desc,image,color,backgroundColor,images,brandIds,entranceVideoUrl,pushed,remainingAppearances,contractType,contractExpires,status,billedFrom,region,country,dob,height,weight,alignment,gender,role,followers,losses,wins,streak,draws,points,morale,stamina,popularity,charisma,damage,active,retired,cost,special,finisher,musicUrl",
      Championship: "++id,name,desc,image,color,backgroundColor,images,wrestlerIds,brandIds,gender,holders,minPoints,maxPoints,rank,active",
      Show: "++id,name,desc,image,color,backgroundColor,images,brandIds,commentatorIds,refereeIds,interviewerIds,authorityIds,special,frequency,monthIndex,weekIndex,dayIndex,maxDuration,entranceVideoUrl,minPoints,maxPoints,income,defaultAmountSegments,avgTicketPrice,avgMerchPrice,avgViewers,avgAttendance",
      Bet: "++id,segmentId,wrestlerId,amount,type,complete,date",
      Production: "++id,name,desc,image,color,backgroundColor,brandIds,venueId,segmentIds,showId,date,wrestlersCost,segmentsCost,merchIncome,attendanceIncome,attendance,viewers,step,complete",
      Segment: "++id,name,championshipIds,appearanceIds,date,type,duration,rating,complete",
      Appearance: "++id,wrestlerId,groupId,manager,cost,winner,loser,draw,[groupId+wrestlerId]",
      Faction: "++id,name,desc,image,color,backgroundColor,images,brandIds,leaderIds,managerIds,wrestlerIds,startDate,endDate",
      Draft: "++id,startDate,endDate,contractType,amountOfAppearances,costPerAppearance,pick,complete,brandId,wrestlerId",
      Game: "++id,brandIds,gender,tutorials,storeVersion,desc,color,backgroundColor,date,dark",
      StorylineTemplate: "++id,name,description,category,suggestedDurationWeeks,roles,requirements,storyBeats,active",
      Storyline: "++id,templateId,name,description,targetEventId,startDate,endDate,status,participants,intensity,peakIntensity",
      StorylineBeat: "++id,storylineId,beatId,segmentId,completedDate,productionId",
      Reign: "++id,wrestlerIds,championshipId,defenses,startDate,endDate",
      Rumble: "++id,name,desc,image,color,backgroundColor,date,championshipId,entryIds,enteredIds,eliminationIds,eliminatedByIds,winnerId,gender,brandIds,duration,active,complete",
      Favourite: "++id,itemId,itemGroup,dateFavourited"
    };

    const data: Record<string, any[]> = {};

    for (const table of tablesToExport) {
      try {
        const tableData = await (db as any)[table].toArray();
        // Clean the data for Dexie import - remove MCP-specific fields
        data[table] = tableData.map((item: any) => {
          const cleanItem = { ...item };
          // Remove internal MCP fields that might conflict
          delete cleanItem._id;
          delete cleanItem.type;
          return cleanItem;
        });
      } catch (error) {
        // Include empty tables - Fed Simulator expects all tables to exist
        logger.info(`Table ${table} not found or empty, including as empty array`, { error: error instanceof Error ? error.message : String(error) });
        data[table] = [];
      }
    }

    const totalRecords = Object.values(data).reduce((sum, tableData) => sum + tableData.length, 0);

    // Create Dexie-compatible export format matching Fed Simulator X structure
    const dexieExport = {
      formatName: "dexie",
      formatVersion: 1,
      data: {
        databaseName: "FedSim00017",
        databaseVersion: 17,
        tables: Object.keys(data).map(tableName => ({
          name: tableName,
          schema: tableSchemas[tableName] || "++id",
          rowCount: data[tableName].length
        })),
        data: data
      }
    };

    logger.success('Created Dexie export', {
      tables: tablesToExport,
      totalRecords,
      exportSize: JSON.stringify(dexieExport).length,
    });

    return dexieExport;
  });

  const resetDatabase = createActionWrapper('Reset Database', async (tables?: string[]) => {
    const tablesToReset = tables || ['Wrestler', 'Brand', 'Company', 'Production', 'Segment', 'Appearance'];
    const resetResults: Record<string, number> = {};

    for (const table of tablesToReset) {
      try {
        const countBefore = await (db as any)[table].count();
        await (db as any)[table].clear();
        resetResults[table] = countBefore;
      } catch (error) {
        logger.error(`Failed to reset table ${table}`, { error: error instanceof Error ? error.message : String(error) });
        resetResults[table] = -1;
      }
    }

    const totalRecordsDeleted = Object.values(resetResults).reduce((sum, count) => sum + Math.max(0, count), 0);

    logger.warning('Reset database tables', {
      tables: tablesToReset,
      resetResults,
      totalRecordsDeleted,
    });

    return {
      resetResults,
      totalRecordsDeleted,
      timestamp: new Date(),
    };
  });

  const queryTable = createActionWrapper('Query Table', async (params: {
    table: string;
    where?: Record<string, any>;
    orderBy?: string;
    limit?: number;
    offset?: number;
  }) => {
    const { table, where, orderBy, limit = 50, offset = 0 } = params;
    
    const tableRef = (db as any)[table];
    if (!tableRef) {
      throw new Error(`Table '${table}' not found`);
    }

    let collection = tableRef.toCollection();

    // Apply filters
    if (where) {
      for (const [field, value] of Object.entries(where)) {
        collection = collection.filter((record: any) => record[field] === value);
      }
    }

    // Apply ordering
    if (orderBy) {
      collection = collection.sortBy(orderBy);
    }

    // Apply pagination
    if (offset > 0) {
      collection = collection.offset(offset);
    }
    
    collection = collection.limit(limit);

    const results = await collection.toArray();
    const totalCount = await tableRef.count();

    logger.info('Executed table query', {
      table,
      where,
      orderBy,
      limit,
      offset,
      resultsCount: results.length,
      totalCount,
    });

    return {
      table,
      results,
      pagination: {
        limit,
        offset,
        count: results.length,
        totalCount,
        hasMore: offset + results.length < totalCount,
      },
      query: { where, orderBy },
    };
  });

  return new Map([
    ['get_database_stats', {
      name: 'get_database_stats',
      description: 'Get statistics about all database tables',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const result = await getDatabaseStats();
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['search_database', {
      name: 'search_database',
      description: 'Search for records across a specific table by name',
      inputSchema: {
        type: 'object',
        properties: {
          table: { 
            type: 'string', 
            enum: ['Wrestler', 'Brand', 'Company', 'Production', 'Championship', 'Venue', 'Show'],
            description: 'Table to search in' 
          },
          searchTerm: { type: 'string', description: 'Text to search for in names' },
          limit: { type: 'number', description: 'Maximum results to return', default: 20 },
        },
        required: ['table', 'searchTerm'],
      },
      handler: async (args: any) => {
        const result = await searchDatabase(args);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['backup_data', {
      name: 'backup_data',
      description: 'Create a backup of database tables',
      inputSchema: {
        type: 'object',
        properties: {
          tables: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Specific tables to backup (optional)' 
          },
        },
      },
      handler: async (args: any) => {
        const result = await backupData(args?.tables);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['reset_database', {
      name: 'reset_database',
      description: 'Reset (clear) specific database tables - USE WITH CAUTION',
      inputSchema: {
        type: 'object',
        properties: {
          tables: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Specific tables to reset (optional, defaults to main tables)' 
          },
        },
      },
      handler: async (args: any) => {
        const result = await resetDatabase(args?.tables);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['query_table', {
      name: 'query_table',
      description: 'Execute a custom query on a table with filtering and pagination',
      inputSchema: {
        type: 'object',
        properties: {
          table: { 
            type: 'string', 
            enum: ['Wrestler', 'Brand', 'Company', 'Production', 'Championship', 'Venue', 'Show', 'Segment', 'Appearance'],
            description: 'Table to query' 
          },
          where: { 
            type: 'object',
            description: 'Filter conditions (field: value pairs)'
          },
          orderBy: { type: 'string', description: 'Field to order by' },
          limit: { type: 'number', description: 'Maximum results', default: 50 },
          offset: { type: 'number', description: 'Offset for pagination', default: 0 },
        },
        required: ['table'],
      },
      handler: async (args: any) => {
        const result = await queryTable(args);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['count_records', {
      name: 'count_records',
      description: 'Count records in a specific table',
      inputSchema: {
        type: 'object',
        properties: {
          table: { 
            type: 'string',
            enum: ['Wrestler', 'Brand', 'Company', 'Production', 'Championship', 'Venue', 'Show', 'Segment', 'Appearance'],
            description: 'Table to count records in' 
          },
        },
        required: ['table'],
      },
      handler: async (args: any) => {
        const result = await dbActions.countRecords(args.table);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['export_dexie_data', {
      name: 'export_dexie_data',
      description: 'Export data in Dexie-compatible format for importing into Fed Simulator X',
      inputSchema: {
        type: 'object',
        properties: {
          tables: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Specific tables to export (optional, defaults to main tables)' 
          },
        },
      },
      handler: async (args: any) => {
        const result = await exportDexieData(args?.tables);
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
  ]);
}