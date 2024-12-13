const pool = require('./db'); // Import the database connection

const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');

    // Enable the pgcrypto extension for UUID generation
    const enablePgCrypto = `
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `;

    // SQL to create tables without foreign keys
    const createMenuItemsTable = `
      CREATE TABLE IF NOT EXISTS menu_item (
        id SERIAL PRIMARY KEY,
        food_id UUID DEFAULT gen_random_uuid() NOT NULL,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255),
        price INT NOT NULL,
        image_url VARCHAR(255)
      );
    `;

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id UUID DEFAULT gen_random_uuid() NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `;

    const createCartTable = `
      CREATE TABLE IF NOT EXISTS cart (
        cart_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        food_id UUID NOT NULL,
        quantity INT NOT NULL,
        price INT NOT NULL
      );
    `;

    // Execute SQL
    await pool.query(enablePgCrypto);
    console.log('pgcrypto extension enabled.');

    await pool.query(createMenuItemsTable);
    console.log('Menu items table created.');

    await pool.query(createUsersTable);
    console.log('Users table created.');

    await pool.query(createCartTable);
    console.log('Cart table created.');

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error.message);
  }
};

module.exports = initializeDatabase;