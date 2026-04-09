"use client";
import { useState } from "react";
import Link from "next/link";
import StarRating from "../../../components/StarRating";
import { showToast } from "../../../components/Toast";

const API = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000")
  : (process.env.API_URL || "http://api-gateway:3000");

export default function ProductoClient({ producto, reseñasIniciales }: { producto: any; reseñasIniciales: any[] }) {
  const [reseñas, setReseñas] = useState(reseñasIniciales);
  const [autor, setAutor] = useState("");
  const [comentario, setComentario] = useState("");
  const [estrellas, setEstrellas] = useState(0);
  const [modalImg, setModalImg] = useState<string | null>(null);

  const imagenes = [producto.imagen1, producto.imagen2, producto.imagen3].filter(Boolean);

  function agregarAlCarrito() {
    const carrito = JSON.parse(localStorage.getItem("carrito") || "[]");
    const existente = carrito.find((i: any) => i.product_id === producto.id);
    if (existente) {
      if (existente.cantidad >= producto.stock) {
        showToast(`Solo hay ${producto.stock} unidades disponibles`, "warning");
        return;
      }
      existente.cantidad += 1;
    } else {
      if (producto.stock <= 0) {
        showToast(`"${producto.nombre}" está agotado`, "error");
        return;
      }
      carrito.push({
        product_id: producto.id,
        nombre: producto.nombre,
        precio_unitario: producto.precio,
        stock: producto.stock,
        imagen1: producto.imagen1,
        cantidad: 1,
      });
    }
    localStorage.setItem("carrito", JSON.stringify(carrito));
    showToast("Producto agregado al carrito 🛒", "success");
  }

  async function enviarReseña() {
    if (!autor || !comentario || estrellas === 0) {
      showToast("Completa todos los campos y selecciona las estrellas", "warning");
      return;
    }
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: producto.id, autor, comentario, estrellas }),
      });
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/reviews/${producto.id}`);
      setReseñas(await res.json());
      setAutor(""); setComentario(""); setEstrellas(0);
      showToast("¡Reseña enviada, gracias! 🌟", "success");
    } catch {
      showToast("Error enviando reseña", "error");
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6">
      <Link href="/"
        className="fixed top-4 left-4 bg-yellow-400 hover:bg-yellow-500 text-white p-3 rounded-full shadow-lg z-10">
        ←
      </Link>

      {/* Producto */}
      <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-yellow-500 mb-4">{producto.nombre}</h2>
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          {imagenes.map((img: string, i: number) => (
            <img key={i} src={img} alt={producto.nombre}
              className="w-full sm:w-1/3 object-cover rounded-lg shadow-md hover:scale-105 transition cursor-pointer"
              onClick={() => setModalImg(img)} />
          ))}
        </div>
        <p className="text-gray-700 mb-4">{producto.descripcion}</p>
        <p className="text-2xl font-bold mb-6">${producto.precio}</p>
        <button onClick={agregarAlCarrito}
          className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-white font-semibold py-3 px-6 rounded-lg shadow">
          Agregar al carrito 🛒
        </button>
      </div>

      {/* Reseñas */}
      <div className="mt-10">
        <h3 className="text-2xl font-alfa text-yellow-500 mb-6">Reseñas del producto</h3>
        <div className="space-y-4 mb-8">
          {reseñas.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Aún no hay reseñas. ¡Sé el primero! 🌟</p>
          ) : reseñas.map((r: any) => (
            <div key={r._id} className="bg-white rounded-xl shadow p-4">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-gray-800">{r.autor}</p>
                  <p className="text-yellow-400 text-lg">{"★".repeat(r.estrellas)}{"☆".repeat(5 - r.estrellas)}</p>
                </div>
                <p className="text-xs text-gray-400">{new Date(r.fecha).toLocaleDateString()}</p>
              </div>
              <p className="text-gray-600 mt-2">{r.comentario}</p>
            </div>
          ))}
        </div>

        {/* Formulario reseña */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-6 space-y-4">
          <h4 className="text-lg font-semibold text-gray-700">Deja tu reseña ✍️</h4>
          <input value={autor} onChange={e => setAutor(e.target.value)}
            placeholder="Tu nombre"
            className="border border-gray-200 rounded-lg p-3 w-full bg-pink-50 focus:outline-none focus:border-yellow-400" />
          <textarea value={comentario} onChange={e => setComentario(e.target.value)}
            placeholder="¿Qué te pareció el producto?" rows={3}
            className="border border-gray-200 rounded-lg p-3 w-full bg-pink-50 focus:outline-none focus:border-yellow-400" />
          <StarRating onChange={setEstrellas} />
          <button onClick={enviarReseña}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-semibold py-3 px-6 rounded-xl shadow transition">
            Enviar reseña 🌟
          </button>
        </div>
      </div>

      {/* Modal imagen */}
      {modalImg && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setModalImg(null)}>
          <img src={modalImg} alt="Ampliada" className="max-w-full max-h-full rounded-lg shadow-lg" />
        </div>
      )}
    </main>
  );
}