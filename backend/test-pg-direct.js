const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to database');
    const res = await client.query('SELECT COUNT(*) FROM users;');
    console.log('Count result:', res.rows[0].count);
    const res2 = await client.query("SELECT * FROM users WHERE email='juan@example.com';");
    console.log('User row:', res2.rows[0]);
  } catch (error) {
    console.error('PG Error:', error.message);
    console.error('PG Code:', error.code);
    console.error('PG Detail:', error.detail);
    console.error('Full:', error);
  } finally {
    await client.end();
  }
}

main();