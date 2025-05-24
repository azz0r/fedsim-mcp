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
import { initializeDatabase } from './database/db.js';
import { createWrestlerTools } from './tools/wrestler-tools.js';
import { createBrandTools } from './tools/brand-tools.js';
import { createProductionTools } from './tools/production-tools.js';
import { createGeneralTools } from './tools/general-tools.js';

const server = new Server(
  {
    name: 'fedsimulator-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize database and tools
let db: any;
let allTools: Map<string, any> = new Map();

async function initializeServer() {
  console.log(chalk.blue('🏟️  Initializing Fed Simulator MCP Server...'));
  
  try {
    // Initialize database
    db = await initializeDatabase();
    console.log(chalk.green('✅ Database initialized'));
    
    // Create tool categories
    const wrestlerTools = createWrestlerTools(db);
    const brandTools = createBrandTools(db);
    const productionTools = createProductionTools(db);
    const generalTools = createGeneralTools(db);
    
    // Combine all tools
    for (const [key, value] of wrestlerTools) {
      allTools.set(key, value);
    }
    for (const [key, value] of brandTools) {
      allTools.set(key, value);
    }
    for (const [key, value] of productionTools) {
      allTools.set(key, value);
    }
    for (const [key, value] of generalTools) {
      allTools.set(key, value);
    }
    
    console.log(chalk.green(`✅ Loaded ${allTools.size} tools`));
    console.log(chalk.blue('🚀 Fed Simulator MCP Server ready!'));
    
    // Log available tools
    console.log(chalk.yellow('\n📋 Available tools:'));
    for (const [name, tool] of allTools) {
      console.log(chalk.gray(`  • ${name}: ${tool.description}`));
    }
    console.log('');
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize server:'), error);
    process.exit(1);
  }
}

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Array.from(allTools.values()).map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
  
  return { tools };
});

// Handle tool execution
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
    console.log(chalk.cyan(`🔧 Executing: ${name}`));
    console.log(chalk.gray(`   Args: ${JSON.stringify(args, null, 2)}`));
    
    const result = await tool.handler(args);
    
    console.log(chalk.green(`✅ ${name} completed successfully`));
    
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error(chalk.red(`❌ Error executing ${name}:`), error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to execute ${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Start the server
async function main() {
  await initializeServer();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.log(chalk.green('Fed Simulator MCP Server running on stdio'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: Error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export default server;