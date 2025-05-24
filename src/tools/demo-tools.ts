import { FedSimDatabase } from '../database/db.js';
import { DatabaseActions, createActionWrapper } from '../actions/action-wrapper.js';
import { logger } from '../utils/logger.js';
import { demoWrestlers, demoBrands, demoCompanies, demoVenues } from '../demo/fixtures.js';

export function createDemoTools(db: FedSimDatabase) {
  const dbActions = new DatabaseActions(db);

  const runDemo = createActionWrapper('Run Demo Tutorial', async () => {
    logger.info('🎬 Starting Fed Simulator MCP Demo Tutorial', {});
    
    // Import other tool functions to use them
    const { createWrestlerTools } = await import('./wrestler-tools.js');
    const { createBrandTools } = await import('./brand-tools.js');
    const { createProductionTools } = await import('./production-tools.js');
    const { createGeneralTools } = await import('./general-tools.js');
    
    const wrestlerTools = createWrestlerTools(db);
    const brandTools = createBrandTools(db);
    const productionTools = createProductionTools(db);
    const generalTools = createGeneralTools(db);
    
    // Step 1: Reset database using MCP tool
    logger.info('📋 Step 1: Using reset_database tool...', {});
    const resetTool = generalTools.get('reset_database');
    if (resetTool) {
      await resetTool.handler({ tables: ['Wrestler', 'Brand', 'Company', 'Venue', 'Production', 'Segment', 'Appearance'] });
      logger.success('Database reset complete', {});
    }
    
    // Step 2: Create wrestlers using create_wrestler tool
    logger.info('📋 Step 2: Creating wrestlers using create_wrestler tool...', {});
    const createWrestlerTool = wrestlerTools.get('create_wrestler');
    const wrestlerIds: number[] = [];
    
    for (const wrestler of demoWrestlers.slice(0, 8)) { // First 8 for demo
      if (createWrestlerTool) {
        const result = await createWrestlerTool.handler({
          name: wrestler.name,
          desc: wrestler.desc,
          alignment: wrestler.alignment,
          gender: wrestler.gender,
          height: wrestler.height,
          weight: wrestler.weight,
          billedFrom: wrestler.billedFrom,
          finisher: wrestler.finisher,
          points: wrestler.points,
          charisma: wrestler.charisma,
          morale: wrestler.morale,
          stamina: wrestler.stamina,
          popularity: wrestler.popularity,
        });
        
        if (result && typeof result === 'object' && 'id' in result) {
          wrestlerIds.push(result.id);
          logger.success('✅ create_wrestler called', {
            name: wrestler.name,
            points: wrestler.points,
            alignment: wrestler.alignment
          });
        }
      }
    }
    
    // Step 3: Create brands using create_brand tool
    logger.info('📋 Step 3: Creating brands using create_brand tool...', {});
    const createBrandTool = brandTools.get('create_brand');
    const brandIds: number[] = [];
    
    for (const brand of demoBrands) {
      if (createBrandTool) {
        const result = await createBrandTool.handler({
          name: brand.name,
          desc: brand.desc,
          color: brand.color,
          backgroundColor: brand.backgroundColor,
          balance: brand.balance,
        });
        
        if (result && typeof result === 'object' && 'id' in result) {
          brandIds.push(result.id);
          logger.success('✅ create_brand called', {
            name: brand.name,
            balance: brand.balance
          });
        }
      }
    }
    
    // Step 4: Assign wrestlers to brands using assign_wrestler_to_brand tool
    logger.info('📋 Step 4: Assigning wrestlers to brands using assign_wrestler_to_brand tool...', {});
    const assignWrestlerTool = brandTools.get('assign_wrestler_to_brand');
    
    for (let i = 0; i < wrestlerIds.length; i++) {
      const wrestlerId = wrestlerIds[i];
      const brandId = brandIds[i % brandIds.length]; // Alternate between brands
      
      if (assignWrestlerTool) {
        await assignWrestlerTool.handler({
          wrestlerId,
          brandId,
        });
        
        const brandName = brandId === brandIds[0] ? 'RAW' : 'SmackDown';
        logger.success('✅ assign_wrestler_to_brand called', {
          wrestler: demoWrestlers[i].name,
          brand: brandName
        });
      }
    }
    
    // Step 5: Create a production using create_production tool
    logger.info('📋 Step 5: Creating RAW production using create_production tool...', {});
    const createProductionTool = productionTools.get('create_production');
    let productionId: number = 0;
    
    if (createProductionTool) {
      const result = await createProductionTool.handler({
        name: "RAW - Demo Show",
        desc: "A demo production showcasing MCP tool usage",
        date: new Date().toISOString(),
        brandIds: brandIds.slice(0, 1), // Just RAW
      });
      
      if (result && typeof result === 'object' && 'id' in result) {
        productionId = result.id;
        logger.success('✅ create_production called', {
          name: "RAW - Demo Show",
          id: productionId
        });
      }
    }
    
    // Step 6: Randomize the production using randomize_production tool  
    logger.info('📋 Step 6: Booking the show using randomize_production tool...', {});
    const randomizeProductionTool = productionTools.get('randomize_production');
    
    if (randomizeProductionTool && productionId) {
      const result = await randomizeProductionTool.handler({
        id: productionId,
        createSegments: true,
        maxSegments: 4,
        minPoints: 70,
      });
      
      if (result && typeof result === 'object' && 'randomizedSegments' in result) {
        logger.success('✅ randomize_production called', {
          segmentsCreated: result.randomizedSegments.length,
          production: "RAW - Demo Show"
        });
        
        // Log the matches created
        for (const segment of result.randomizedSegments) {
          logger.info('📺 Match booked', {
            match: segment.name,
            type: segment.type,
            duration: `${segment.duration} minutes`,
            wrestlers: segment.wrestlers.join(' vs ')
          });
        }
      }
    }
    
    // Step 7: Simulate the production using simulate_production tool
    logger.info('📋 Step 7: Simulating the show using simulate_production tool...', {});
    const simulateProductionTool = productionTools.get('simulate_production');
    
    if (simulateProductionTool && productionId) {
      const result = await simulateProductionTool.handler({
        id: productionId
      });
      
      if (result && typeof result === 'object' && 'results' in result) {
        logger.success('✅ simulate_production called', {
          segments: result.results.segments,
          averageRating: result.results.averageRating,
          attendance: result.results.attendance.toLocaleString(),
          revenue: `$${result.results.revenue.toLocaleString()}`,
          profit: `$${result.results.profit.toLocaleString()}`
        });
        
        // Log individual match results
        if (result.results.segmentResults) {
          for (const segmentResult of result.results.segmentResults) {
            logger.info('🏆 Match result', {
              match: segmentResult.segment,
              rating: segmentResult.rating,
              winner: segmentResult.winner
            });
          }
        }
      }
    }
    
    // Step 8: Get production report using get_production_report tool
    logger.info('📋 Step 8: Generating detailed report using get_production_report tool...', {});
    const getReportTool = productionTools.get('get_production_report');
    
    if (getReportTool && productionId) {
      const result = await getReportTool.handler({
        id: productionId
      });
      
      if (result && typeof result === 'object') {
        logger.success('✅ get_production_report called', {
          showName: result.production?.name,
          totalSegments: result.segments?.length || 0,
          totalProfit: `$${result.financial?.profit?.toLocaleString() || 0}`,
          attendance: result.audience?.attendance?.toLocaleString() || 0
        });
      }
    }
    
    // Step 9: Show roster using search_wrestlers tool
    logger.info('📋 Step 9: Viewing roster using search_wrestlers tool...', {});
    const searchWrestlersTool = wrestlerTools.get('search_wrestlers');
    
    if (searchWrestlersTool) {
      const result = await searchWrestlersTool.handler({
        active: true,
        limit: 10
      });
      
      if (Array.isArray(result)) {
        logger.success('✅ search_wrestlers called', {
          wrestlersFound: result.length,
          topWrestlers: result.slice(0, 3).map(w => `${w.name} (${w.points} pts)`)
        });
      }
    }
    
    // Step 10: Check brand finances using get_brand_financials tool
    logger.info('📋 Step 10: Checking brand finances using get_brand_financials tool...', {});
    const getBrandFinancialsTool = brandTools.get('get_brand_financials');
    
    if (getBrandFinancialsTool && brandIds[0]) {
      const result = await getBrandFinancialsTool.handler({
        id: brandIds[0]
      });
      
      if (result && typeof result === 'object' && 'financials' in result) {
        logger.success('✅ get_brand_financials called', {
          brand: result.brand?.name,
          currentBalance: `$${result.financials.currentBalance?.toLocaleString()}`,
          recentShows: result.financials.recentShows,
          totalRevenue: `$${result.financials.totalRevenue?.toLocaleString()}`
        });
      }
    }
    
    // Demo complete - provide tutorial summary
    logger.info('🎓 MCP Tool Demo Complete!', {});
    logger.info('📝 This demo showcased 10 different MCP tools:', {
      '1. reset_database': 'Cleared existing data',
      '2. create_wrestler': 'Created 8 legendary wrestlers',
      '3. create_brand': 'Created RAW and SmackDown brands', 
      '4. assign_wrestler_to_brand': 'Assigned wrestlers to brands',
      '5. create_production': 'Created RAW show',
      '6. randomize_production': 'Auto-booked 4 segments',
      '7. simulate_production': 'Ran full show simulation',
      '8. get_production_report': 'Generated detailed analysis',
      '9. search_wrestlers': 'Searched active roster',
      '10. get_brand_financials': 'Checked brand finances'
    });
    
    logger.info('💡 Key Learning Points:', {
      'MCP Tools': 'Each operation uses proper MCP tool calls - no direct DB access',
      'Realistic Data': 'Uses authentic wrestling stats and Fed Simulator algorithms',
      'Step-by-Step': 'Shows complete workflow from setup to analysis',
      'Error Handling': 'Tools validate inputs and provide clear error messages',
      'Logging': 'Every operation provides detailed feedback and results'
    });
    
    logger.info('🚀 Try These Commands Next:', {
      'Boost a wrestler': 'boost_wrestler {"id": 1}',
      'Create another show': 'create_production {"name": "SmackDown Live"}',
      'Search by alignment': 'search_wrestlers {"alignment": "HEEL"}',
      'Check database stats': 'get_database_stats',
      'View all tools': 'show_tutorial'
    });
    
    return {
      message: 'Fed Simulator MCP Tool Demo completed successfully!',
      toolsUsed: 10,
      summary: {
        wrestlersCreated: 8,
        brandsCreated: 2,
        productionId: productionId || 0,
        mcpToolsCalled: [
          'reset_database',
          'create_wrestler',
          'create_brand', 
          'assign_wrestler_to_brand',
          'create_production',
          'randomize_production',
          'simulate_production',
          'get_production_report',
          'search_wrestlers',
          'get_brand_financials'
        ]
      },
      nextSteps: [
        'boost_wrestler {"id": 1}',
        'search_wrestlers {"alignment": "FACE"}',
        'get_database_stats',
        'create_random_segment {"productionId": ' + (productionId || 1) + '}',
        'show_tutorial'
      ],
    };
  });

  const showTutorial = createActionWrapper('Show Tutorial', async () => {
    logger.info('🎓 Fed Simulator MCP Tutorial', {});
    logger.info('📖 Available Tools Guide:', {
      'Wrestler Management': [
        'create_wrestler - Create new wrestlers',
        'search_wrestlers - Find wrestlers by criteria', 
        'boost_wrestler - Improve wrestler stats',
        'get_wrestler_stats - View detailed wrestler info',
        'list_wrestlers - Show all wrestlers',
      ],
      'Brand Operations': [
        'create_brand - Create wrestling brands',
        'get_brand_roster - View brand wrestlers',
        'get_brand_financials - Check profits/losses',
        'assign_wrestler_to_brand - Move wrestlers between brands',
        'update_brand_balance - Add/subtract money',
      ],
      'Production Tools': [
        'create_production - Create wrestling shows',
        'randomize_production - Auto-book matches',
        'simulate_production - Run show simulation',
        'create_random_segment - Add random matches',
        'get_production_report - Detailed show analysis',
      ],
      'Database Tools': [
        'get_database_stats - Overview of all data',
        'search_database - Search any table',
        'backup_data - Export data',
        'reset_database - Clear all data',
      ],
      'Demo Commands': [
        'run_demo - Complete tutorial with sample data',
        'show_tutorial - Display this help guide',
      ],
    });
    
    logger.info('🚀 Quick Start Guide:', {
      '1. Run Demo': 'run_demo - Creates sample data and shows full workflow',
      '2. Explore Data': 'search_wrestlers, list_brands, get_database_stats',
      '3. Create Content': 'create_wrestler, create_production',
      '4. Book Shows': 'randomize_production, create_random_segment', 
      '5. Simulate': 'simulate_production, get_production_report',
      '6. Manage': 'boost_wrestler, update_brand_balance',
    });
    
    logger.info('💡 Pro Tips:', {
      'Use npx': 'npx fedsimulator-mcp to run without installing',
      'MCP Clients': 'Works with Claude Code, any MCP-compatible client',
      'Realistic Data': 'Demo uses authentic wrestling stats and algorithms',
      'Workflow': 'Create → Randomize → Simulate → Analyze → Repeat',
    });
    
    return {
      message: 'Fed Simulator MCP Tutorial - Ready to manage your wrestling empire!',
      quickCommands: [
        'run_demo - Start with sample data',
        'create_wrestler {"name": "Your Wrestler", "points": 85}',
        'search_wrestlers {"alignment": "FACE"}',
        'get_database_stats - See what you have',
      ],
    };
  });

  return new Map([
    ['run_demo', {
      name: 'run_demo',
      description: 'Run complete Fed Simulator demo with sample wrestlers, brands, and a full show simulation',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const result = await runDemo();
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
    ['show_tutorial', {
      name: 'show_tutorial',
      description: 'Display tutorial and help guide for Fed Simulator MCP tools',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const result = await showTutorial();
        return result.success ? result.data : `Error: ${result.error}`;
      },
    }],
  ]);
}