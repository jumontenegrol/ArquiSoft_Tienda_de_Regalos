"use client";
import { useState } from "react";
import { setCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import { showToast } from "../../components/Toast";
import FormInput from "../../components/FormInput";
import Button from "../../components/Button";

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
        showToast("Usuario creado. Ahora puedes iniciar sesión.", "success");
        setIsRegister(false);
      }
    } else {
      showToast(data.error || "Error en la operación", "error");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-white to-yellow-50">
      <div className="w-full max-w-md bg-white shadow-elevation-3 rounded-2xl p-8 sm:p-10 border-2 border-gray-100">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            {isRegister ? "🎉 Crear Cuenta" : "🔐 Iniciar Sesión"}
          </h2>
          <p className="text-center text-gray-500 text-sm">
            {isRegister ? "Únete a nuestra comunidad" : "Accede a tu cuenta"}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Usuario</label>
              <FormInput 
                placeholder="tu_usuario" 
                value={form.username}
                onChange={e => setForm({...form, username: e.target.value})} 
                required 
              />
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Correo</label>
            <FormInput 
              type="email" 
              placeholder="tu@email.com" 
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} 
              required 
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Contraseña</label>
            <FormInput 
              type="password" 
              placeholder="••••••••" 
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} 
              required 
            />
          </div>
          
          {isRegister && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Confirmar Contraseña</label>
              <FormInput 
                type="password" 
                placeholder="••••••••" 
                value={form.confirm_password}
                onChange={e => setForm({...form, confirm_password: e.target.value})} 
                required 
              />
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full py-3 rounded-lg bg-yellow-400 text-white hover:bg-yellow-500 font-bold text-lg mt-6"
            variant="primary"
          >
            {isRegister ? "Registrarme ✨" : "Ingresar 🚀"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setForm({ username: "", email: "", password: "", confirm_password: "" });
            }} 
            className="w-full text-sm font-medium text-yellow-600 hover:text-yellow-700 transition-colors"
          >
            {isRegister ? "¿Ya tienes cuenta? Ingresa aquí" : "¿No tienes cuenta? Regístrate aquí"}
          </button>
        </div>
      </div>
    </main>
  );
}