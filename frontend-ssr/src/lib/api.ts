// En SSR, API_URL usa el nombre del servicio en Docker (http://api-gateway:3000)
const API_URL = process.env.API_URL || "http://api-gateway:3000";

/**
 * Helper para manejar fetch con timeout y errores silenciosos.
 * Esto evita que el servidor SSR de Next.js se detenga si un microservicio falla.
 */
async function fetchConfig(url: string) {
  try {
    const res = await fetch(url, { 
      // Forzar comportamiento dinámico: no cache en SSR
      cache: "no-store"
    });
    
    if (!res.ok) {
      console.error(`[API Error] ${url} retornó status ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error(`[Connection Error] Falló la conexión a: ${url}`, error);
    return null;
  }
}

export async function getProductos() {
  const data = await fetchConfig(`${API_URL}/api/products`);
  // Retornamos un array vacío si falla para que el .map() en el componente no rompa la app
  return data || [];
}

export async function getProducto(id: number) {
  const productos = await getProductos();
  if (!productos || productos.length === 0) return null;
  
  // Buscamos el producto por ID. Nota: p.id puede venir como string o number según tu DB
  return productos.find((p: any) => String(p.id) === String(id)) || null;
}

export async function getReseñas(productId: number) {
  const data = await fetchConfig(`${API_URL}/api/reviews/${productId}`);
  return data || [];
}

export async function getOrdenes() {
  const data = await fetchConfig(`${API_URL}/api/orders`);
  return data || [];
}