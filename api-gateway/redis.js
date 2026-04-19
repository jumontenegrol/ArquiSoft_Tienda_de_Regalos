const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

const client = createClient({ url: REDIS_URL });
client.on("error", (err) => console.error("Redis (gateway) error:", err.message));

let connected = false;

async function connect() {
  if (connected) return client;
  await client.connect();
  connected = true;
  console.log("✅ Gateway conectado a Redis");
  return client;
}

module.exports = { client, connect };
