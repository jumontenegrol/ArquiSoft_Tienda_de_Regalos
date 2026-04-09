const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// ── Pool: Vercel usa DATABASE_URL, local usa credenciales directas ──
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    })
  : new Pool({
      user: "admin",
      host: "orders-postgres",
      database: "ordersdb",
      password: "admin",
      port: 5432,
    });

// ── RabbitMQ: solo en local (Docker), ignorado en Vercel ──
const RABBITMQ_URL = process.env.RABBITMQ_URL || null;
const QUEUE = "orders_queue";
let rabbitChannel = null;

async function connectRabbitMQ() {
  if (!RABBITMQ_URL) {
    console.log("ℹ️ RabbitMQ no configurado (modo Vercel), se omite.");
    return;
  }
  try {
    const amqp = require("amqplib");
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();
    await channel.assertQueue(QUEUE, { durable: true });
    rabbitChannel = channel;
    console.log("✅ Conectado a RabbitMQ");
  } catch (err) {
    console.log("⚠️ RabbitMQ no disponible:", err.message);
  }
}

// ── Inicializar tablas ─────────────────────────────────
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
    console.log("✅ Tablas de orders listas");
  } catch (error) {
    console.error("Error creando tablas:", error.message);
  }
}

// ── Arranque (solo en local, no bloquea Vercel) ────────
if (!process.env.DATABASE_URL) {
  connectRabbitMQ().then(() => initDB());
}

// ── Crear orden ────────────────────────────────────────
app.post("/orders", async (req, res) => {
  const { items } = req.body;
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

    // ✅ Publicar en RabbitMQ solo si está disponible (local)
    if (rabbitChannel) {
      rabbitChannel.sendToQueue(
        QUEUE,
        Buffer.from(JSON.stringify({ order_id: order.id, total, items })),
        { persistent: true }
      );
      console.log(`📤 Orden ${order.id} publicada en RabbitMQ`);
    }

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