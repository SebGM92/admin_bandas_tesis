"use client";

import { useState, useEffect } from "react";
import { useBanda } from "@/context/BandaContext";

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

    // Cargar los ensayos de la banda activa
    useEffect(() => {
        if (!bandaActiva) return;

        const cargarEnsayos = async () => {
            const token = localStorage.getItem("access_token");
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/v1/ensayos/?banda=${bandaActiva.id}`, {
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
            const res = await fetch("http://127.0.0.1:8000/api/v1/ensayos/", {
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
            } else {
                alert("Error al guardar el ensayo. Verifica los datos.");
            }
        } catch (error) {
            alert("Error de red al conectar con el servidor.");
        } finally {
            setProcesando(false);
        }
    };

    // Función auxiliar para formatear la fecha de forma legible
    const formatearRangoHorario = (inicioStr: string, finStr: string) => {
        const fechaInicio = new Date(inicioStr);
        const fechaFin = new Date(finStr);

        const opcionesFecha: Intl.DateTimeFormatOptions = {
            weekday: 'long', day: 'numeric', month: 'long'
        };
        const opcionesHora: Intl.DateTimeFormatOptions = {
            hour: '2-digit', minute: '2-digit', hour12: false
        };

        const fechaBase = fechaInicio.toLocaleDateString('es-CL', opcionesFecha);
        const horaInicio = fechaInicio.toLocaleTimeString('es-CL', opcionesHora);
        const horaFin = fechaFin.toLocaleTimeString('es-CL', opcionesHora);

        return `${fechaBase} | ${horaInicio} - ${horaFin}`;
    };

    if (!bandaActiva) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 text-lg">Selecciona un proyecto activo en la parte superior para administrar sus ensayos.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 flex flex-col lg:flex-row gap-8">

            {/* AGENDAR NUEVO ENSAYO */}
            <div className="w-full lg:w-1/3">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg sticky top-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        📅 Agendar Nuevo Ensayo
                    </h2>
                    <form onSubmit={handleGuardarEnsayo} className="space-y-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Inicio del Ensayo</label>
                            <input
                                type="datetime-local" required
                                value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white text-sm outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Fin del Ensayo</label>
                            <input
                                type="datetime-local" required
                                value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white text-sm outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Ubicación o Link de Reunión</label>
                            <input
                                type="text"
                                value={ubicacion} onChange={(e) => setUbicacion(e.target.value)}
                                placeholder="Ej: Sala 3 (Estudio) o Link de Zoom/Meet"
                                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white text-sm outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Objetivo del Ensayo</label>
                            <textarea
                                value={objetivo} onChange={(e) => setObjetivo(e.target.value)}
                                rows={3}
                                placeholder="Ej: Pulir las transiciones del setlist y revisar estructuras..."
                                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white text-sm outline-none focus:border-blue-500 resize-none"
                            />
                        </div>

                        <button
                            type="submit" disabled={procesando}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 shadow-md"
                        >
                            {procesando ? "Guardando..." : "Guardar Ensayo"}
                        </button>
                    </form>
                </div>
            </div>

            {/* CRONOGRAMA DE ENSAYOS (HISTORIAL / PRÓXIMOS) */}
            <div className="w-full lg:w-2/3">
                <h2 className="text-2xl font-bold text-white mb-6">Agenda de Ensayos: {bandaActiva.nombre}</h2>

                {ensayos.length === 0 ? (
                    <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center text-gray-400">
                        No hay ensayos agendados para este proyecto musical todavía.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {ensayos.map((ensayo) => {
                            const esPasado = new Date(ensayo.fecha_hora_fin) < new Date();

                            return (
                                <div
                                    key={ensayo.id}
                                    className={`p-5 rounded-xl border transition shadow-sm flex flex-col gap-4 ${esPasado
                                        ? 'bg-gray-800/40 border-gray-800 text-gray-500'
                                        : 'bg-gray-800 border-gray-700 hover:border-blue-500 text-white'
                                        }`}
                                >
                                    {/* CABECERA: Fecha/Hora y Ubicación */}
                                    <div className="flex flex-col xl:flex-row justify-between items-start gap-4">

                                        {/* Título y Fecha */}
                                        <div className="flex items-center gap-2 w-full">
                                            <span className="text-xl shrink-0">⏱️</span>
                                            <p className={`font-semibold capitalize text-lg ${esPasado ? 'text-gray-500' : 'text-blue-400'}`}>
                                                {formatearRangoHorario(ensayo.fecha_hora_inicio, ensayo.fecha_hora_fin)}
                                            </p>
                                            {esPasado && (
                                                <span className="bg-gray-700 text-gray-400 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ml-auto xl:ml-2">
                                                    Realizado
                                                </span>
                                            )}
                                        </div>

                                        {/* ETIQUETA DE UBICACIÓN (Mejorada para no cortarse) */}
                                        {ensayo.ubicacion && (
                                            <div className="flex items-start gap-2 bg-gray-900/60 border border-gray-700/80 px-3.5 py-2 rounded-lg w-full xl:w-auto xl:max-w-xs shrink-0">
                                                <span className="text-red-400 mt-0.5 shrink-0">📍</span>
                                                {ensayo.ubicacion.startsWith("http") ? (
                                                    <a
                                                        href={ensayo.ubicacion} target="_blank" rel="noopener noreferrer"
                                                        className="text-blue-400 hover:underline text-sm leading-snug wrap-break-word whitespace-normal"
                                                    >
                                                        Enlace Virtual
                                                    </a>
                                                ) : (
                                                    <span className={`text-sm leading-snug wrap-break-word whitespace-normal ${esPasado ? 'text-gray-500' : 'text-gray-300'}`}>
                                                        {ensayo.ubicacion}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* CUERPO: Objetivo */}
                                    {ensayo.objetivo && (
                                        <div className={`${esPasado ? 'text-gray-600' : 'text-gray-300'}`}>
                                            <p className="text-sm leading-relaxed">
                                                <strong className="text-gray-400">Objetivo:</strong> {ensayo.objetivo}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
