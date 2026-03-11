const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL;
const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL;

app.get("/", (req, res) => {
  res.send("API Gateway funcionando");
});

//Crear Producto
app.post("/api/products", async (req, res) => {
  try {
    const response = await axios.post(`${PRODUCT_SERVICE_URL}/products`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error creando producto" });
  }
});

//Cambiar precio
app.put("/api/products/:id", async (req, res) => {
  try {
    const response = await axios.put(`${PRODUCT_SERVICE_URL}/products/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error actualizando producto" });
  }
});

//Eliminar Producto
app.delete("/api/products/:id", async (req, res) => {
  try {
    const response = await axios.delete(`${PRODUCT_SERVICE_URL}/products/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error eliminando producto" });
  }
});

//Obtener Productos
app.get("/api/products", async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/products`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo productos" });
  }
});

//Crear Stock
app.put("/api/products/:id/stock", async (req, res) => {
  try {
    const response = await axios.put(`${PRODUCT_SERVICE_URL}/products/${req.params.id}/stock`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error actualizando stock" });
  }
});

//Crear Pedido
app.post("/api/orders", async (req, res) => {
  try {
    const response = await axios.post(`${ORDER_SERVICE_URL}/orders`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error creando pedido" });
  }
});


//Obtener Pedidos
app.get("/api/orders", async (req, res) => {
  try {
    const response = await axios.get(`${ORDER_SERVICE_URL}/orders`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo pedidos" });
  }
});

//Obtener Reseñas
app.get("/api/reviews/:product_id", async (req, res) => {
  try {
    const response = await axios.get(`${REVIEW_SERVICE_URL}/reviews/${req.params.product_id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo reseñas" });
  }
});

//Crear Reseña
app.post("/api/reviews", async (req, res) => {
  try {
    const response = await axios.post(`${REVIEW_SERVICE_URL}/reviews`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error creando reseña" });
  }
});


//Eliminar Reseña
app.delete("/api/reviews/:id", async (req, res) => {
  try {
    const response = await axios.delete(`${REVIEW_SERVICE_URL}/reviews/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error eliminando reseña" });
  }
});

module.exports = app;