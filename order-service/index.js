const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { connect: connectRabbit, publishOrderCreated } = require("./rabbitmq");

const app = express();
app.use(cors());
app.use(express.json());

// ── Pool: Vercel usa DATABASE_URL, local usa credenciales directas ──
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      }
    : {
        host: process.env.DB_HOST || "orders-postgres",
        user: process.env.DB_USER || "admin",
        password: process.env.DB_PASSWORD || "admin",
        database: process.env.DB_NAME || "ordersdb",
        port: process.env.DB_PORT || 5432,
      }
);

// ── Esperar PostgreSQL ─────────────────────────────────
async function waitForDB() {
  let connected = false;
  while (!connected) {
    try {
      await pool.query("SELECT 1");
      connected = true;
      console.log("✅ Conectado a PostgreSQL (Orders)");
    } catch {
      console.log("⏳ Esperando PostgreSQL (Orders)...");
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// ── Inicializar tablas ─────────────────────────────────
async function initDB() {
  await waitForDB();
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

    console.log("✅ Tablas de orders listas");
  } catch (error) {
    console.error("Error creando tablas:", error.message);
  }
}

// ── Arranque (RabbitMQ + DB) ───────────────────────────
async function start() {
  if (process.env.RABBITMQ_URL) {
    connectRabbit().catch(() => {});
  } else {
    console.log("ℹ️  RabbitMQ no configurado (modo Vercel), se omite.");
  }
  await initDB();
}

start();

// ── Crear orden ────────────────────────────────────────
app.post("/orders", async (req, res) => {
  const { items, userId } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: "No hay items en la orden" });
  }
  try {
    await initDB();
    const total = items.reduce(
      (sum, item) => sum + item.precio_unitario * item.cantidad, 0
    );
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

    // ── Publicar evento order.created ──
    publishOrderCreated({
      orderId: order.id,
      userId: userId || null,
      total,
      items,
      status: "created",
    });

    res.status(201).json({ message: "Orden creada", order_id: order.id, total });
  } catch (error) {
    console.error("Error POST orders:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Obtener órdenes ────────────────────────────────────
app.get("/orders", async (req, res) => {
  try {
    await initDB();
    const orders = await pool.query("SELECT * FROM orders");
    const items = await pool.query("SELECT * FROM order_items");
    res.json({ orders: orders.rows, items: items.rows });
  } catch (error) {
    console.error("Error GET orders:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Order service listening on port ${PORT}`);
});
