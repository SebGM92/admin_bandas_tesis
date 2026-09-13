"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, Button, StatusIcon } from "@/components/ui/ui";

// 🔥 CAMBIO CRÍTICO: Definimos la URL de la API dinámicamente
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
                const res = await fetch(`${API_URL}/api/v1/usuarios/activar/${uid}/${token}/`);

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
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full">
                <Card className="text-center">

                    {estado === "cargando" && (
                        <div className="animate-pulse">
                            <StatusIcon icon="hourglass" tone="brand" />
                            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--ba-text)" }}>Verificando...</h2>
                            <p style={{ color: "var(--ba-text-muted)" }}>Estamos validando tu enlace de seguridad.</p>
                        </div>
                    )}

                    {estado === "exito" && (
                        <div>
                            <StatusIcon icon="check" tone="success" />
                            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--ba-text)" }}>¡Cuenta Activada!</h2>
                            <p className="mb-6" style={{ color: "var(--ba-text-muted)" }}>
                                Tu identidad ha sido verificada. Ya puedes iniciar sesión y configurar tu perfil musical.
                            </p>
                            <Link href="/login">
                                <Button variant="primary" block>Ir al Inicio de Sesión</Button>
                            </Link>
                        </div>
                    )}

                    {estado === "error" && (
                        <div>
                            <StatusIcon icon="x" tone="danger" />
                            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--ba-text)" }}>Enlace Inválido</h2>
                            <p className="mb-6" style={{ color: "var(--ba-text-muted)" }}>
                                El enlace de activación ha expirado, está mal escrito o la cuenta ya fue activada previamente.
                            </p>
                            <Link href="/registro">
                                <Button variant="secondary" block>Volver a registrarse</Button>
                            </Link>
                        </div>
                    )}

                </Card>
            </div>
        </div>
    );
}
