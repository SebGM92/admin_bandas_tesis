"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, Button, StatusIcon } from "@/components/ui/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const INTENTOS_MAXIMOS = 5;
const ESPERA_MS = 2000;

// MercadoPago redirige acá después del checkout de la suscripción. La
// confirmación real del pago llega de forma asíncrona por webhook, así que
// reintentamos consultar el estado unas cuantas veces antes de rendirnos.
function RetornoContenido() {
    const searchParams = useSearchParams();
    const statusMercadoPago = searchParams.get("status") ?? searchParams.get("collection_status");

    const [esPro, setEsPro] = useState(false);
    const [confirmando, setConfirmando] = useState(true);
    const intentosRef = useRef(0);

    useEffect(() => {
        let cancelado = false;

        const consultar = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) { setConfirmando(false); return; }

            try {
                const res = await fetch(`${API_URL}/api/v1/pagos/estado/`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (cancelado) return;

                    if (data.usuario_es_pro) {
                        setEsPro(true);
                        setConfirmando(false);
                        return;
                    }
                }
            } catch (err) {
                console.error("Error al confirmar el plan:", err);
            }

            intentosRef.current += 1;
            if (intentosRef.current >= INTENTOS_MAXIMOS) {
                if (!cancelado) setConfirmando(false);
                return;
            }
            setTimeout(consultar, ESPERA_MS);
        };

        consultar();
        return () => { cancelado = true; };
    }, []);

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <Card className="text-center">
                    {confirmando && (
                        <div className="animate-pulse">
                            <StatusIcon icon="hourglass" tone="brand" />
                            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--ba-text)" }}>Confirmando tu pago...</h2>
                            <p className="text-sm" style={{ color: "var(--ba-text-muted)" }}>
                                MercadoPago está procesando tu suscripción. Esto puede tardar unos segundos.
                            </p>
                        </div>
                    )}

                    {!confirmando && esPro && (
                        <div>
                            <StatusIcon icon="crown" tone="success" />
                            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--ba-text)" }}>¡Ya eres Pro!</h2>
                            <p className="mb-6" style={{ color: "var(--ba-success)" }}>
                                Tu suscripción quedó activa. Todas tus bandas ya tienen acceso ilimitado.
                            </p>
                            <Link href="/bandas">
                                <Button variant="primary" block>Ir a mis bandas</Button>
                            </Link>
                        </div>
                    )}

                    {!confirmando && !esPro && (
                        <div>
                            <StatusIcon icon="clock" tone="warning" />
                            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--ba-text)" }}>Todavía estamos confirmando</h2>
                            <p className="mb-6 text-sm" style={{ color: "var(--ba-text-muted)" }}>
                                {statusMercadoPago === "pending"
                                    ? "MercadoPago marcó el pago como pendiente. Puede tardar un poco más en aprobarse."
                                    : "No pudimos confirmar el pago todavía. Si ya lo completaste en MercadoPago, refresca esta página en un momento."}
                            </p>
                            <Link href="/planes">
                                <Button variant="secondary" block>Volver a Planes</Button>
                            </Link>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

export default function RetornoPlanes() {
    return (
        <Suspense fallback={<p className="p-8" style={{ color: "var(--ba-text-muted)" }}>Cargando...</p>}>
            <RetornoContenido />
        </Suspense>
    );
}
