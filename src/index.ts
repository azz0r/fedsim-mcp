#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import chalk from 'chalk';

const server = new Server(
  {
    name: 'fedsimulator-mcp',
    version: '1.0.14',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let db: any;
let allTools: Map<string, any> = new Map();

// Check if running as MCP server (detect stdio mode)
const isMcpMode = !process.stdout.isTTY || 
  process.argv[1]?.includes('npx') || 
  process.argv[1]?.includes('fedsimulator-mcp');

async function initializeServer() {
  if (!isMcpMode) {
    console.error(chalk.blue('🏟️  Initializing Fed Simulator MCP Server...'));
  }
  try {
    // Import simple DB and tool creators
    const { db: database } = await import('./database/simple-db.js');
    const { createWrestlerTools } = await import('./tools/wrestler-tools.js');
    const { createBrandTools } = await import('./tools/brand-tools.js');
    const { createProductionTools } = await import('./tools/production-tools.js');
    const { createGeneralTools } = await import('./tools/general-tools.js');

    db = database;
    if (!isMcpMode) {
      console.error(chalk.green('✅ Database initialized'));
    }
    const wrestlerTools = createWrestlerTools(db);
    const brandTools = createBrandTools(db);
    const productionTools = createProductionTools(db);
    const generalTools = createGeneralTools(db);
    for (const [key, value] of wrestlerTools) allTools.set(key, value);
    for (const [key, value] of brandTools) allTools.set(key, value);
    for (const [key, value] of productionTools) allTools.set(key, value);
    for (const [key, value] of generalTools) allTools.set(key, value);
    
    if (!isMcpMode) {
      console.error(chalk.green(`✅ Loaded ${allTools.size} tools`));
      console.error(chalk.blue('🚀 Fed Simulator MCP Server ready!'));
      console.error(chalk.yellow('\n📋 Available tools:'));
      for (const [name, tool] of allTools) {
        console.error(chalk.gray(`  • ${name}: ${tool.description}`));
      }
      console.error('');
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize server:'), error);
    process.exit(1);
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Array.from(allTools.values()).map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = allTools.get(name);
  if (!tool) {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Tool '${name}' not found`
    );
  }
  try {
    if (!isMcpMode) {
      console.error(chalk.cyan(`🔧 Executing: ${name}`));
      console.error(chalk.gray(`   Args: ${JSON.stringify(args, null, 2)}`));
    }
    const result = await tool.handler(args);
    if (!isMcpMode) {
      console.error(chalk.green(`✅ ${name} completed successfully`));
    }
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    if (!isMcpMode) {
      console.error(chalk.red(`❌ Error executing ${name}:`), error);
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to execute ${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// --- DEMO MODE LOGIC ---
async function runDemoMode() {
  // Import DB only after patch
  const { initializeDatabase } = await import('./database/db.js');
  console.error(chalk.magenta('\n🎬 Running Fed Simulator Demo Mode...'));
  db = await initializeDatabase();
  // 1. Create WWE federation (Company)
  const companyId = await db.Company.add({ name: 'WWE', desc: 'World Wrestling Entertainment', image: null });
  console.error(chalk.green('✅ Created company: WWE'));
  // 2. Create 'Raw' brand
  const brandId = await db.Brand.add({ name: 'Raw', desc: 'Monday Night Raw', color: '#c00', backgroundColor: '#fff', companyId });
  console.error(chalk.green('✅ Created brand: Raw'));
  // 3. Create a few demo wrestlers
  const wrestlerIds = [];
  for (const name of ['John Cena', 'Roman Reigns', 'Becky Lynch', 'Seth Rollins']) {
    const id = await db.Wrestler.add({
      name,
      desc: '',
      image: null,
      images: [],
      color: '#fff',
      backgroundColor: '#999',
      brandIds: [brandId],
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
    });
    wrestlerIds.push(id);
    console.error(chalk.green(`✅ Created wrestler: ${name}`));
  }
  // 4. Create a show (Production)
  const showId = await db.Production.add({
    name: 'Monday Night Raw',
    desc: 'Weekly flagship show',
    date: new Date(),
    brandIds: [brandId],
    venueId: null,
    segmentIds: [],
    complete: false,
  });
  console.error(chalk.green('✅ Created show: Monday Night Raw'));
  // 5. Simulate the show (mark as complete, random results)
  await db.Production.update(showId, { complete: true });
  // Reward winners (randomly pick two)
  const winners = wrestlerIds.sort(() => 0.5 - Math.random()).slice(0, 2);
  for (const id of winners) {
    const wrestler = await db.Wrestler.get(id);
    await db.Wrestler.update(id, { wins: (wrestler?.wins || 0) + 1, popularity: (wrestler?.popularity || 0) + 10 });
    console.error(chalk.yellow(`🏆 Rewarded winner: ${wrestler?.name}`));
  }
  // 6. Move to next month (simulate time passing)
  // (For demo, just print message)
  console.error(chalk.blue('\n⏩ Moving to next month...'));
  // 7. Reset (clear DB)
  await db.delete();
  db = null;
  console.error(chalk.red('\n🔄 Demo complete. Database reset.'));
  // 8. Print summary
  console.error(chalk.magenta('\n🎉 Demo finished! WWE, Raw, 4 wrestlers, 1 show, 2 winners.'));
}
// --- END DEMO MODE LOGIC ---

// Start the server
async function main() {
  await initializeServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  if (!isMcpMode) {
    console.error(chalk.green('Fed Simulator MCP Server running on stdio'));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv[2] === 'demo') {
    runDemoMode().catch((error: Error) => {
      console.error(chalk.red('Demo mode error:'), error);
      process.exit(1);
    });
  } else {
    main().catch((error: Error) => {
      console.error(chalk.red('Fatal error:'), error);
      process.exit(1);
    });
  }
}

export default server;
