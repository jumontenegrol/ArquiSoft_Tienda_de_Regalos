"use client";
import { ReactNode, useState, useEffect } from 'react';
import "./globals.css";
import Link from "next/link";
import ToastContainer from "../components/Toast";
import { getCookie, deleteCookie } from "cookies-next";
import { jwtDecode } from "jwt-decode";

export default function RootLayout({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ role: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const token = getCookie("token");

  useEffect(() => {
    setMounted(true);
    if (token) {
      try {
        const decoded: any = jwtDecode(token as string);
        setSession(decoded);
      } catch { setSession(null); }
    }
  }, [token]);

  const handleLogout = () => {
    deleteCookie("token");
    window.location.href = "/";
  };

  return (
    <html lang="es">
      <body className="bg-pink-50 text-gray-800">
        <header className="bg-yellow-400 text-white text-center py-6 shadow-md relative">
          <h1 className="text-2xl sm:text-3xl font-alfa">Boutique de Regalos Villapinzón</h1>
          <p className="text-base sm:text-lg">By Nancy Lopez</p>
          
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Link href="/carrito" className="bg-white text-yellow-500 px-3 py-1.5 rounded-lg shadow text-xs font-semibold">
              🛒 Carrito
            </Link>

            {/* MODIFICACIÓN: Usamos un span en lugar de div para evitar el error de hidratación */}
            {mounted && (
              <span className="flex items-center gap-2">
                {session && Number(session.role) === 1 && (
                  <Link href="/admin" className="bg-white text-red-500 px-3 py-1.5 rounded-lg shadow text-xs font-semibold">
                    ⚙️ Admin
                  </Link>
                )}

                {token ? (
                  <>
                    <Link href="/perfil" className="bg-white text-blue-500 px-3 py-1.5 rounded-lg shadow text-xs font-semibold">
                      👤 Perfil
                    </Link>
                    <button onClick={handleLogout} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px]">
                      Salir
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="bg-white text-green-500 px-3 py-1.5 rounded-lg shadow text-xs font-semibold">
                    🔑 Login
                  </Link>
                )}
              </span>
            )}
          </div>
        </header>

        {children}
        <ToastContainer />
      </body>
    </html>
  );
}