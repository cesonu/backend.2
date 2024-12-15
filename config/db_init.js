const pool = require('./db'); // Import the database connection

const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');

    // Enable the pgcrypto extension for UUID generation
    const enablePgCrypto = `
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `;

    // Create Categories Table
    const createCategoriesTable = `
      CREATE TABLE IF NOT EXISTS categories (
        category_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        image_url VARCHAR(255)
      );
    `;

    // SQL to create menu items table
    const createMenuItemsTable = `
      CREATE TABLE IF NOT EXISTS menu_item (
        id SERIAL PRIMARY KEY,
        food_id UUID DEFAULT gen_random_uuid() NOT NULL,
        name VARCHAR(100) NOT NULL,
        price INT NOT NULL,
        image_url VARCHAR(255),
        category_id UUID REFERENCES categories(category_id),
        customizations VARCHAR(255),
        nutrition VARCHAR(255),
        CONSTRAINT unique_menu_item_name UNIQUE (name)
      );
    `;

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id UUID DEFAULT gen_random_uuid() NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        preferences TEXT DEFAULT NULL
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

    await pool.query(createCategoriesTable);
    console.log('Categories table created.');

    await pool.query(createMenuItemsTable);
    console.log('Menu items table created.');

    await pool.query(createUsersTable);
    console.log('Users table created.');

    await pool.query(createCartTable);
    console.log('Cart table created.');

    // Insert a default user with a hashed password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const insertUser = `
      INSERT INTO users (name, email, password) VALUES 
      ('John Doe', 'john@example.com', $1)
      ON CONFLICT (email) DO NOTHING;
    `;
    await pool.query(insertUser, [hashedPassword]);
    console.log('Default user inserted.')

    // Insert default categories
    const insertCategories = `
      INSERT INTO categories (name, image_url) VALUES 
      ('salad', 'salad.png'),
      ('rolls', 'rolls.png'),
      ('deserts', 'deserts.png'),
      ('sandwich', 'sandwich.png'),
      ('cake', 'cake.png'),
      ('pure veg', 'pure_veg.png'),
      ('pasta', 'pasta.png'),
      ('noodles', 'noodles.png')
      ON CONFLICT (name) DO NOTHING;
    `;

    await pool.query(insertCategories);
    console.log('Default categories inserted.');

    // Insert 8 menu items across different categories
    const insertMenuItems = `
      WITH category_ids AS (
        SELECT category_id, name FROM categories
      )
      INSERT INTO menu_item (name, price, image_url, category_id, customizations, nutrition) 
      VALUES 
      ('Attieke', 10, 'attieke.jpg', (SELECT category_id FROM category_ids WHERE name = 'salad'), 'Extra Sauce,No Onions', '250 cal'),
      ('Banane Plantain', 8, 'banane-plantain.jpeg', (SELECT category_id FROM category_ids WHERE name = 'pure veg'), 'Spicy Sauce,No Sauce', '200 cal'),
      ('Foufou Sauce Kokotcha', 12, 'foufou_sauce_kokotcha.jpg', (SELECT category_id FROM category_ids WHERE name = 'noodles'), 'Extra Meat,Vegetarian', '300 cal'),
      ('Pizza Royale', 15, 'pizza-royale.jpg', (SELECT category_id FROM category_ids WHERE name = 'sandwich'), 'Extra Cheese,No Olives', '450 cal'),
      ('Poulet Roti Frites', 14, 'poulet-roti-frites.jpeg', (SELECT category_id FROM category_ids WHERE name = 'rolls'), 'Spicy Sauce,No Sauce', '500 cal'),
      ('Riz Carbonara Champignon', 13, 'riz_carbonara_champignon.jpg', (SELECT category_id FROM category_ids WHERE name = 'pasta'), 'No Cream,Extra Mushrooms', '400 cal'),
      ('Riz Sauce Nkumu Ofula', 11, 'riz_sauce_nkumu_ofula.webp', (SELECT category_id FROM category_ids WHERE name = 'deserts'), 'Extra Sauce,No Spice', '350 cal'),
      ('Spaghetti Bolognaise', 12, 'spaghetti-bolognaise.jpeg', (SELECT category_id FROM category_ids WHERE name = 'cake'), 'No Cheese,Extra Meat', '300 cal')
      ON CONFLICT (name) DO UPDATE SET 
        price = EXCLUDED.price, 
        image_url = EXCLUDED.image_url, 
        category_id = EXCLUDED.category_id, 
        customizations = EXCLUDED.customizations, 
        nutrition = EXCLUDED.nutrition;
    `;
    await pool.query(insertMenuItems);
    console.log('Default menu items inserted.');

  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = initializeDatabase;