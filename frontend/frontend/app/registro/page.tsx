"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegistroUsuario() {
    const router = useRouter();

    // Estados del formulario
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [instrumento, setInstrumento] = useState("");

    // Estados de la interfaz
    const [procesando, setProcesando] = useState(false);
    const [mensajeExito, setMensajeExito] = useState("");
    const [error, setError] = useState("");

    const handleRegistro = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcesando(true);
        setError("");
        setMensajeExito("");

        try {
            // Asegúrate de que esta URL coincida con tu configuración de urls.py en Django
            const res = await fetch("http://127.0.0.1:8000/api/v1/usuarios/registro/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password,
                    instrumento_principal: instrumento
                }),
            });

            const data = await res.json();

            if (res.ok) {
                // Si sale bien, bloqueamos el formulario y mostramos el éxito
                setMensajeExito(data.mensaje || "Registro exitoso. Revisa tu correo electrónico.");
            } else {
                // Si Django nos devuelve errores (ej: correo ya existe)
                setError(data.error || "Ocurrió un error al intentar registrarte.");
            }
        } catch (err) {
            setError("Error de conexión con el servidor. Verifica que Django esté corriendo.");
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <span className="text-5xl block mb-4">🎸</span>
                <h2 className="text-3xl font-extrabold text-white">Únete a BandAdmin</h2>
                <p className="mt-2 text-sm text-gray-400">
                    Tu centro de comando musical te está esperando.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-700">

                    {/* MENSAJE DE ÉXITO (Reemplaza al formulario cuando se envía el correo) */}
                    {mensajeExito ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl text-emerald-500">✉️</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">¡Casi listo!</h3>
                            <p className="text-emerald-400 mb-6">{mensajeExito}</p>
                            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition">
                                Volver al inicio de sesión &rarr;
                            </Link>
                        </div>
                    ) : (
                        /* FORMULARIO DE REGISTRO */
                        <form className="space-y-6" onSubmit={handleRegistro}>
                            {error && (
                                <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-300">Correo Electrónico</label>
                                <div className="mt-1">
                                    <input
                                        type="email" required
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="tu@correo.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300">Contraseña Segura</label>
                                <div className="mt-1">
                                    <input
                                        type="password" required minLength={8}
                                        value={password} onChange={(e) => setPassword(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Mínimo 8 caracteres"
                                    />
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={procesando}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                                >
                                    {procesando ? 'Creando cuenta y enviando correo...' : 'Registrarme ahora'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Enlace para los que ya tienen cuenta */}
                {!mensajeExito && (
                    <p className="mt-4 text-center text-sm text-gray-400">
                        ¿Ya tienes una cuenta?{' '}
                        <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition">
                            Inicia sesión aquí
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
}