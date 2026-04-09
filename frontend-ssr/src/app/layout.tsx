import type { ReactNode } from 'react';
import "./globals.css";
import Link from "next/link";
import ToastContainer from "../components/Toast";

export const metadata = {
  title: "Boutique de Regalos Villapinzón",
  description: "Tienda de regalos y papelería",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-pink-50 text-gray-800">
        <header className="bg-yellow-400 text-white text-center py-6 shadow-md relative">
          <h1 className="text-2xl sm:text-3xl font-alfa">Boutique de Regalos Villapinzón</h1>
          <p className="text-base sm:text-lg">By Nancy Lopez</p>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
            <Link href="/carrito"
              className="bg-white text-yellow-500 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow hover:bg-yellow-50 text-xs sm:text-sm font-semibold">
              🛒 Carrito
            </Link>
            <Link href="/admin"
              className="bg-white text-yellow-500 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow hover:bg-yellow-50 text-xs sm:text-sm font-semibold">
              ⚙️ Admin
            </Link>
          </div>
        </header>

        {children}

        <footer className="bg-yellow-400 text-center py-4 mt-10 text-sm text-white">
          <p>Contáctanos por{" "}
            <a href="https://wa.me/573005554942" className="text-green-700 font-semibold hover:underline">
              WhatsApp
            </a>
          </p>
        </footer>
        <footer className="bg-yellow-400 text-white text-center py-6">
          <h2 className="text-xl font-semibold mb-2">Dónde encontrarnos</h2>
          <p className="mb-2">Carrera 5 # 3-15, Villapinzón, Colombia</p>
          <a href="https://www.google.com/maps/place/Boutique+de+Regalos+Villapinz%C3%B3n"
            target="_blank" className="underline hover:text-yellow-100">
            Ver en Google Maps
          </a>
        </footer>

        <ToastContainer />
      </body>
    </html>
  );
}
