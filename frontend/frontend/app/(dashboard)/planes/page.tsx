"use client";

import { useEffect, useState } from "react";
import { Card, Button, Badge } from "@/components/ui/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface LimitesFree {
    bandas: number;
    tech_rider_exports: number;
    stems_por_cancion: number;
    tomas_por_pista: number;
    comentarios_por_toma: number;
}

interface EstadoPlan {
    usuario_es_pro: boolean;
    limites_free: LimitesFree;
}

const PRECIO_PRO_CLP = 4990;

export default function PlanesPage() {
    const [estado, setEstado] = useState<EstadoPlan | null>(null);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const cargarEstado = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) { setCargando(false); return; }
            try {
                const res = await fetch(`${API_URL}/api/v1/pagos/estado/`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) setEstado(await res.json());
            } catch (err) {
                console.error("Error al cargar el estado del plan:", err);
            } finally {
                setCargando(false);
            }
        };
        cargarEstado();
    }, []);

    const handleActualizar = async () => {
        setProcesando(true);
        setError("");
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_URL}/api/v1/pagos/checkout/`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
            });
            const data = await res.json();

            if (res.ok && data.init_point) {
                // Redirigimos al checkout hosteado de MercadoPago
                window.location.href = data.init_point;
                return;
            }

            if (res.status === 503) {
                setError("Los pagos todavía no están configurados en el servidor. Vuelve a intentarlo más tarde.");
            } else {
                setError(data.error || "No se pudo iniciar el checkout de MercadoPago.");
            }
        } catch (err) {
            setError("Error de conexión al iniciar el pago.");
        } finally {
            setProcesando(false);
        }
    };

    const limites = estado?.limites_free;

    const filas = [
        { label: "Bandas", free: limites ? `${limites.bandas}` : "1", pro: "Ilimitadas" },
        { label: "Exportar Tech Rider (PDF)", free: limites ? `${limites.tech_rider_exports} vez` : "1 vez", pro: "Ilimitado" },
        { label: "Stems por canción", free: limites ? `${limites.stems_por_cancion}` : "2", pro: "Ilimitados" },
        { label: "Tomas por stem", free: limites ? `${limites.tomas_por_pista}` : "1", pro: "Ilimitadas" },
        { label: "Comentarios por toma", free: limites ? `${limites.comentarios_por_toma}` : "5", pro: "Ilimitados" },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--ba-brand)" }}>
                    Planes
                </p>
                <h1 className="ba-page-title" style={{ marginBottom: 8 }}>Saca todo el potencial de BandAdmin</h1>
                <p style={{ color: "var(--ba-text-muted)" }}>
                    Con que un solo integrante de la banda se suscriba, toda la banda queda en Pro.
                </p>
            </div>

            {!cargando && estado?.usuario_es_pro && (
                <Card className="text-center" style={{ borderColor: "var(--ba-brand)" }}>
                    <i className="ti ti-crown" aria-hidden="true" style={{ color: "var(--ba-brand)", fontSize: 32 }} />
                    <h2 className="text-xl font-bold mt-2" style={{ color: "var(--ba-text)" }}>Ya tienes el plan Pro activo</h2>
                    <p className="text-sm mt-1" style={{ color: "var(--ba-text-muted)" }}>
                        Gracias por apoyar a BandAdmin. Todas las bandas donde participas tienen acceso ilimitado.
                    </p>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <h2 className="text-lg font-bold mb-1" style={{ color: "var(--ba-text)" }}>Free</h2>
                    <p className="text-3xl font-extrabold mb-4" style={{ color: "var(--ba-text)" }}>$0</p>
                    <ul className="space-y-2 text-sm" style={{ color: "var(--ba-text-muted)" }}>
                        {filas.map((f) => (
                            <li key={f.label} className="flex justify-between gap-3">
                                <span>{f.label}</span>
                                <span style={{ color: "var(--ba-text)" }}>{f.free}</span>
                            </li>
                        ))}
                    </ul>
                </Card>

                <Card style={{ borderColor: "var(--ba-brand)", borderWidth: 2 }}>
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-lg font-bold" style={{ color: "var(--ba-text)" }}>Pro</h2>
                        <Badge tone="brand">Recomendado</Badge>
                    </div>
                    <p className="text-3xl font-extrabold mb-4" style={{ color: "var(--ba-text)" }}>
                        ${PRECIO_PRO_CLP.toLocaleString("es-CL")}
                        <span className="text-sm font-normal" style={{ color: "var(--ba-text-muted)" }}> CLP / mes</span>
                    </p>
                    <ul className="space-y-2 text-sm mb-6" style={{ color: "var(--ba-text-muted)" }}>
                        {filas.map((f) => (
                            <li key={f.label} className="flex justify-between gap-3">
                                <span>{f.label}</span>
                                <span className="font-semibold" style={{ color: "var(--ba-brand)" }}>{f.pro}</span>
                            </li>
                        ))}
                    </ul>

                    {!estado?.usuario_es_pro && (
                        <Button
                            variant="primary" block icon="crown"
                            onClick={handleActualizar}
                            disabled={procesando || cargando}
                        >
                            {procesando ? "Redirigiendo a MercadoPago..." : "Actualizar a Pro"}
                        </Button>
                    )}

                    {error && (
                        <p className="text-sm mt-3 text-center" style={{ color: "var(--ba-danger)" }}>{error}</p>
                    )}

                    <p className="text-xs mt-4 text-center" style={{ color: "var(--ba-text-subtle)" }}>
                        Pago procesado por MercadoPago. Puedes cancelar cuando quieras.
                    </p>
                </Card>
            </div>
        </div>
    );
}
