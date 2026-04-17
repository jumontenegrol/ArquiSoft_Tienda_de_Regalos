"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import ConfirmModal from "../../components/ConfirmModal";
import { showToast } from "../../components/Toast";
// MODIFICACIÓN: Importaciones para manejar la sesión y la API persistente
import { getCookie } from "cookies-next";
import { getCart, addToCart, removeFromCart, getProductos } from "../../lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function CarritoPage() {
  const [carrito, setCarrito] = useState<any[]>([]);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  // MODIFICACIÓN: Estado para manejar la carga de datos
  const [loading, setLoading] = useState(true);
  const token = getCookie("token");

  // MODIFICACIÓN: El useEffect ahora dispara la carga enriquecida desde el servidor
  useEffect(() => {
    if (token) {
      cargarCarritoCompleto();
    } else {
      setLoading(false);
    }
  }, [token]);

  // CREACIÓN: Función que cruza los IDs de tu carrito (Postgres) con los detalles del catálogo
  async function cargarCarritoCompleto() {
    try {
      // 1. Obtener items básicos (product_id y cantidad) del microservicio de órdenes
      const itemsDB = await getCart(token as string); 
      
      // 2. Obtener lista completa de productos para extraer nombres, precios e imágenes
      const catalogo = await getProductos(); 

      // 3. Enriquecimiento: Mapeamos los items de la DB con la info del catálogo
      const carritoConDatos = (itemsDB || []).map((itemDB: any) => {
        const productoInfo = catalogo.find((p: any) => String(p.id) === String(itemDB.product_id));
        
        return {
          ...itemDB,
          nombre: productoInfo ? productoInfo.nombre : `Producto #${itemDB.product_id}`,
          precio_unitario: productoInfo ? productoInfo.precio : 0,
          imagen1: productoInfo ? productoInfo.imagen1 : null,
          stock: productoInfo ? productoInfo.stock : 0
        };
      });

      setCarrito(carritoConDatos);
    } catch (error) {
      showToast("Error al sincronizar el carrito", "error");
    } finally {
      setLoading(false);
    }
  }

  // MODIFICACIÓN: Ahora las funciones de guardado actualizan el estado en el servidor
  async function guardarCambioCantidad(productId: number, cambio: number) {
    try {
      await addToCart(productId, cambio, token as string);
      await cargarCarritoCompleto(); // Recargamos para ver datos frescos
    } catch {
      showToast("No se pudo actualizar la cantidad", "error");
    }
  }

  async function cambiarCantidad(index: number, cambio: number) {
    const item = carrito[index];
    const nuevaCantidad = item.cantidad + cambio;
    
    // Validación de stock mantenida del original
    if (nuevaCantidad > item.stock) {
      showToast(`Solo hay ${item.stock} unidades de "${item.nombre}"`, "warning");
      return;
    }

    if (nuevaCantidad <= 0) {
      confirmarEliminar(index);
    } else {
      await guardarCambioCantidad(item.product_id, cambio);
    }
  }

  function confirmarEliminar(index: number) { setConfirmIndex(index); }

  // MODIFICACIÓN: Elimina el registro físico en la base de datos de PostgreSQL
  async function eliminarItem() {
    if (confirmIndex === null) return;
    const item = carrito[confirmIndex];
    try {
      await removeFromCart(item.product_id, token as string);
      showToast("Producto eliminado del carrito", "info");
      setConfirmIndex(null);
      await cargarCarritoCompleto();
    } catch {
      showToast("Error al eliminar el producto", "error");
    }
  }

  async function finalizarCompra() {
    if (carrito.length === 0) { showToast("Tu carrito está vacío", "warning"); return; }
    try {
      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ items: carrito }),
      });
      if (!res.ok) throw new Error();

      // Limpieza del carrito en la base de datos tras la compra
      for (const item of carrito) {
        await removeFromCart(item.product_id, token as string);
      }

      showToast("¡Compra realizada correctamente! 🎉", "success");
      setCarrito([]);
    } catch {
      showToast("Error procesando la compra", "error");
    }
  }

  // MODIFICACIÓN: Bloque de seguridad para obligar al login
  if (!token) {
    return (
      <main className="max-w-md mx-auto mt-20 p-8 bg-white shadow-xl rounded-2xl text-center border-t-4 border-yellow-400">
        <p className="text-6xl mb-4">🔑</p>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">¡Logéate primero!</h2>
        <p className="text-gray-500 mb-6">Tu carrito ahora es personal y persistente. Inicia sesión para ver tus productos guardados.</p>
        <Link href="/login" className="bg-yellow-400 text-white px-8 py-3 rounded-xl font-bold hover:bg-yellow-500 shadow-lg">
          Ingresar
        </Link>
      </main>
    );
  }

  if (loading) return <p className="text-center mt-20 text-yellow-500 font-bold italic">Cargando tus regalos... 🎁</p>;

  // Cálculo del total corregido para evitar el NaN
  const total = carrito.reduce((s, i) => s + (i.precio_unitario * i.cantidad), 0);

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
                <p className="text-xs text-gray-400">Stock disponible: {item.stock}</p>
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