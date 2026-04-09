const amqp = require("amqplib");
const { createClient } = require("redis");
const express = require("express");

const app = express();
app.use(express.json());

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://admin:admin@rabbitmq:5672";
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const QUEUE = "orders_queue";

// ── Cliente Redis ──────────────────────────────────────
const redisClient = createClient({ url: REDIS_URL });

redisClient.on("error", err => console.error("Redis error:", err));

async function connectRedis() {
  let connected = false;
  while (!connected) {
    try {
      await redisClient.connect();
      connected = true;
      console.log("✅ Conectado a Redis");
    } catch (err) {
      console.log("⏳ Esperando Redis...");
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// ── Consumidor RabbitMQ ────────────────────────────────
async function connectRabbitMQ() {
  let connected = false;
  while (!connected) {
    try {
      const conn = await amqp.connect(RABBITMQ_URL);
      const channel = await conn.createChannel();
      await channel.assertQueue(QUEUE, { durable: true });

      console.log("✅ Conectado a RabbitMQ, esperando mensajes...");
      connected = true;

      channel.consume(QUEUE, async (msg) => {
        if (!msg) return;

        const data = JSON.parse(msg.content.toString());
        console.log("📩 Orden recibida:", data);

        // Guardar notificación en Redis
        const notificacion = {
          order_id: data.order_id,
          total: data.total,
          items: data.items,
          fecha: new Date().toISOString(),
          estado: "procesada",
        };

        await redisClient.lPush(
          "notifications",
          JSON.stringify(notificacion)
        );

        console.log(`✅ Notificación guardada en Redis para orden ${data.order_id}`);
        channel.ack(msg);
      });

    } catch (err) {
      console.log("⏳ Esperando RabbitMQ...", err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// ── Endpoint para ver notificaciones guardadas ─────────
app.get("/notifications", async (req, res) => {
  try {
    const items = await redisClient.lRange("notifications", 0, -1);
    const parsed = items.map(i => JSON.parse(i));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Error leyendo notificaciones" });
  }
});

app.get("/", (req, res) => {
  res.json({ message: "Notification Service corriendo ✅" });
});

// ── Arranque ───────────────────────────────────────────
async function start() {
  await connectRedis();
  await connectRabbitMQ();
  app.listen(7000, () => {
    console.log("🚀 Notification Service en puerto 7000");
  });
}

start();