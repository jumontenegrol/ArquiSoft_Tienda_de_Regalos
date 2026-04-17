"use client";
import { useState } from "react";
import { setCookie } from "cookies-next";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm_password: "" });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isRegister ? "/api/register" : "/api/login";
    
    // Conectamos con el API Gateway (puerto 3000)
    const res = await fetch(`http://localhost:3000${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (res.ok) {
      if (!isRegister) {
        setCookie("token", data.token); // Guardamos el token del servicio C++
        router.push("/");
        router.refresh();
      } else {
        alert("Usuario creado. Ahora puedes iniciar sesión.");
        setIsRegister(false);
      }
    } else {
      alert(data.error || "Error en la operación");
    }
  };

  return (
    <main className="max-w-md mx-auto mt-20 p-6 bg-white shadow-xl rounded-2xl">
      <h2 className="text-2xl font-bold mb-6 text-center text-yellow-500">
        {isRegister ? "Crear Cuenta" : "Iniciar Sesión"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <input className="w-full p-3 border rounded-lg bg-pink-50" placeholder="Nombre de Usuario"
            onChange={e => setForm({...form, username: e.target.value})} required />
        )}
        <input className="w-full p-3 border rounded-lg bg-pink-50" type="email" placeholder="Email"
          onChange={e => setForm({...form, email: e.target.value})} required />
        <input className="w-full p-3 border rounded-lg bg-pink-50" type="password" placeholder="Contraseña"
          onChange={e => setForm({...form, password: e.target.value})} required />
        {isRegister && (
          <input className="w-full p-3 border rounded-lg bg-pink-50" type="password" placeholder="Confirmar Contraseña"
            onChange={e => setForm({...form, confirm_password: e.target.value})} required />
        )}
        <button className="w-full bg-yellow-400 text-white py-3 rounded-lg font-bold hover:bg-yellow-500 transition">
          {isRegister ? "Registrarme ✨" : "Ingresar 🚀"}
        </button>
      </form>
      <button onClick={() => setIsRegister(!isRegister)} className="w-full mt-4 text-sm text-gray-500 underline">
        {isRegister ? "¿Ya tienes cuenta? Ingresa aquí" : "¿No tienes cuenta? Regístrate"}
      </button>
    </main>
  );
}