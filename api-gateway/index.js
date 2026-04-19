const express = require("express");
const cors = require("cors");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors({
  origin: "http://localhost:3001", 
  credentials: true
}));
app.use(express.json());

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || "http://product-service:4000";
const ORDER_SERVICE_URL   = process.env.ORDER_SERVICE_URL   || "http://order-service:5000";
const REVIEW_SERVICE_URL  = process.env.REVIEW_SERVICE_URL  || "http://review-service:6000";
const AUTH_SERVICE_URL    = process.env.AUTH_SERVICE_URL    || "http://auth-service:8080";
const SECRET_KEY = "GrupoF_Secret";

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado: Se requiere autenticación" });
  }

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    req.user = verified; 
    next();
  } catch (err) {
    res.status(403).json({ error: "Token inválido o expirado" });
  }
};

app.get("/", (req, res) => {
  res.send("API Gateway funcionando");
});

// ── RUTAS DEL CARRITO ──────────────────────
app.get("/api/cart", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const response = await axios.get(`${ORDER_SERVICE_URL}/cart`, {
      headers: { "x-user-id": userId }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el carrito" });
  }
});

app.post("/api/cart", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const response = await axios.post(`${ORDER_SERVICE_URL}/cart`, req.body, {
      headers: { "x-user-id": userId }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error al añadir al carrito" });
  }
});

app.delete("/api/cart/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const response = await axios.delete(`${ORDER_SERVICE_URL}/cart/${req.params.id}`, {
      headers: { "x-user-id": userId }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar del carrito" });
  }
});

// ── AUTENTICACIÓN ──────────────────────
app.post("/api/register", async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/register`, req.body);
    res.status(201).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/login`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 401).json(error.response?.data || { error: "Error" });
  }
});

// ── PRODUCTOS ──────────────────────
app.get("/api/products", async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/products`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo productos" });
  }
});

app.post("/api/products", verifyToken, async (req, res) => {
  try {
    const response = await axios.post(`${PRODUCT_SERVICE_URL}/products`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error creando producto" });
  }
});

app.put("/api/products/:id", verifyToken, async (req, res) => {
  try {
    const response = await axios.put(`${PRODUCT_SERVICE_URL}/products/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error actualizando producto" });
  }
});

app.delete("/api/products/:id", verifyToken, async (req, res) => {
  try {
    const response = await axios.delete(`${PRODUCT_SERVICE_URL}/products/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error eliminando producto" });
  }
});

// ── ÓRDENES Y RESEÑAS ──────────────────────
app.post("/api/orders", verifyToken, async (req, res) => {
  try {
    const orderWithUser = { ...req.body, customerId: req.user.userId || req.user.id };
    const response = await axios.post(`${ORDER_SERVICE_URL}/orders`, orderWithUser);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error creando pedido" });
  }
});

app.get("/api/reviews/:product_id", async (req, res) => {
  try {
    const response = await axios.get(`${REVIEW_SERVICE_URL}/reviews/${req.params.product_id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo reseñas" });
  }
});

module.exports = app;

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway escuchando en puerto ${PORT}`);
});