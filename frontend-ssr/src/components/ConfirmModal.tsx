"use client";

interface Props {
  mensaje: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ mensaje, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
        <p className="text-5xl mb-4">🛒</p>
        <p className="text-gray-700 font-semibold text-lg mb-6">{mensaje}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel}
            className="px-6 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 font-semibold transition">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="px-6 py-2 rounded-xl bg-red-400 hover:bg-red-500 text-white font-semibold transition">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}