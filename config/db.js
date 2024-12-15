require('dotenv').config();

const pkg = require('pg');
 
console.log('Environment Variables:', {
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
  DB_DATABASE: process.env.DB_DATABASE,
  DB_PORT: process.env.DB_PORT,
  DB_SSL: process.env.DB_SSL,
}); // Debug loaded environment variables

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true' 
    ? { rejectUnauthorized: false } 
    : false,
});

pool.connect()
  .then(() => console.log('Connected to the database successfully'))
  .catch(err => console.error('Database connection error:', err.message));

module.exports = pool;
