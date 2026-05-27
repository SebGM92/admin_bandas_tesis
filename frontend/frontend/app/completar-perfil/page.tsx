"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompletarPerfil() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [instrumento, setInstrumento] = useState("");
    const [procesando, setProcesando] = useState(false);

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcesando(true);
        const token = localStorage.getItem("access_token");

        try {
            const res = await fetch("http://127.0.0.1:8000/api/v1/usuarios/perfil/", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: username,
                    instrumento_principal: instrumento
                }),
            });

            if (res.ok) {
                // Una vez guardado, lo enviamos al Dashboard principal
                router.push("/");
            } else {
                alert("Error al actualizar el perfil.");
            }
        } catch (error) {
            alert("Error de conexión.");
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl">
                <div className="text-center mb-8">
                    <span className="text-5xl">🤘</span>
                    <h1 className="text-3xl font-bold text-white mt-4">¡Cuenta activada!</h1>
                    <p className="text-gray-400 mt-2">Cuéntanos un poco sobre ti para terminar de configurar tu centro de comando.</p>
                </div>

                <form onSubmit={handleGuardar} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Tu Apodo Musical (Username)</label>
                        <input
                            type="text" required
                            value={username} onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej: Slash_Chileno"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">¿Qué instrumento tocas?</label>
                        <select
                            required
                            value={instrumento} onChange={(e) => setInstrumento(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                            <option value="" disabled>Selecciona tu instumento...</option>
                            <option value="VOZ">Cantante/Voz</option>
                            <option value="GUITARRA">Guitarra</option>
                            <option value="GUITARRA ELECTRICA">Guitarra Eléctrica</option>
                            <option value="GUITARRA_VOZ">Guitarra & Voz</option>
                            <option value="BAJO">Bajo</option>
                            <option value="BATERIA">Batería</option>
                            <option value="PIANO">Piano / Teclado</option>
                            <option value="VIOLIN">Violín</option>
                            <option value="SAXOFON">Saxofón</option>
                        </select>
                    </div>

                    <button
                        type="submit" disabled={procesando}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50"
                    >
                        {procesando ? "Guardando..." : "Empezar a Rockear"}
                    </button>
                </form>
            </div>
        </div>
    );
}