"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Field, Input, Button, StatusIcon } from "@/components/ui/ui";

export default function RegistroUsuario() {
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
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <i className="ti ti-music" aria-hidden="true" style={{ fontSize: 40, color: "var(--ba-brand)" }} />
                <h2 className="text-3xl font-extrabold mt-4" style={{ color: "var(--ba-text)" }}>Únete a BandAdmin</h2>
                <p className="mt-2 text-sm" style={{ color: "var(--ba-text-muted)" }}>
                    Tu centro de comando musical te está esperando.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <Card>
                    {/* MENSAJE DE ÉXITO (Reemplaza al formulario cuando se envía el correo) */}
                    {mensajeExito ? (
                        <div className="text-center">
                            <StatusIcon icon="mail-check" tone="success" />
                            <h3 className="text-xl font-bold mb-2" style={{ color: "var(--ba-text)" }}>¡Casi listo!</h3>
                            <p className="mb-6" style={{ color: "var(--ba-success)" }}>{mensajeExito}</p>
                            <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--ba-brand)" }}>
                                Volver al inicio de sesión &rarr;
                            </Link>
                        </div>
                    ) : (
                        /* FORMULARIO DE REGISTRO */
                        <form onSubmit={handleRegistro}>
                            {error && (
                                <div
                                    className="p-3 rounded text-sm text-center mb-4"
                                    style={{ background: "var(--ba-danger-soft)", color: "var(--ba-danger)" }}
                                >
                                    {error}
                                </div>
                            )}

                            <Field label="Correo electrónico">
                                <Input
                                    type="email" required
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@correo.com"
                                />
                            </Field>

                            <Field label="Contraseña segura">
                                <Input
                                    type="password" required minLength={8}
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mínimo 8 caracteres"
                                />
                            </Field>

                            <Button type="submit" variant="primary" block disabled={procesando}>
                                {procesando ? "Creando cuenta y enviando correo..." : "Registrarme ahora"}
                            </Button>
                        </form>
                    )}
                </Card>

                {/* Enlace para los que ya tienen cuenta */}
                {!mensajeExito && (
                    <p className="mt-4 text-center text-sm" style={{ color: "var(--ba-text-muted)" }}>
                        ¿Ya tienes una cuenta?{" "}
                        <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--ba-brand)" }}>
                            Inicia sesión aquí
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
}
