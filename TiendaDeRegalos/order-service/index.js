const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total INTEGER
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER,
        cantidad INTEGER,
        precio_unitario INTEGER
      );
    `);
    console.log("Tablas de orders listas");
  } catch (error) {
    console.error("Error creando tablas:", error.message);
  }
}

initDB();

app.post("/orders", async (req, res) => {
  const { items } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: "No hay items en la orden" });
  }
  try {
    const total = items.reduce((sum, item) => sum + item.precio_unitario * item.cantidad, 0);
    const orderResult = await pool.query(
      "INSERT INTO orders (total) VALUES ($1) RETURNING *", [total]
    );
    const order = orderResult.rows[0];
    for (let item of items) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.cantidad, item.precio_unitario]
      );
    }
    res.status(201).json({ message: "Orden creada", order_id: order.id, total });
  } catch (error) {
    console.error("Error POST orders:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const orders = await pool.query("SELECT * FROM orders");
    const items = await pool.query("SELECT * FROM order_items");
    res.json({ orders: orders.rows, items: items.rows });
  } catch (error) {
    console.error("Error GET orders:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;