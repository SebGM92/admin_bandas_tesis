"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ActivacionCuenta() {
    const params = useParams();
    // Extraemos las variables de la URL (gracias a los nombres de las carpetas con corchetes)
    const uid = params.uid as string;
    const token = params.token as string;

    // Estados de la interfaz: 'cargando' | 'exito' | 'error'
    const [estado, setEstado] = useState("cargando");

    useEffect(() => {
        const activarCuenta = async () => {
            if (!uid || !token) return;

            try {
                // Hacemos un GET al endpoint que acabamos de crear en Django
                const res = await fetch(`http://127.0.0.1:8000/api/v1/usuarios/activar/${uid}/${token}/`);

                if (res.ok) {
                    setEstado("exito");
                } else {
                    setEstado("error");
                }
            } catch (error) {
                setEstado("error");
            }
        };

        activarCuenta();
    }, [uid, token]);

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl text-center">

                {estado === "cargando" && (
                    <div className="animate-pulse">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                            ⏳
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Verificando...</h2>
                        <p className="text-gray-400">Estamos validando tu enlace de seguridad.</p>
                    </div>
                )}

                {estado === "exito" && (
                    <div>
                        <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl text-emerald-500">
                            ✓
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">¡Cuenta Activada!</h2>
                        <p className="text-gray-400 mb-6">
                            Tu identidad ha sido verificada. Ya puedes iniciar sesión y configurar tu perfil musical.
                        </p>
                        <Link
                            href="/login"
                            className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all"
                        >
                            Ir al Inicio de Sesión
                        </Link>
                    </div>
                )}

                {estado === "error" && (
                    <div>
                        <div className="w-16 h-16 bg-red-500/20 border border-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl text-red-500">
                            ✕
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Enlace Inválido</h2>
                        <p className="text-gray-400 mb-6">
                            El enlace de activación ha expirado, está mal escrito o la cuenta ya fue activada previamente.
                        </p>
                        <Link
                            href="/registro"
                            className="inline-block w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all border border-gray-600"
                        >
                            Volver a registrarse
                        </Link>
                    </div>
                )}

            </div>
        </div>
    );
}