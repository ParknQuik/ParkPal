const { Client } = require('pg');

const client = new Client({
  host: '172.17.0.3',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'parknquik',
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to Docker container PostgreSQL');
    const res = await client.query('SELECT version();');
    console.log('PostgreSQL version:', res.rows[0].version);
    const res2 = await client.query('SELECT current_database(), current_user;');
    console.log('DB and user:', res2.rows[0]);
    const res3 = await client.query('SELECT count(*) FROM users;');
    console.log('Count:', res3.rows[0].count);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Code:', error.code);
  } finally {
    await client.end();
  }
}

main();