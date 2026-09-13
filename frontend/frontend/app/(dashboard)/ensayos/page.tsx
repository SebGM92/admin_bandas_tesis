"use client";

import { useState, useEffect } from "react";
import { useBanda } from "@/context/BandaContext";
import { Card, Field, Input, Textarea, Button, Badge, EmptyState, Modal } from "@/components/ui/ui";
import { groupByDay, formatTimeRange } from "@/components/ui/format";

// 🔥 CAMBIO CRÍTICO: Definimos la URL de la API dinámicamente
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Ensayo {
    id: number;
    fecha_hora_inicio: string;
    fecha_hora_fin: string;
    ubicacion: string;
    objetivo: string;
}

export default function EnsayosPage() {
    const { bandaActiva } = useBanda();

    const [ensayos, setEnsayos] = useState<Ensayo[]>([]);
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [ubicacion, setUbicacion] = useState("");
    const [objetivo, setObjetivo] = useState("");
    const [procesando, setProcesando] = useState(false);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);

    // Cargar los ensayos de la banda activa
    useEffect(() => {
        if (!bandaActiva) return;

        const cargarEnsayos = async () => {
            const token = localStorage.getItem("access_token");
            try {
                const res = await fetch(`${API_URL}/api/v1/ensayos/?banda=${bandaActiva.id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setEnsayos(data);
                }
            } catch (error) {
                console.error("Error al cargar los ensayos:", error);
            }
        };

        cargarEnsayos();
    }, [bandaActiva]);

    const handleGuardarEnsayo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bandaActiva) return;

        // Validación lógica de negocio: la fecha de fin no puede ser anterior a la de inicio
        if (new Date(fechaFin) <= new Date(fechaInicio)) {
            alert("La fecha de finalización debe ser posterior a la fecha de inicio.");
            return;
        }

        setProcesando(true);
        const token = localStorage.getItem("access_token");

        try {
            const res = await fetch(`${API_URL}/api/v1/ensayos/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    banda: bandaActiva.id,
                    // Convertimos la hora local a UTC antes de enviarla al servidor
                    fecha_hora_inicio: new Date(fechaInicio).toISOString(),
                    fecha_hora_fin: new Date(fechaFin).toISOString(),
                    ubicacion: ubicacion,
                    objetivo: objetivo
                })
            });

            if (res.ok) {
                const nuevoEnsayo = await res.json();
                // Sincronizamos el estado de inmediato y ordenamos cronológicamente
                const listaActualizada = [...ensayos, nuevoEnsayo].sort(
                    (a, b) => new Date(a.fecha_hora_inicio).getTime() - new Date(b.fecha_hora_inicio).getTime()
                );
                setEnsayos(listaActualizada);

                // Limpiamos el formulario
                setFechaInicio("");
                setFechaFin("");
                setUbicacion("");
                setObjetivo("");
                setMostrarFormulario(false);
            } else {
                alert("Error al guardar el ensayo. Verifica los datos.");
            }
        } catch (error) {
            alert("Error de red al conectar con el servidor.");
        } finally {
            setProcesando(false);
        }
    };

    if (!bandaActiva) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-lg" style={{ color: "var(--ba-text-muted)" }}>
                    Selecciona un proyecto activo en la parte superior para administrar sus ensayos.
                </p>
            </div>
        );
    }

    const dias = groupByDay(ensayos, (e) => e.fecha_hora_inicio);

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            <div className="flex justify-between items-center">
                <h2 className="ba-section-title">Agenda de Ensayos: {bandaActiva.nombre}</h2>
                <Button variant="primary" icon="plus" onClick={() => setMostrarFormulario(true)}>
                    Agendar ensayo
                </Button>
            </div>

            <div>
                {ensayos.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon="calendar-event"
                            title="Sin ensayos agendados"
                            body="Todavía no hay ensayos agendados para este proyecto musical."
                        />
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {dias.map((dia) => (
                            <section key={dia.key}>
                                <p className="ba-label" style={{ marginBottom: "var(--ba-space-3)" }}>{dia.heading}</p>
                                <div className="space-y-4">
                                    {dia.items.map((ensayo) => {
                                        const esPasado = new Date(ensayo.fecha_hora_fin) < new Date();
                                        const esLink = ensayo.ubicacion?.startsWith("http");

                                        return (
                                            <Card
                                                key={ensayo.id}
                                                nested={esPasado}
                                                className="flex flex-col gap-4"
                                            >
                                                {/* CABECERA: Hora y ubicación */}
                                                <div className="flex flex-col xl:flex-row justify-between items-start gap-4">
                                                    <div className="flex items-center gap-2 w-full">
                                                        <i
                                                            className="ti ti-clock"
                                                            aria-hidden="true"
                                                            style={{ color: esPasado ? "var(--ba-text-subtle)" : "var(--ba-brand)" }}
                                                        />
                                                        <p
                                                            className="font-semibold text-lg"
                                                            style={{ color: esPasado ? "var(--ba-text-subtle)" : "var(--ba-brand)" }}
                                                        >
                                                            {formatTimeRange(ensayo.fecha_hora_inicio, ensayo.fecha_hora_fin)}
                                                        </p>
                                                        {esPasado && <Badge className="ml-auto xl:ml-2">Realizado</Badge>}
                                                    </div>

                                                    {ensayo.ubicacion && (
                                                        esLink ? (
                                                            <a href={ensayo.ubicacion} target="_blank" rel="noopener noreferrer">
                                                                <Badge tone="brand" icon="map-pin">Enlace virtual</Badge>
                                                            </a>
                                                        ) : (
                                                            <Badge icon="map-pin">{ensayo.ubicacion}</Badge>
                                                        )
                                                    )}
                                                </div>

                                                {/* CUERPO: Objetivo (truncado a 2 líneas) */}
                                                {ensayo.objetivo && (
                                                    <p
                                                        className="text-sm leading-relaxed ba-clamp-2"
                                                        style={{ color: esPasado ? "var(--ba-text-subtle)" : "var(--ba-text-muted)" }}
                                                    >
                                                        <strong style={{ color: esPasado ? "var(--ba-text-subtle)" : "var(--ba-text)" }}>
                                                            Objetivo:
                                                        </strong>{" "}
                                                        {ensayo.objetivo}
                                                    </p>
                                                )}
                                            </Card>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>

            {/* AGENDAR NUEVO ENSAYO (lateral -> modal en cualquier tamaño de pantalla) */}
            <Modal open={mostrarFormulario} onClose={() => setMostrarFormulario(false)} title="Agendar nuevo ensayo">
                <form onSubmit={handleGuardarEnsayo} className="space-y-4">
                    <Field label="Inicio del ensayo">
                        <Input
                            type="datetime-local" required
                            value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                        />
                    </Field>

                    <Field label="Fin del ensayo">
                        <Input
                            type="datetime-local" required
                            value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                        />
                    </Field>

                    <Field label="Ubicación o link de reunión">
                        <Input
                            type="text"
                            value={ubicacion} onChange={(e) => setUbicacion(e.target.value)}
                            placeholder="Ej: Sala 3 (Estudio) o Link de Zoom/Meet"
                        />
                    </Field>

                    <Field label="Objetivo del ensayo">
                        <Textarea
                            value={objetivo} onChange={(e) => setObjetivo(e.target.value)}
                            rows={3}
                            placeholder="Ej: Pulir las transiciones del setlist y revisar estructuras..."
                        />
                    </Field>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setMostrarFormulario(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" disabled={procesando}>
                            {procesando ? "Guardando..." : "Guardar ensayo"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
