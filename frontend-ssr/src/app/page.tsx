import { getProductos } from "../lib/api";
import Link from "next/link";
import ImageWithFallback from "../components/ImageWithFallback";

export default async function Home() {
  let productos: any[] = [];
  try {
    productos = await getProductos();
  } catch {
    productos = [];
  }

  return (
    <>
      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        
        {/* Título tipo marketplace */}
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Productos disponibles
        </h1>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          
          {productos.map((p: any) => (
            <div
              key={p.id}
              className="bg-white border rounded-xl overflow-hidden hover:shadow-lg transition duration-200 flex flex-col"
            >
              {/* Imagen */}
              <Link href={`/producto/${p.id}`} className="block">
                <ImageWithFallback
                  src={
                    p.imagen1
                      ? encodeURI(
                          p.imagen1.startsWith("/")
                            ? p.imagen1
                            : `/${p.imagen1}`
                        )
                      : undefined
                  }
                  alt={p.nombre}
                  className="w-full h-52 object-cover"
                />
              </Link>

              {/* Info */}
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">
                  {p.nombre}
                </h3>

                <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                  {p.descripcion}
                </p>

                <p className="text-lg font-bold text-gray-900 mb-4">
                  ${p.precio}
                </p>

                {/* Botón */}
                <Link
                  href={`/producto/${p.id}`}
                  className="mt-auto bg-yellow-400 text-white text-center py-2 rounded-md hover:bg-yellow-300 transition font-semibold"
                >
                  Ver producto
                </Link>
              </div>
            </div>
          ))}

          {/* Estado vacío */}
          {productos.length === 0 && (
            <p className="col-span-full text-center text-gray-400 py-16">
              No hay productos disponibles.
            </p>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-yellow-400 text-gray-900 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Contacto */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Contacto</h2>
            <p className="text-sm mb-2">
              ¿Interesado en algún producto?
            </p>
            <a
              href="https://wa.me/573005554942"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-green-800 font-semibold hover:underline"
            >
              Escríbenos por WhatsApp
            </a>
          </div>

          {/* Ubicación */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Ubicación</h2>
            <p className="text-sm mb-2">
              Carrera 5 # 3-15, Villapinzón, Colombia
            </p>
            <a
              href="https://www.google.com/maps/place/Boutique+de+Regalos+Villapinz%C3%B3n/@5.2154062,-73.5973877,80m/data=!3m1!1e3!4m9!1m2!2m1!1sCra.+5+%23+3-19!3m5!1s0x8e402336a8101291:0x1f09a717d5538beb!8m2!3d5.215484!4d-73.597462!16s%2Fg%2F11zkhv3tws?entry=ttu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-blue-900 hover:underline"
            >
              Ver en Google Maps
            </a>
          </div>
        </div>

        {/* Línea inferior */}
        <div className="border-t border-yellow-300 text-center py-4 text-xs">
          © {new Date().getFullYear()} Boutique de Regalos · Todos los derechos reservados
        </div>
      </footer>
    </>
  );
}
