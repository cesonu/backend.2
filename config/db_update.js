const pool = require('./db'); // Import the database connection

const updateDatabase = async () => {
  try {
    console.log('Updating database...');

    // Add the preferences column to the users table
    const addPreferencesColumn = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS preferences TEXT DEFAULT NULL;
    `;

    // Add nutritional information to menu_item table
    const addNutritionalInfoColumn = `
      ALTER TABLE menu_item 
      ADD COLUMN IF NOT EXISTS nutritional_info TEXT DEFAULT NULL;
    `;

    // Execute SQL updates
    await pool.query(addPreferencesColumn);
    console.log('Added preferences column to users table.');

    await pool.query(addNutritionalInfoColumn);
    console.log('Added nutritional_info column to menu_item table.');

    console.log('Database updated successfully!');
  } catch (error) {
    console.error('Error updating database:', error.message);
  }
};

module.exports = updateDatabase;
