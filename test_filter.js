import { db } from './dist/database/simple-db.js';

async function testFilter() {
  console.log('Testing filter method...');
  
  // Create test wrestlers
  const john = await db.Wrestler.add({
    name: 'John Cena',
    active: true,
    points: 90
  });
  
  const roman = await db.Wrestler.add({
    name: 'Roman Reigns', 
    active: true,
    points: 85
  });
  
  const inactive = await db.Wrestler.add({
    name: 'Inactive Guy',
    active: false,
    points: 50
  });
  
  console.log('Created wrestlers:', john, roman, inactive);
  
  // Test filter method
  try {
    const activeWrestlers = await db.Wrestler.filter(w => w.active).toArray();
    console.log('Active wrestlers:', activeWrestlers.length);
    console.log('Names:', activeWrestlers.map(w => w.name));
    
    if (activeWrestlers.length === 2 && activeWrestlers.every(w => w.active)) {
      console.log('✅ Filter method works!');
    } else {
      console.log('❌ Filter method failed');
    }
  } catch (error) {
    console.log('❌ Filter error:', error.message);
  }
}

testFilter().catch(console.error);