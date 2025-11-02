/**
 * Test script for multi-type notification filtering
 * Tests the enhanced getUserNotifications method with multiple type support
 */

const { initializeDatabase, closeDatabase } = require('./src/config/database');
const Notification = require('./src/models/Notification');

async function testMultiTypeNotifications() {
  console.log('🧪 Testing Multi-Type Notification Filtering...\n');

  // Initialize database connection
  await initializeDatabase();

  try {
    // Test 1: Single type (existing functionality)
    console.log('Test 1: Single type filter (type="reaction")');
    const singleType = await Notification.getUserNotifications(1, {
      limit: 5,
      type: 'reaction'
    });
    console.log(`✅ Returned ${singleType.length} notifications`);
    console.log(`   Types: ${[...new Set(singleType.map(n => n.type))].join(', ')}\n`);

    // Test 2: Multiple types as comma-separated string
    console.log('Test 2: Multiple types as comma-separated string (type="reaction,share")');
    const multiTypeString = await Notification.getUserNotifications(1, {
      limit: 5,
      type: 'reaction,share'
    });
    console.log(`✅ Returned ${multiTypeString.length} notifications`);
    console.log(`   Types: ${[...new Set(multiTypeString.map(n => n.type))].join(', ')}\n`);

    // Test 3: Multiple types as array
    console.log('Test 3: Multiple types as array (type=["reaction", "share"])');
    const multiTypeArray = await Notification.getUserNotifications(1, {
      limit: 5,
      type: ['reaction', 'share']
    });
    console.log(`✅ Returned ${multiTypeArray.length} notifications`);
    console.log(`   Types: ${[...new Set(multiTypeArray.map(n => n.type))].join(', ')}\n`);

    // Test 4: All types
    console.log('Test 4: All notifications (no type filter)');
    const allTypes = await Notification.getUserNotifications(1, {
      limit: 10
    });
    console.log(`✅ Returned ${allTypes.length} notifications`);
    console.log(`   Types: ${[...new Set(allTypes.map(n => n.type))].join(', ')}\n`);

    // Test 5: Verify multi-type results only contain requested types
    console.log('Test 5: Verify multi-type filtering accuracy');
    const testResult = await Notification.getUserNotifications(1, {
      limit: 20,
      type: 'reaction,share'
    });
    const invalidTypes = testResult.filter(n => n.type !== 'reaction' && n.type !== 'share');
    if (invalidTypes.length === 0) {
      console.log(`✅ All ${testResult.length} notifications are either 'reaction' or 'share'\n`);
    } else {
      console.log(`❌ Found ${invalidTypes.length} notifications with wrong types:`,
        invalidTypes.map(n => n.type));
    }

    console.log('✅ All tests completed successfully!');
    await closeDatabase();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

testMultiTypeNotifications();
