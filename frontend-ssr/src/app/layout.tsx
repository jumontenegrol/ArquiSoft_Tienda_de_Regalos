"use client";
import { ReactNode, useState, useEffect } from "react";
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
      } catch {
        setSession(null);
      }
    }
  }, [token]);

  const handleLogout = () => {
    deleteCookie("token");
    window.location.href = "/";
  };

  return (
    <html lang="es">
      <body className="bg-pink-50 text-gray-800">
        
        {/* HEADER PRO */}
        <header className="bg-yellow-400 shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-4 relative flex items-center justify-between">
            
            {/* BLOQUE IZQUIERDA (vacío para centrar visualmente) */}
            <div className="w-1/3 hidden md:block" />

            {/* MARCA CENTRADA */}
            <Link
              href="/"
              className="absolute left-1/2 -translate-x-1/2 text-center"
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
                Boutique de Regalos
              </h1>
              <p className="text-sm text-yellow-100">
                Villapinzón · By Nancy Lopez
              </p>
            </Link>

            {/* ACCIONES DERECHA */}
            <div className="flex items-center gap-3 ml-auto">
              
              {/* Carrito */}
              <Link
                href="/carrito"
                className="flex items-center gap-2 bg-white text-gray-800 px-4 py-2 rounded-lg shadow hover:bg-gray-100 transition text-sm font-semibold"
              >
                🛒 <span className="hidden sm:inline">Carrito</span>
              </Link>

              {mounted && (
                <>
                  {/* Admin */}
                  {session && Number(session.role) === 1 && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 bg-white text-red-500 px-4 py-2 rounded-lg shadow hover:bg-red-50 transition text-sm font-semibold"
                    >
                      ⚙️ <span className="hidden sm:inline">Admin</span>
                    </Link>
                  )}

                  {token ? (
                    <>
                      {/* Perfil */}
                      <Link
                        href="/perfil"
                        className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg shadow hover:bg-blue-50 transition text-sm font-semibold"
                      >
                        👤 <span className="hidden sm:inline">Perfil</span>
                      </Link>

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-700 transition text-sm font-semibold"
                      >
                        Salir
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-500 transition text-sm font-semibold"
                    >
                      🔑 <span className="hidden sm:inline">Login</span>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </header>


        {/* CONTENIDO */}
        {children}

        {/* TOAST */}
        <ToastContainer />
      </body>
    </html>
  );
}
