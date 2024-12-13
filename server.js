const express = require("express");
const { v4: uuidv4 } = require("uuid"); // For generating random IDs
const pool = require("./config/db"); // Import PostgreSQL connection from config
const bodyParser = require('body-parser');
const cors = require("cors");
const initializeDatabase = require("./config/db_init"); // Import the initialization function
const bcrypt = require('bcrypt'); // Ensure bcrypt is imported

const app = express();
app.use(bodyParser.json());
app.use(express.json()); // Middleware for parsing JSON requests
app.use(cors('*'));

initializeDatabase(); // Initialize database

// CRUD for Menu Items
// Create
app.post("/menu-items", async (req, res) => {
  const { name, description, price, image_url } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO menu_item (food_id, name, description, price, image_url) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING *",
      [name, description, price, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read all menu items
app.get("/menu-items", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM menu_item");
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read menu item by food_id
app.get("/menu-items/:food_id", async (req, res) => {
  const { food_id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM menu_item WHERE food_id = $1", [food_id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Menu item not found" });
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update menu item by food_id
app.put("/menu-items/:food_id", async (req, res) => {
  const { food_id } = req.params;
  const { name, description, price, image_url } = req.body;
  try {
    const result = await pool.query(
      "UPDATE menu_item SET name = $1, description = $2, price = $3, image_url = $4 WHERE food_id = $5 RETURNING *",
      [name, description, price, image_url, food_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Menu item not found" });
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete menu item by food_id
app.delete("/menu-items/:food_id", async (req, res) => {
  const { food_id } = req.params;
  try {
    const result = await pool.query("DELETE FROM menu_item WHERE food_id = $1 RETURNING *", [food_id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Menu item not found" });
    res.status(200).json({ message: "Menu item deleted successfully" });
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

    res.status(200).json({ message: 'Login successful.', user: { user_id: user.user_id, name: user.name, email: user.email } });
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

// Read cart by user_id
app.get("/cart/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM cart WHERE user_id = $1", [user_id]);
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

// Start the server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});