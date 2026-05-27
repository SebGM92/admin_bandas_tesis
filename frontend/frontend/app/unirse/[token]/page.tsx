"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function UnirseBanda() {
    const params = useParams();
    const router = useRouter();
    const tokenInvitacion = params.token as string;

    const [estado, setEstado] = useState<"cargando" | "exito" | "error">("cargando");
    const [mensaje, setMensaje] = useState("Validando tu invitación segura...");
    const [bandaId, setBandaId] = useState<number | null>(null);

    useEffect(() => {
        const procesarInvitacion = async () => {
            // 1. Verificamos si el músico tiene la sesión iniciada
            const accessToken = localStorage.getItem("access_token");

            if (!accessToken) {
                setEstado("error");
                setMensaje("Debes iniciar sesión en BandAdmin para aceptar una invitación.");
                return;
            }

            // 2. Enviamos el token al backend para validarlo
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/v1/invitaciones/aceptar/${tokenInvitacion}/`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    }
                });

                const data = await res.json();

                if (res.ok) {
                    setEstado("exito");
                    setMensaje(data.mensaje || "¡Te has unido a la banda exitosamente!");
                    setBandaId(data.banda_id);

                    // Opcional: Redirigimos al dashboard después de 3 segundos
                    setTimeout(() => {
                        router.push('/bandas');
                    }, 3000);
                } else {
                    setEstado("error");
                    setMensaje(data.error || "No se pudo procesar la invitación.");
                }
            } catch (error) {
                setEstado("error");
                setMensaje("Error de conexión con el servidor.");
            }
        };

        if (tokenInvitacion) {
            procesarInvitacion();
        }
    }, [tokenInvitacion, router]);

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 p-8 rounded-lg shadow-2xl max-w-md w-full text-center">

                {estado === "cargando" && (
                    <div className="animate-pulse">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">⏳</span>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Procesando enlace...</h2>
                        <p className="text-gray-400 text-sm">{mensaje}</p>
                    </div>
                )}

                {estado === "exito" && (
                    <div>
                        <div className="w-16 h-16 bg-green-500/20 border border-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl text-green-500">✓</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">¡Bienvenido!</h2>
                        <p className="text-green-400 mb-6">{mensaje}</p>
                        <p className="text-gray-500 text-sm mb-6">Redirigiendo a tus bandas...</p>

                        <Link href="/bandas" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition">
                            Ir a mis bandas ahora
                        </Link>
                    </div>
                )}

                {estado === "error" && (
                    <div>
                        <div className="w-16 h-16 bg-red-500/20 border border-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl text-red-500">✗</span>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Enlace inválido</h2>
                        <p className="text-red-400 mb-6">{mensaje}</p>

                        <div className="space-y-3 flex flex-col">
                            {!localStorage.getItem("access_token") ? (
                                <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition">
                                    Iniciar Sesión
                                </Link>
                            ) : (
                                <Link href="/bandas" className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded transition">
                                    Volver al Dashboard
                                </Link>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}