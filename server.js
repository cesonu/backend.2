const express = require("express");
const { v4: uuidv4 } = require("uuid"); // For generating random IDs
const pool = require("./config/db"); // Import PostgreSQL connection from config
const bodyParser = require('body-parser');
const corsOptions = require("./config/corsOptions");
const initializeDatabase = require("./config/db_init"); // Import the initialization function
const bcrypt = require('bcrypt'); // Ensure bcrypt is imported

const app = express();
app.use(bodyParser.json());
app.use(express.json()); // Middleware for parsing JSON requests
app.use(corsOptions)
app.use('/uploads', express.static('public/uploads'));

initializeDatabase(); // Initialize database

// Middleware to validate UUID
const validateUUID = (req, res, next) => {
  const { user_id } = req.params;
  if (user_id && !/^[0-9a-fA-F-]{36}$/.test(user_id)) {
    return res.status(400).json({ message: "Invalid user_id format." });
  }
  next();
};

// CRUD for Categories
// Create a new category
app.post("/categories", async (req, res) => {
  const { name, image_url } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: "Category name is required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO categories (category_id, name, image_url) VALUES (gen_random_uuid(), $1, $2) RETURNING *",
      [name, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: "Category already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Read all categories
app.get("/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories");
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read a specific category by ID
app.get("/categories/:category_id", async (req, res) => {
  const { category_id } = req.params;
  
  try {
    const result = await pool.query(
      "SELECT * FROM categories WHERE category_id = $1",
      [category_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a category
app.put("/categories/:category_id", async (req, res) => {
  const { category_id } = req.params;
  const { name, image_url } = req.body;
  
  if (!name && !image_url) {
    return res.status(400).json({ message: "At least one field to update is required" });
  }

  try {
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updateFields.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (image_url) {
      updateFields.push(`image_url = $${paramCount}`);
      values.push(image_url);
      paramCount++;
    }

    values.push(category_id);

    const result = await pool.query(
      `UPDATE categories SET ${updateFields.join(', ')} WHERE category_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: "Category name must be unique" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete a category
app.delete("/categories/:category_id", async (req, res) => {
  const { category_id } = req.params;

  try {
    // First, check if the category is used in any menu items
    const menuItemCheck = await pool.query(
      "SELECT COUNT(*) FROM menu_item WHERE category_id = $1",
      [category_id]
    );

    if (parseInt(menuItemCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: "Cannot delete category with associated menu items" 
      });
    }

    const result = await pool.query(
      "DELETE FROM categories WHERE category_id = $1 RETURNING *",
      [category_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ 
      message: "Category deleted successfully", 
      category: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD for Menu Items
// Create a new menu item
app.post("/menu-items", async (req, res) => {
  const { 
    name, 
    price, 
    image_url, 
    category_id, 
    customizations, 
    nutrition 
  } = req.body;
  
  if (!name || !price || !category_id) {
    return res.status(400).json({ message: "Name, price, and category are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO menu_item (
        food_id, 
        name, 
        price, 
        image_url, 
        category_id, 
        customizations, 
        nutrition
      ) VALUES (
        gen_random_uuid(), 
        $1, $2, $3, $4, $5, $6
      ) RETURNING *`,
      [
        name, 
        price, 
        image_url, 
        category_id, 
        customizations || null, 
        nutrition || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ message: "Invalid category" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Read all menu items
app.get("/menu-items", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        mi.*,
        c.name AS category_name
      FROM 
        menu_item mi
      JOIN 
        categories c ON mi.category_id = c.category_id
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read menu items by category
app.get("/menu-items/category/:category_id", async (req, res) => {
  const { category_id } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT 
        mi.*, 
        c.name AS category_name, 
        c.image_url AS category_image
      FROM menu_item mi
      JOIN categories c ON mi.category_id = c.category_id
      WHERE mi.category_id = $1`,
      [category_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No items found in this category" });
    }
    
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read a specific menu item by ID
app.get("/menu-items/:food_id", async (req, res) => {
  const { food_id } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT 
        mi.*, 
        c.name AS category_name, 
        c.image_url AS category_image
      FROM menu_item mi
      JOIN categories c ON mi.category_id = c.category_id
      WHERE mi.food_id = $1`,
      [food_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a menu item
app.put("/menu-items/:food_id", async (req, res) => {
  const { food_id } = req.params;
  const { 
    name, 
    price, 
    image_url, 
    category_id, 
    customizations, 
    nutrition 
  } = req.body;
  
  if (!name && !price && !image_url && !category_id && !customizations && !nutrition) {
    return res.status(400).json({ message: "At least one field to update is required" });
  }

  try {
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updateFields.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (price) {
      updateFields.push(`price = $${paramCount}`);
      values.push(price);
      paramCount++;
    }

    if (image_url) {
      updateFields.push(`image_url = $${paramCount}`);
      values.push(image_url);
      paramCount++;
    }

    if (category_id) {
      updateFields.push(`category_id = $${paramCount}`);
      values.push(category_id);
      paramCount++;
    }

    if (customizations) {
      updateFields.push(`customizations = $${paramCount}`);
      values.push(customizations);
      paramCount++;
    }

    if (nutrition) {
      updateFields.push(`nutrition = $${paramCount}`);
      values.push(nutrition);
      paramCount++;
    }

    values.push(food_id);

    const result = await pool.query(
      `UPDATE menu_item 
       SET ${updateFields.join(', ')} 
       WHERE food_id = $${paramCount} 
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ message: "Invalid category" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete a menu item
app.delete("/menu-items/:food_id", async (req, res) => {
  const { food_id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM menu_item WHERE food_id = $1 RETURNING *",
      [food_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.status(200).json({ 
      message: "Menu item deleted successfully", 
      menu_item: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD for Users
// Signup Route
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }
  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'User already exists with this email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (user_id, name, email, password) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *",
      [name, email, hashedPassword]
    );
    res.status(201).json({ message: "User registered successfully", user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/profile/:user_id', async (req, res) => {
  const { user_id } = req.params;
  console.log('Received user_id:', user_id);
  try {
    if (!/^[0-9a-fA-F-]{36}$/.test(user_id)) {
      return res.status(400).json({ message: 'Invalid user_id format.' });
    }

    const result = await pool.query(
      'SELECT name, email, preferences FROM users WHERE user_id = $1',
      [user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/profile/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const { name, email, preferences } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required.' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2, preferences = $3 WHERE user_id = $4 RETURNING name, email, preferences',
      [name, email, preferences || null, user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Explicitly return user_id
    res.status(200).json({ 
      message: 'Login successful.', 
      user_id: user.user_id,  // Add this line
      user: { 
        user_id: user.user_id, 
        name: user.name, 
        email: user.email 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD for Cart
// Add item to cart
app.post("/cart", async (req, res) => {
  const { user_id, food_id, quantity, price } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO cart (cart_id, user_id, food_id, quantity, price) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING *",
      [user_id, food_id, quantity, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read cart by user_id with menu item details
app.get("/cart/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        c.cart_id, 
        c.quantity, 
        c.price, 
        m.name, 
        m.image_url, 
        m.food_id
      FROM cart c 
      JOIN menu_item m ON c.food_id = m.food_id 
      WHERE c.user_id = $1
    `, [user_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update cart item by cart_id
app.put("/cart/:cart_id", async (req, res) => {
  const { cart_id } = req.params;
  const { quantity, price } = req.body;
  try {
    const result = await pool.query(
      "UPDATE cart SET quantity = $1, price = $2 WHERE cart_id = $3 RETURNING *",
      [quantity, price, cart_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Cart item not found" });
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete cart item by cart_id
app.delete("/cart/:cart_id", async (req, res) => {
  const { cart_id } = req.params;
  try {
    const result = await pool.query("DELETE FROM cart WHERE cart_id = $1 RETURNING *", [cart_id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Cart item not found" });
    res.status(200).json({ message: "Cart item deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch all menu items with customizations and nutritional info
app.get("/menu-items", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM menu_item");
    const menuItems = result.rows.map((item) => ({
      ...item,
      customizations: item.customizations ? JSON.parse(item.customizations) : [],
      nutrition: item.nutrition ? JSON.parse(item.nutrition) : {}
    }));
    res.status(200).json(menuItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post("/cart", async (req, res) => {
  const { user_id, food_id, quantity, price } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO cart (cart_id, user_id, food_id, quantity, price) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING *",
      [user_id, food_id, quantity, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/cart/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      "SELECT c.cart_id, c.quantity, c.price, m.name, m.image_url FROM cart c JOIN menu_item m ON c.food_id = m.food_id WHERE c.user_id = $1",
      [user_id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/orders", async (req, res) => {
  const { user_id, total_price, items } = req.body;

  try {
    // Create an order
    const orderResult = await pool.query(
      "INSERT INTO orders (order_id, user_id, total_price, order_status) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING order_id",
      [user_id, total_price, 'Preparing']
    );
    const orderId = orderResult.rows[0].order_id;

    // Insert order items
    const orderItemsQuery = `
      INSERT INTO order_items (order_id, food_id, quantity, price)
      VALUES ($1, $2, $3, $4)
    `;
    for (const item of items) {
      await pool.query(orderItemsQuery, [
        orderId,
        item.food_id,
        item.quantity,
        item.price,
      ]);
    }

    // Add loyalty points
    const pointsToAdd = Math.floor(total_price); // 1 point per $1
    await pool.query(
      "UPDATE users SET loyalty_points = loyalty_points + $1 WHERE user_id = $2",
      [pointsToAdd, user_id]
    );
    // Clear the cart after placing the order
    await pool.query("DELETE FROM cart WHERE user_id = $1", [user_id]);

    res.status(201).json({ message: "Order placed successfully", orderId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//endpooint to update order status
app.put("/orders/:order_id/status", async (req, res) => {
  const { order_id } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      "UPDATE orders SET order_status = $1 WHERE order_id = $2 RETURNING *",
      [status, order_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//endpoint to fetch order status
app.get("/orders/:order_id/status", async (req, res) => {
  const { order_id } = req.params;

  try {
    const result = await pool.query(
      "SELECT order_status FROM orders WHERE order_id = $1",
      [order_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//add points after each order
app.post("/orders", async (req, res) => {
  const { user_id, total_price, items } = req.body;

  try {
    // Create an order
    const orderResult = await pool.query(
      "INSERT INTO orders (order_id, user_id, total_price, order_status) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING order_id",
      [user_id, total_price, 'Preparing']
    );
    const orderId = orderResult.rows[0].order_id;

    // Insert order items
    const orderItemsQuery = `
      INSERT INTO order_items (order_id, food_id, quantity, price)
      VALUES ($1, $2, $3, $4)
    `;
    for (const item of items) {
      await pool.query(orderItemsQuery, [
        orderId,
        item.food_id,
        item.quantity,
        item.price,
      ]);
    }

    // Add loyalty points
    const pointsToAdd = Math.floor(total_price); // 1 point per $1
    await pool.query(
      "UPDATE users SET loyalty_points = loyalty_points + $1 WHERE user_id = $2",
      [pointsToAdd, user_id]
    );

    res.status(201).json({ message: "Order placed successfully", orderId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//endpoint to redeem points
app.post("/users/:user_id/redeem", async (req, res) => {
  const { user_id } = req.params;
  const { points } = req.body;

  try {
    const userResult = await pool.query("SELECT loyalty_points FROM users WHERE user_id = $1", [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentPoints = userResult.rows[0].loyalty_points;
    if (currentPoints < points) {
      return res.status(400).json({ message: "Insufficient loyalty points." });
    }

    // Deduct points
    await pool.query(
      "UPDATE users SET loyalty_points = loyalty_points - $1 WHERE user_id = $2",
      [points, user_id]
    );

    res.status(200).json({ message: "Points redeemed successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

