/**
 * Seed database script
 * Run with: node seed.js
 */

require('dotenv').config();
const { seedDatabase } = require('./src/seeders/seedData');

async function runSeeder() {
  try {
    // Run the seeder (it will handle database connection)
    await seedDatabase();

    console.log('\n🎯 Seeding complete! You can now:');
    console.log('   • Visit http://localhost:3000 to see the frontend');
    console.log('   • Log in with any username (alice_wonder, bob_builder, etc.)');
    console.log('   • Use password: password123');
    console.log('   • Explore posts, comments, and reactions!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runSeeder();