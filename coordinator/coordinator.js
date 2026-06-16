const express = require("express");
const axios   = require("axios");

const app = express();
app.use(express.json());

let primary   = process.env.PRIMARY_URL   || "http://nginx-lb:80";
let secondary = process.env.SECONDARY_URL || "http://nginx-lb-spare:80";

const TIMEOUT_MS = 5000;

async function tryRequest(baseUrl, method, path, body, headers) {
  try {
    const res = await axios({
      method,
      url: `${baseUrl}${path}`,
      data: body,
      headers,
      timeout: TIMEOUT_MS,
      validateStatus: () => true,
    });
    return { ok: true, status: res.status, data: res.data, headers: res.headers };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

app.all("/{*splat}", async (req, res) => {

  if (req.path === "/coordinator/state") {
    return res.json({ primary, secondary });
  }

  const { method, path, body } = req;

  const forwardHeaders = { ...req.headers };
  delete forwardHeaders["host"];
  delete forwardHeaders["content-length"];

  const [primaryResult, secondaryResult] = await Promise.all([
    tryRequest(primary,   method, path, body, forwardHeaders),
    tryRequest(secondary, method, path, body, forwardHeaders),
  ]);

  // ── Caso 1: primario OK → respuesta normal
  if (primaryResult.ok) {
    res.set("X-Served-By", "primary");
    return res.status(primaryResult.status).json(primaryResult.data);
  }

  // ── Caso 2: primario falló, spare responde → failover
  if (secondaryResult.ok) {
    console.warn(
      `[COORDINATOR] Primario (${primary}) no disponible. ` +
      `Promoviendo spare (${secondary}) a primario.`
    );
    [primary, secondary] = [secondary, primary];

    res.set("X-Failover", "true");
    res.set("X-Now-Primary", primary);
    res.set("X-Served-By", "spare");
    return res.status(secondaryResult.status).json(secondaryResult.data);
  }

  // ── Caso 3: ambos fallaron
  console.error("[COORDINATOR] Ambos nodos no disponibles.");
  return res.status(502).json({ error: "Servicio no disponible (ambos nodos caidos)" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`[COORDINATOR] Escuchando en :${PORT} | primary=${primary} | secondary=${secondary}`)
);