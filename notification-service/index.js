const amqp = require("amqplib");
const { createClient } = require("redis");
const express = require("express");

const app = express();
app.use(express.json());

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://admin:admin@rabbitmq:5672";
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

const EXCHANGE = "orders.exchange";
const EXCHANGE_TYPE = "direct";
const QUEUE = "orders.notifications.queue";
const ROUTING_KEY = "order.created";

const DEDUP_TTL_SECONDS = 60 * 60 * 24; // 24 horas

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

// ── Procesar mensaje (con dedup en Redis) ──────────────
async function handleOrderCreated(data) {
  const orderId = data.orderId ?? data.order_id;
  if (orderId == null) {
    console.warn("⚠️  Mensaje sin orderId, descartado:", data);
    return;
  }

  const dedupKey = `notif:${orderId}`;

  // SET NX EX: solo se inserta si la clave no existe.
  // Devuelve "OK" la primera vez y null si ya existía.
  const result = await redisClient.set(dedupKey, "1", {
    NX: true,
    EX: DEDUP_TTL_SECONDS,
  });

  if (result !== "OK") {
    console.log(`⏭️  Notificación duplicada para orden ${orderId}, omitida.`);
    return;
  }

  console.log("📩 Nueva notificación de orden:");
  console.log({
    orderId,
    userId: data.userId ?? null,
    total: data.total,
    items: data.items,
    status: data.status,
    sentAt: new Date().toISOString(),
  });
}

// ── Consumidor RabbitMQ con reconexión ─────────────────
async function startConsumer() {
  let connected = false;
  while (!connected) {
    try {
      const conn = await amqp.connect(RABBITMQ_URL);

      conn.on("error", (err) =>
        console.error("⚠️  RabbitMQ connection error:", err.message)
      );
      conn.on("close", () => {
        console.warn("⚠️  RabbitMQ cerrado. Reintentando consumer en 5s...");
        setTimeout(() => startConsumer().catch(() => {}), 5000);
      });

      const channel = await conn.createChannel();
      await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });
      await channel.assertQueue(QUEUE, { durable: true });
      await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
      await channel.prefetch(10);

      console.log(
        `✅ Consumer escuchando ${QUEUE} (exchange=${EXCHANGE}, key=${ROUTING_KEY})`
      );
      connected = true;

      channel.consume(QUEUE, async (msg) => {
        if (!msg) return;
        try {
          const data = JSON.parse(msg.content.toString());
          await handleOrderCreated(data);
          channel.ack(msg);
        } catch (err) {
          console.error("❌ Error procesando mensaje:", err.message);
          // requeue=false → evita loop infinito si el mensaje está malformado
          channel.nack(msg, false, false);
        }
      });
    } catch (err) {
      console.log("⏳ Esperando RabbitMQ...", err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// ── Healthcheck ────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Notification Service corriendo ✅" });
});

// ── Arranque ───────────────────────────────────────────
async function start() {
  await connectRedis();
  await startConsumer();
  app.listen(7000, () => {
    console.log("🚀 Notification Service en puerto 7000");
  });
}

start();
