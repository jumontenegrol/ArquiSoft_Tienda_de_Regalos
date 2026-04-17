import { getProductos } from "../lib/api";
import Link from "next/link";
import ImageWithFallback from "../components/ImageWithFallback";
import ExternalAnchor from "../components/ExternalAnchor";

export default async function Home() {
  let productos: any[] = [];
  try {
    productos = await getProductos();
  } catch {
    productos = [];
  }

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {productos.map((p: any) => (
          <div key={p.id} className="bg-white shadow-md rounded-xl overflow-hidden hover:scale-105 transition-transform duration-200 flex flex-col">
            {/* El Link ahora solo envuelve la imagen y la información, no el botón */}
            <Link href={`/producto/${p.id}`} className="cursor-pointer block flex-grow">
              <ImageWithFallback
                src={p.imagen1 ? encodeURI(p.imagen1.startsWith("/") ? p.imagen1 : `/${p.imagen1}`) : undefined}
                alt={p.nombre}
                className="w-full h-48 object-cover"
              />
              {/* Cambiamos el div interno por un span con bloque para evitar conflictos de hidratación */}
              <span className="p-4 block">
                <h3 className="text-center font-semibold text-orange-500">{p.nombre}</h3>
                <p className="text-center text-gray-600 mb-2 text-sm">{p.descripcion}</p>
                <p className="text-center font-bold text-gray-800 mb-3">${p.precio}</p>
              </span>
            </Link>
            
            {/* El botón de comprar queda fuera del enlace principal */}
            <div className="px-4 pb-4">
              <ExternalAnchor 
                href={`https://wa.me/573005554942?text=Hola!%20Estoy%20interesado%20en%20${encodeURIComponent(p.nombre)}`}
                className="block bg-yellow-400 text-white text-center py-2 rounded-md hover:bg-yellow-200">
                Comprar
              </ExternalAnchor>
            </div>
          </div>
        ))}
        {productos.length === 0 && (
          <p className="col-span-3 text-center text-gray-400 py-16">No hay productos disponibles.</p>
        )}
      </div>
    </main>
  );
}