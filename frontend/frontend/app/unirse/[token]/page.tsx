"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button, StatusIcon } from "@/components/ui/ui";

// 🔥 CAMBIO CRÍTICO: Definimos la URL de la API dinámicamente
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
                const res = await fetch(`${API_URL}/api/v1/invitaciones/aceptar/${tokenInvitacion}/`, {
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
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <Card className="text-center">

                    {estado === "cargando" && (
                        <div className="animate-pulse">
                            <StatusIcon icon="hourglass" tone="brand" />
                            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--ba-text)" }}>Procesando enlace...</h2>
                            <p className="text-sm" style={{ color: "var(--ba-text-muted)" }}>{mensaje}</p>
                        </div>
                    )}

                    {estado === "exito" && (
                        <div>
                            <StatusIcon icon="check" tone="success" />
                            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--ba-text)" }}>¡Bienvenido!</h2>
                            <p className="mb-6" style={{ color: "var(--ba-success)" }}>{mensaje}</p>
                            <p className="text-sm mb-6" style={{ color: "var(--ba-text-subtle)" }}>Redirigiendo a tus bandas...</p>

                            <Link href="/bandas">
                                <Button variant="primary" block>Ir a mis bandas ahora</Button>
                            </Link>
                        </div>
                    )}

                    {estado === "error" && (
                        <div>
                            <StatusIcon icon="x" tone="danger" />
                            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--ba-text)" }}>Enlace inválido</h2>
                            <p className="mb-6" style={{ color: "var(--ba-danger)" }}>{mensaje}</p>

                            {!localStorage.getItem("access_token") ? (
                                <Link href="/login">
                                    <Button variant="primary" block>Iniciar Sesión</Button>
                                </Link>
                            ) : (
                                <Link href="/bandas">
                                    <Button variant="secondary" block>Volver al Dashboard</Button>
                                </Link>
                            )}
                        </div>
                    )}

                </Card>
            </div>
        </div>
    );
}
