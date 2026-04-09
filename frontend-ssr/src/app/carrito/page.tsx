"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import ConfirmModal from "../../components/ConfirmModal";
import { showToast } from "../../components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function CarritoPage() {
  const [carrito, setCarrito] = useState<any[]>([]);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);

  useEffect(() => {
    setCarrito(JSON.parse(localStorage.getItem("carrito") || "[]"));
  }, []);

  function guardar(c: any[]) {
    setCarrito(c);
    localStorage.setItem("carrito", JSON.stringify(c));
  }

  function cambiarCantidad(index: number, cambio: number) {
    const nuevo = [...carrito];
    const item = nuevo[index];
    const nuevaCantidad = item.cantidad + cambio;
    if (nuevaCantidad > item.stock) {
      showToast(`Solo hay ${item.stock} unidades de "${item.nombre}"`, "warning");
      return;
    }
    if (nuevaCantidad <= 0) nuevo.splice(index, 1);
    else nuevo[index].cantidad = nuevaCantidad;
    guardar(nuevo);
  }

  function confirmarEliminar(index: number) { setConfirmIndex(index); }

  function eliminarItem() {
    if (confirmIndex === null) return;
    const nuevo = [...carrito];
    nuevo.splice(confirmIndex, 1);
    guardar(nuevo);
    setConfirmIndex(null);
    showToast("Producto eliminado del carrito", "info");
  }

  async function finalizarCompra() {
    if (carrito.length === 0) { showToast("Tu carrito está vacío", "warning"); return; }
    try {
      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: carrito }),
      });
      if (!res.ok) throw new Error();
      for (const item of carrito) {
        await fetch(`${API}/api/products/${item.product_id}/stock`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cantidad: item.cantidad }),
        });
      }
      showToast("¡Compra realizada correctamente! 🎉", "success");
      guardar([]);
    } catch {
      showToast("Error procesando la compra", "error");
    }
  }

  const total = carrito.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6">
      <Link href="/" className="fixed top-4 left-4 bg-yellow-400 hover:bg-yellow-500 text-white p-3 rounded-full shadow-lg z-10">←</Link>

      {carrito.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">🛒</p>
          <p className="text-gray-500 text-lg mb-4">Tu carrito está vacío</p>
          <Link href="/" className="bg-yellow-400 text-white px-6 py-2 rounded-lg inline-block">Ver productos</Link>
        </div>
      ) : (
        <>
          {carrito.map((item, i) => (
            <div key={i} className="bg-white p-4 mb-4 rounded-xl shadow flex gap-4 items-center flex-wrap sm:flex-nowrap">
              <img src={item.imagen1 || ""} alt={item.nombre}
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                onError={(e: any) => e.target.style.display = "none"} />
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-gray-800 truncate">{item.nombre}</h2>
                <p className="text-yellow-500 font-semibold">${item.precio_unitario}</p>
                <p className="text-xs text-gray-400">Stock: {item.stock}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => cambiarCantidad(i, -1)}
                  className="bg-red-400 hover:bg-red-500 w-8 h-8 rounded-full text-white font-bold">−</button>
                <span className="font-bold text-lg w-6 text-center">{item.cantidad}</span>
                <button onClick={() => cambiarCantidad(i, 1)}
                  className="bg-green-400 hover:bg-green-500 w-8 h-8 rounded-full text-white font-bold">+</button>
              </div>
              <div className="text-right min-w-[80px]">
                <p className="font-bold text-gray-700">${item.precio_unitario * item.cantidad}</p>
                <button onClick={() => confirmarEliminar(i)}
                  className="text-xs text-red-400 hover:underline mt-1">Eliminar</button>
              </div>
            </div>
          ))}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-right mb-6">
            <p className="text-gray-500 text-sm">Total a pagar</p>
            <p className="text-3xl font-bold text-yellow-500">${total}</p>
          </div>
          <button onClick={finalizarCompra}
            className="w-full bg-green-500 hover:bg-green-600 text-white text-lg font-semibold px-6 py-4 rounded-xl shadow-lg transition">
            Finalizar compra 🎉
          </button>
        </>
      )}

      {confirmIndex !== null && (
        <ConfirmModal
          mensaje="¿Eliminar este producto del carrito?"
          onConfirm={eliminarItem}
          onCancel={() => setConfirmIndex(null)} />
      )}
    </main>
  );
}