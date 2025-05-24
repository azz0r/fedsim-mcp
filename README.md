# Fed Simulator MCP Server

A Model Context Protocol (MCP) server that provides command-line access to Fed Simulator X database actions. This allows you to manage wrestlers, brands, productions, and more through CLI tools and AI assistants.

## Features

- **Wrestler Management**: Create, update, boost/penalize wrestlers, search roster
- **Brand Operations**: Manage wrestling brands, finances, and roster assignments  
- **Production Tools**: Create and simulate wrestling shows with automatic revenue calculation
- **Database Utilities**: Search, backup, reset, and query any data table
- **Rich Logging**: Detailed output showing exactly what each operation does
- **Type Safety**: Full TypeScript support with proper error handling

## Installation

```bash
cd ~/Sites/fedsimulator-mcp
npm install
npm run build
```

## Usage

### As MCP Server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "fedsimulator": {
      "command": "node",
      "args": ["/Users/aaronlote/Sites/fedsimulator-mcp/dist/index.js"]
    }
  }
}
```

### Direct Usage

```bash
npm start
```

## Available Tools

### Wrestler Tools

- `create_wrestler` - Create new wrestlers with custom stats
- `boost_wrestler` - Improve wrestler's morale, popularity, charisma
- `penalize_wrestler` - Reduce wrestler stats for disciplinary actions  
- `search_wrestlers` - Find wrestlers by name, alignment, brand
- `get_wrestler_stats` - Get detailed wrestler information
- `list_wrestlers` - List all wrestlers
- `update_wrestler` - Update wrestler information
- `delete_wrestler` - Remove wrestler permanently

### Brand Tools

- `create_brand` - Create new wrestling brands
- `list_brands` - List all brands
- `update_brand_balance` - Credit/debit brand finances
- `get_brand_roster` - View all wrestlers on a brand with stats
- `get_brand_financials` - Financial overview and recent show profits
- `assign_wrestler_to_brand` - Move wrestlers between brands
- `update_brand` - Update brand information
- `delete_brand` - Remove brand permanently

### Production Tools

- `create_production` - Create new wrestling shows
- `simulate_production` - Run show simulation to generate ratings/revenue
- `get_production_report` - Detailed show analysis with financials
- `list_productions` - Recent show history
- `update_production` - Modify show details
- `delete_production` - Remove show permanently

### General Tools

- `get_database_stats` - Overview of all data tables
- `search_database` - Search any table by name
- `backup_data` - Export database tables
- `reset_database` - Clear tables (use with caution!)
- `query_table` - Custom queries with filtering/pagination
- `count_records` - Count records in any table

## Example Usage

### Create a New Wrestler

```bash
# Through MCP client
create_wrestler {
  "name": "Stone Cold Steve Austin", 
  "alignment": "FACE",
  "height": 188,
  "weight": 252,
  "billedFrom": "Victoria, Texas",
  "finisher": "Stone Cold Stunner",
  "points": 95
}
```

### Simulate a Wrestling Show

```bash
# Create production
create_production {
  "name": "Monday Night Raw",
  "date": "2024-01-15T20:00:00Z",
  "brandIds": [1]
}

# Simulate the show
simulate_production {"id": 1}

# Get detailed report
get_production_report {"id": 1}
```

### Search and Manage Roster

```bash
# Find all face wrestlers
search_wrestlers {"alignment": "FACE", "limit": 10}

# Boost a wrestler's stats
boost_wrestler {"id": 5}

# Get brand roster with stats
get_brand_roster {"id": 1}
```

## Database Schema

The MCP server uses the same database schema as Fed Simulator X:

- **Wrestlers**: Stats, contracts, alignments, records
- **Brands**: Rosters, finances, management
- **Productions**: Shows, segments, revenues
- **Championships**: Titles and reigns
- **Venues**: Locations and capacities
- **And more...**

## Logging

Every action provides detailed logging:

```
✅ [14:23:45.123] Create Wrestler
   Details: {"name": "John Cena", "alignment": "FACE"}
   Result: {"id": 42, "name": "John Cena", "points": 85}

ℹ️ [14:23:46.456] Boost Wrestler  
   Details: {"id": 42}
   Result: {"morale": 85, "popularity": 90, "charisma": 88}
```

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Test
npm test
```

## Architecture

- **TypeScript**: Full type safety and modern JS features
- **Dexie + fake-indexeddb**: Browser IndexedDB compatibility in Node.js
- **MCP SDK**: Standard Model Context Protocol implementation
- **Chalk**: Rich console output with colors
- **Action Wrappers**: Automatic logging and error handling for all operations

## Integration

This MCP server makes Fed Simulator's database actions available to:

- AI assistants (Claude, GPT, etc.)
- CLI tools and scripts
- Automation workflows
- Custom applications
- Any MCP-compatible client

Perfect for automating booking workflows, generating reports, or scripting complex wrestling scenarios!