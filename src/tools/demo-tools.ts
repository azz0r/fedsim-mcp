import { FedSimDatabase } from '../database/db.js';
import { DatabaseActions, createActionWrapper } from '../actions/action-wrapper.js';
import { logger } from '../utils/logger.js';
import { demoWrestlers, demoBrands, demoCompanies, demoVenues } from '../demo/fixtures.js';

export function createDemoTools(db: FedSimDatabase) {
  const dbActions = new DatabaseActions(db);

  const runDemo = createActionWrapper('Run Demo Tutorial', async () => {
    logger.info('🎬 Starting Fed Simulator MCP Demo Tutorial', {});
    
    // Step 1: Reset database
    logger.info('📋 Step 1: Clearing existing data...', {});
    await db.Wrestler.clear();
    await db.Brand.clear();
    await db.Company.clear();
    await db.Venue.clear();
    await db.Production.clear();
    await db.Segment.clear();
    await db.Appearance.clear();
    
    // Step 2: Load demo data
    logger.info('📋 Step 2: Loading demo wrestling roster...', {});
    
    // Create company
    const companyId = await db.Company.add(demoCompanies[0]);
    logger.success('Created company', { name: demoCompanies[0].name, id: companyId });
    
    // Create venues
    const venueIds: number[] = [];
    for (const venue of demoVenues) {
      const venueId = await db.Venue.add(venue);
      venueIds.push(venueId);
      logger.success('Created venue', { name: venue.name, capacity: venue.capacity });
    }
    
    // Create brands
    const brandIds: number[] = [];
    for (const brand of demoBrands) {
      const brandId = await db.Brand.add({ 
        ...brand, 
        companyId,
        image: null,
        images: [],
        directorId: null,
      });
      brandIds.push(brandId);
      logger.success('Created brand', { name: brand.name, balance: brand.balance });
    }
    
    // Create wrestlers and assign to brands
    const wrestlerIds: number[] = [];
    for (let i = 0; i < demoWrestlers.length; i++) {
      const wrestler = demoWrestlers[i];
      // Alternate between RAW and SmackDown
      const brandId = brandIds[i % brandIds.length];
      
      const wrestlerId = await db.Wrestler.add({
        ...wrestler,
        image: null,
        images: [],
        color: '#fff',
        backgroundColor: '#999',
        region: '',
        country: '',
        dob: null,
        musicUrl: '',
        brandIds: [brandId],
        wins: Math.floor(Math.random() * 20) + 5,
        losses: Math.floor(Math.random() * 15) + 2,
        draws: Math.floor(Math.random() * 3),
        streak: Math.floor(Math.random() * 5),
        followers: 100000 + Math.floor(Math.random() * 900000),
        contractExpires: new Date(new Date().setDate(new Date().getDate() + 365)),
        remainingAppearances: 52,
        contractType: 'FULL',
        status: 'SIGNED',
        retired: false,
        entranceVideoUrl: '',
        pushed: false,
        special: '',
      });
      wrestlerIds.push(wrestlerId);
      
      const brand = await db.Brand.get(brandId);
      logger.success('Created wrestler', { 
        name: wrestler.name, 
        brand: brand?.name,
        points: wrestler.points,
        alignment: wrestler.alignment
      });
    }
    
    // Step 3: Create a production
    logger.info('📋 Step 3: Creating Monday Night RAW production...', {});
    const productionId = await db.Production.add({
      name: "Monday Night RAW - Demo Show",
      desc: "A demo production to showcase Fed Simulator MCP capabilities",
      image: null,
      color: "#FF0000",
      backgroundColor: "#000000",
      brandIds: [brandIds[0]], // RAW
      venueId: venueIds[0], // Madison Square Garden
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
    });
    
    logger.success('Created production', { 
      name: "Monday Night RAW - Demo Show",
      venue: demoVenues[0].name,
      id: productionId
    });
    
    // Step 4: Randomize the production
    logger.info('📋 Step 4: Randomizing show with Fed Simulator booking algorithms...', {});
    
    // Create 4 segments
    const segmentIds: number[] = [];
    const segmentTypes = ['OPENING', 'MID_CARD', 'MID_CARD', 'MAIN_EVENT'];
    
    for (let i = 0; i < 4; i++) {
      const segmentId = await db.Segment.add({
        name: `Segment ${i + 1}`,
        desc: '',
        championshipIds: [],
        appearanceIds: [],
        date: new Date(),
        type: segmentTypes[i],
        duration: 0,
        rating: 0,
        complete: false,
      });
      segmentIds.push(segmentId);
    }
    
    // Update production with segments
    await db.Production.update(productionId, { segmentIds });
    
    // Import randomization logic
    const { generateAppearances, randomizeSegmentDuration, generateSegmentName } = await import('../actions/randomization-algorithms.js');
    
    // Get wrestlers for this brand
    const brandWrestlers = await db.Wrestler.filter(w => w.brandIds.includes(brandIds[0])).toArray();
    
    // Randomize each segment
    const usedWrestlerIds: number[] = [];
    for (let i = 0; i < segmentIds.length; i++) {
      const segmentId = segmentIds[i];
      const segmentType = segmentTypes[i];
      
      // Generate appearances
      const availableWrestlers = brandWrestlers.filter(w => 
        !usedWrestlerIds.includes(w.id!) && w.points >= (segmentType === 'MAIN_EVENT' ? 85 : 70)
      );
      
      const wrestlersPool = availableWrestlers.length >= 2 ? availableWrestlers : brandWrestlers;
      const appearances = generateAppearances({
        wrestlers: wrestlersPool,
        exclude: usedWrestlerIds.slice(-2),
        minPoints: segmentType === 'MAIN_EVENT' ? 85 : 70,
      });
      
      if (appearances.length === 0) continue;
      
      // Create appearances in database
      const appearanceIds: number[] = [];
      for (const appearance of appearances) {
        const appearanceId = await db.Appearance.add({
          wrestlerId: appearance.wrestlerId,
          groupId: appearance.groupId,
          manager: false,
          cost: appearance.cost,
          winner: false,
          loser: false,
        });
        appearanceIds.push(appearanceId);
        usedWrestlerIds.push(appearance.wrestlerId);
      }
      
      // Update segment
      const duration = randomizeSegmentDuration(segmentType);
      const segmentWrestlers = appearances.map(a => a.wrestler);
      const name = generateSegmentName(segmentWrestlers);
      
      await db.Segment.update(segmentId, {
        name,
        duration,
        appearanceIds,
      });
      
      logger.success('Randomized segment', {
        segment: name,
        type: segmentType,
        wrestlers: segmentWrestlers.map(w => w.name),
        duration: `${duration} minutes`,
      });
    }
    
    // Step 5: Simulate the production
    logger.info('📋 Step 5: Simulating the show with match results...', {});
    
    const { 
      calculateSegmentRating, 
      simulateMatch, 
      calculateAttendance, 
      calculateRevenue, 
      calculateViewership 
    } = await import('../actions/fed-simulator-algorithms.js');
    
    const segments = await db.Segment.filter(s => segmentIds.includes(s.id!)).toArray();
    let totalRating = 0;
    let wrestlersCost = 0;
    
    for (const segment of segments) {
      const appearances = await db.Appearance
        .filter(a => segment.appearanceIds.includes(a.id!))
        .toArray();
      
      const appearancesWithWrestlers = await Promise.all(
        appearances.map(async (appearance) => {
          const wrestler = await db.Wrestler.get(appearance.wrestlerId);
          return { ...appearance, wrestler };
        })
      );
      
      wrestlersCost += appearances.reduce((sum, a) => sum + a.cost, 0);
      
      const { score: rating } = calculateSegmentRating(appearancesWithWrestlers);
      const simulatedAppearances = simulateMatch(appearancesWithWrestlers);
      
      // Update appearances with results
      for (const appearance of simulatedAppearances) {
        await db.Appearance.update(appearance.id!, {
          winner: appearance.winner,
          loser: appearance.loser,
        });
        
        // Update wrestler records
        if (appearance.winner || appearance.loser) {
          const wrestler = appearance.wrestler!;
          await db.Wrestler.update(wrestler.id!, {
            wins: wrestler.wins + (appearance.winner ? 1 : 0),
            losses: wrestler.losses + (appearance.loser ? 1 : 0),
            morale: Math.min(100, wrestler.morale + (appearance.winner ? 3 : -1)),
            popularity: Math.min(100, wrestler.popularity + (appearance.winner ? 2 : -1)),
          });
        }
      }
      
      await db.Segment.update(segment.id!, {
        complete: true,
        rating: Math.round(rating),
      });
      
      totalRating += rating;
      
      const winner = simulatedAppearances.find(a => a.winner);
      logger.success('Simulated segment', {
        segment: segment.name,
        rating: Math.round(rating),
        winner: winner?.wrestler?.name || 'No contest',
      });
    }
    
    // Calculate final results
    const averageRating = Math.round(totalRating / segments.length);
    const allWrestlers = await db.Wrestler.toArray();
    const attendance = calculateAttendance(allWrestlers, 15000); // MSG base
    const { attendanceIncome, merchIncome, totalRevenue } = calculateRevenue(attendance);
    const viewers = calculateViewership(attendance);
    
    await db.Production.update(productionId, {
      complete: true,
      wrestlersCost,
      attendanceIncome,
      merchIncome,
      attendance,
      viewers,
      step: 100,
    });
    
    logger.success('Show simulation complete!', {
      averageRating,
      attendance: attendance.toLocaleString(),
      revenue: `$${totalRevenue.toLocaleString()}`,
      profit: `$${(totalRevenue - wrestlersCost).toLocaleString()}`,
      viewers: viewers.toLocaleString(),
    });
    
    // Step 6: Tutorial summary
    logger.info('🎓 Demo Tutorial Complete!', {});
    logger.info('📚 What you can do next:', {
      'List all tools': 'Call any MCP client to see available tools',
      'View wrestlers': 'Use search_wrestlers or list_wrestlers',
      'Check finances': 'Use get_brand_financials to see profit/loss',
      'Create more shows': 'Use create_production, randomize_production, simulate_production',
      'Manage roster': 'Use boost_wrestler, penalize_wrestler, update_wrestler',
      'Reset and try again': 'Use reset_database then run_demo',
    });
    
    return {
      message: 'Fed Simulator MCP Demo completed successfully!',
      summary: {
        wrestlersCreated: demoWrestlers.length,
        brandsCreated: demoBrands.length,
        venuesCreated: demoVenues.length,
        productionId,
        segmentsSimulated: segments.length,
        finalResults: {
          averageRating,
          attendance,
          revenue: totalRevenue,
          profit: totalRevenue - wrestlersCost,
          viewers,
        },
      },
      nextSteps: [
        'Try: search_wrestlers {"alignment": "FACE"}',
        'Try: get_brand_roster {"id": 1}', 
        'Try: create_random_segment {"productionId": ' + productionId + '}',
        'Try: get_production_report {"id": ' + productionId + '}',
        'Try: boost_wrestler {"id": 1}',
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