import { spawn } from 'child_process';

// Simulate MCP JSON-RPC calls
const mcpCalls = [
  // Initialize
  '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}',
  
  // Create active wrestlers
  '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_wrestler","arguments":{"name":"John Cena","active":true,"points":90}},"id":2}',
  '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_wrestler","arguments":{"name":"Roman Reigns","active":true,"points":85}},"id":3}',
  '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_wrestler","arguments":{"name":"Inactive Guy","active":false,"points":50}},"id":4}',
  
  // Create production
  '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_production","arguments":{"name":"Monday Night Raw"}},"id":5}',
];

async function testSegmentCreation() {
  console.log('🏟️ Testing Fed Simulator MCP - Random Segment Creation');
  console.log('=' .repeat(60));
  
  const server = spawn('node', ['/Users/aaronlote/Sites/fedsimulator-mcp/dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let output = '';
  let productionId = null;
  
  server.stdout.on('data', (data) => {
    output += data.toString();
    
    // Parse responses to get production ID
    const responses = output.split('\n').filter(line => line.trim());
    for (const response of responses) {
      if (response.trim()) {
        try {
          const parsed = JSON.parse(response);
          if (parsed.result?.content?.[0]?.text?.includes('Production')) {
            const match = parsed.result.content[0].text.match(/"id":\s*(\d+)/);
            if (match) {
              productionId = parseInt(match[1]);
              console.log(`📺 Production created with ID: ${productionId}`);
            }
          }
        } catch (e) {
          // Ignore parse errors for partial responses
        }
      }
    }
  });
  
  server.stderr.on('data', (data) => {
    console.error('Server stderr:', data.toString());
  });
  
  // Send initial calls
  for (const call of mcpCalls) {
    server.stdin.write(call + '\n');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Wait for production ID
  await new Promise(resolve => {
    const checkId = setInterval(() => {
      if (productionId) {
        clearInterval(checkId);
        resolve();
      }
    }, 100);
    
    setTimeout(() => {
      clearInterval(checkId);
      resolve();
    }, 5000);
  });
  
  if (!productionId) {
    console.log('❌ Failed to get production ID');
    server.kill();
    return;
  }
  
  // Now test the random segment creation
  const segmentCall = `{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_random_segment","arguments":{"productionId":${productionId},"segmentType":"OPENING","minPoints":30}},"id":6}`;
  
  console.log('🎬 Creating random segment...');
  server.stdin.write(segmentCall + '\n');
  
  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  server.kill();
  
  // Parse final output
  const responses = output.split('\n').filter(line => line.trim());
  let segmentSuccess = false;
  
  for (const response of responses) {
    if (response.trim()) {
      try {
        const parsed = JSON.parse(response);
        if (parsed.id === 6) {
          if (parsed.result?.content?.[0]?.text) {
            console.log('🎯 Segment creation result:');
            console.log(parsed.result.content[0].text);
            if (!parsed.result.content[0].text.includes('Error')) {
              segmentSuccess = true;
            }
          } else if (parsed.error) {
            console.log('❌ Segment creation error:', parsed.error.message);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
  
  console.log('=' .repeat(60));
  if (segmentSuccess) {
    console.log('✅ Random segment creation test PASSED');
  } else {
    console.log('❌ Random segment creation test FAILED');
    console.log('Full output for debugging:');
    console.log(output);
  }
}

testSegmentCreation().catch(console.error);