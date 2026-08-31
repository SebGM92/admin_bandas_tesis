"use client";

import { useState, useEffect } from "react";
import { useBanda } from "@/context/BandaContext";
import { Card, Button, Field, Input, Badge, StatGrid, StatCard, EmptyState, Modal } from "@/components/ui/ui";
import { formatCLP, formatDate } from "@/components/ui/format";

// 1. Actualizamos la interfaz TypeScript
interface Gasto {
    id: number;
    descripcion: string;
    monto: number;
    pagado_por_nombre: string;
    fecha_gasto: string;
    comprobante_url?: string; // <-- Nuevo campo opcional
}

export default function FinanzasPage() {
    const { bandaActiva } = useBanda();

    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [descripcion, setDescripcion] = useState("");
    const [monto, setMonto] = useState("");
    const [comprobanteUrl, setComprobanteUrl] = useState(""); // <-- Nuevo estado
    const [procesando, setProcesando] = useState(false);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);

    useEffect(() => {
        if (!bandaActiva) return;

        const cargarGastos = async () => {
            const token = localStorage.getItem("access_token");
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/v1/gastos/?banda=${bandaActiva.id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setGastos(data);
                }
            } catch (error) {
                console.error("Error al cargar finanzas:", error);
            }
        };

        cargarGastos();
    }, [bandaActiva]);

    const handleRegistrarPago = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bandaActiva) return;

        setProcesando(true);
        const token = localStorage.getItem("access_token");

        try {
            const res = await fetch("http://127.0.0.1:8000/api/v1/gastos/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    descripcion: descripcion,
                    monto: parseInt(monto),
                    banda: bandaActiva.id,
                    comprobante_url: comprobanteUrl || null // <-- Lo enviamos al backend
                })
            });

            if (res.ok) {
                const nuevoGasto = await res.json();
                setGastos([nuevoGasto, ...gastos]);
                setDescripcion("");
                setMonto("");
                setComprobanteUrl(""); // Limpiamos el campo
                setMostrarFormulario(false);
            } else {
                alert("Error al registrar el gasto en el servidor.");
            }
        } catch (error) {
            alert("Error de red.");
        } finally {
            setProcesando(false);
        }
    };

    if (!bandaActiva) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-lg" style={{ color: "var(--ba-text-muted)" }}>
                    Selecciona un proyecto activo en la parte superior para ver sus finanzas.
                </p>
            </div>
        );
    }

    const ahora = new Date();
    const totalHistorico = gastos.reduce((acc, g) => acc + Number(g.monto), 0);
    const totalMes = gastos
        .filter((g) => {
            const d = new Date(g.fecha_gasto);
            return d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth();
        })
        .reduce((acc, g) => acc + Number(g.monto), 0);
    const promedio = gastos.length ? totalHistorico / gastos.length : 0;

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-8">

            <StatGrid>
                <StatCard
                    label="Gasto total"
                    value={formatCLP(totalHistorico)}
                    hint={`${gastos.length} movimientos`}
                    icon="report-money"
                />
                <StatCard
                    label="Gasto del mes"
                    value={formatCLP(totalMes)}
                    hintTone="brand"
                    icon="calendar-stats"
                />
                <StatCard
                    label="Promedio por gasto"
                    value={formatCLP(promedio)}
                    icon="receipt"
                />
            </StatGrid>

            <div className="flex justify-between items-center">
                <h2 className="ba-section-title">Historial de movimientos</h2>
                <Button variant="primary" icon="plus" onClick={() => setMostrarFormulario(true)}>
                    Registrar pago
                </Button>
            </div>

            {gastos.length === 0 ? (
                <Card>
                    <EmptyState
                        icon="report-money"
                        title="Sin gastos registrados"
                        body={`Todavía no hay movimientos en ${bandaActiva.nombre}.`}
                    />
                </Card>
            ) : (
                <Card flush style={{ overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                        <table className="ba-table">
                            <thead>
                                <tr>
                                    <th>Descripción</th>
                                    <th>Pagado por</th>
                                    <th>Fecha</th>
                                    <th className="ba-num">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gastos.map((gasto) => (
                                    <tr key={gasto.id}>
                                        <td style={{ color: "var(--ba-text)", fontWeight: 500 }}>
                                            <div className="flex items-center gap-2">
                                                <span>{gasto.descripcion}</span>
                                                {gasto.comprobante_url && (
                                                    <a
                                                        href={gasto.comprobante_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Ver comprobante"
                                                        style={{ color: "var(--ba-brand)" }}
                                                    >
                                                        <i className="ti ti-external-link" aria-hidden="true" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <Badge tone="brand">{gasto.pagado_por_nombre || "Desconocido"}</Badge>
                                        </td>
                                        <td style={{ color: "var(--ba-text-muted)" }}>{formatDate(gasto.fecha_gasto)}</td>
                                        <td className="ba-num" style={{ color: "var(--ba-success)", fontWeight: 600 }}>
                                            {formatCLP(gasto.monto)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* FORMULARIO DE REGISTRO (lateral -> modal en cualquier tamaño de pantalla) */}
            <Modal open={mostrarFormulario} onClose={() => setMostrarFormulario(false)} title="Registrar nuevo pago">
                <form onSubmit={handleRegistrarPago} className="space-y-4">
                    <Field label="Descripción">
                        <Input
                            type="text" required
                            value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Ej: Shure SM58"
                        />
                    </Field>
                    <Field label="Monto (CLP)">
                        <Input
                            type="number" required min="1"
                            value={monto} onChange={(e) => setMonto(e.target.value)}
                            placeholder="159990"
                        />
                    </Field>
                    <Field label="Link del comprobante" hint="Opcional">
                        <Input
                            type="url"
                            value={comprobanteUrl} onChange={(e) => setComprobanteUrl(e.target.value)}
                            placeholder="https://drive.google.com/..."
                        />
                    </Field>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setMostrarFormulario(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" disabled={procesando}>
                            {procesando ? "Procesando..." : "Registrar pago"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
