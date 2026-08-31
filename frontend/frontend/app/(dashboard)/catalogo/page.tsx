"use client";

import { useState, useEffect } from "react";
import { useBanda } from "@/context/BandaContext";
import { Card, Field, Input, Button, Badge, EmptyState, Modal } from "@/components/ui/ui";

type EstadoCancion = 'Por tocar' | 'En Aprendizaje' | 'Repertorio Activo';

interface Cancion {
    id: number;
    titulo: string;
    artista: string;
    estado: EstadoCancion;
    partitura?: string;
    en_setlist?: boolean;
}

const COLUMNAS: { estado: EstadoCancion; label: string; dot: string }[] = [
    { estado: 'Por tocar', label: 'Por Tocar', dot: 'var(--ba-status-por-tocar)' },
    { estado: 'En Aprendizaje', label: 'En Aprendizaje', dot: 'var(--ba-status-aprendizaje)' },
    { estado: 'Repertorio Activo', label: 'Repertorio Activo', dot: 'var(--ba-status-activo)' },
];

export default function CatalogoPage() {
    const { bandaActiva } = useBanda();
    const [canciones, setCanciones] = useState<Cancion[]>([]);
    const [cargando, setCargando] = useState(true);

    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [nuevoTitulo, setNuevoTitulo] = useState("");
    const [nuevoArtista, setNuevoArtista] = useState("");
    const [archivoPartitura, setArchivoPartitura] = useState<File | null>(null);
    const [procesando, setProcesando] = useState(false);

    // Cargar Catálogo (Solo las que NO son maquetas)
    useEffect(() => {
        if (!bandaActiva) return;

        const cargarCatalogo = async () => {
            setCargando(true);
            const token = localStorage.getItem("access_token");
            try {
                // Al no enviar &maquetas=true, el backend nos traerá el catálogo oficial
                const res = await fetch(`http://127.0.0.1:8000/api/v1/canciones/?banda=${bandaActiva.id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCanciones(data);
                }
            } catch (error) {
                console.error("Error al cargar el catálogo:", error);
            } finally {
                setCargando(false);
            }
        };

        cargarCatalogo();
    }, [bandaActiva]);

    // --- ACTUALIZAR COLUMNA (DRAG & DROP) ---
    const actualizarEstadoCancion = async (id: number, nuevoEstado: EstadoCancion) => {
        const copiaOriginal = [...canciones];
        setCanciones(prev => prev.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c));

        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/v1/canciones/${id}/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (!res.ok) throw new Error("Error en el servidor");
        } catch (error) {
            setCanciones(copiaOriginal);
            alert("No se pudo guardar el cambio de estado.");
        }
    };

    // --- ALTERNAR SETLIST DE LA SEMANA ---
    const toggleSetlist = async (id: number, valorActual: boolean) => {
        setCanciones(prev => prev.map(c => c.id === id ? { ...c, en_setlist: !valorActual } : c));

        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/v1/canciones/${id}/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ en_setlist: !valorActual })
            });

            if (!res.ok) throw new Error("Error al actualizar");
        } catch (error) {
            setCanciones(prev => prev.map(c => c.id === id ? { ...c, en_setlist: valorActual } : c));
            alert("Error al actualizar el setlist en el servidor.");
        }
    };

    // --- ELIMINAR CANCIÓN ---
    const handleEliminarCancion = async (id: number) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar esta canción del catálogo? Esta acción no se puede deshacer.")) return;

        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/v1/canciones/${id}/`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok || res.status === 204) {
                // Actualización optimista
                setCanciones(prev => prev.filter(c => c.id !== id));
            } else {
                alert("Hubo un problema al intentar eliminar la canción.");
            }
        } catch (error) {
            alert("Error de red al intentar conectar con el servidor.");
        }
    };

    // --- MANEJO DE DRAG AND DROP ---
    const handleOnDragStart = (e: React.DragEvent, cancionId: number) => {
        e.dataTransfer.setData("cancionId", cancionId.toString());
        const target = e.target as HTMLElement;
        target.style.opacity = '0.5';
    };

    const handleOnDragEnd = (e: React.DragEvent) => {
        const target = e.target as HTMLElement;
        target.style.opacity = '1';
    };

    const handleOnDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleOnDrop = (e: React.DragEvent, targetEstado: EstadoCancion) => {
        e.preventDefault();
        const cancionIdStr = e.dataTransfer.getData("cancionId");
        if (!cancionIdStr) return;

        const cancionId = parseInt(cancionIdStr);
        const cancionAmover = canciones.find(c => c.id === cancionId);

        if (cancionAmover && cancionAmover.estado !== targetEstado) {
            actualizarEstadoCancion(cancionId, targetEstado);
        }
    };

    // --- GUARDAR CANCIÓN UTILIZANDO FORMDATA ---
    const handleAgregarCancion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bandaActiva) return;
        setProcesando(true);

        const token = localStorage.getItem("access_token");
        const formData = new FormData();

        formData.append("banda", bandaActiva.id.toString());
        formData.append("titulo", nuevoTitulo);
        formData.append("artista", nuevoArtista);
        formData.append("estado", "Por tocar");
        formData.append("en_setlist", "false");
        // No enviamos archivo de audio, por lo que el backend lo guardará como es_maqueta=False

        if (archivoPartitura) {
            formData.append("partitura", archivoPartitura);
        }

        try {
            const res = await fetch("http://127.0.0.1:8000/api/v1/canciones/", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                const nuevaCancion = await res.json();
                setCanciones([nuevaCancion, ...canciones]);
                setNuevoTitulo("");
                setNuevoArtista("");
                setArchivoPartitura(null);
                setMostrarFormulario(false);
            } else {
                alert("Error del servidor al guardar la canción.");
            }
        } catch (error) {
            alert("Error de red.");
        } finally {
            setProcesando(false);
        }
    };

    if (!bandaActiva) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <EmptyState
                    icon="disc"
                    title="Ningún proyecto seleccionado"
                    body="Selecciona un proyecto activo para administrar su catálogo musical."
                />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <Card className="flex justify-between items-center">
                <div>
                    <h1 className="ba-page-title" style={{ marginBottom: 4 }}>Catálogo Musical</h1>
                    <p style={{ color: "var(--ba-text-muted)", margin: 0 }}>
                        Repertorio y estado de aprendizaje para{" "}
                        <strong style={{ color: "var(--ba-brand)" }}>{bandaActiva.nombre}</strong>
                    </p>
                </div>
                <Button variant="primary" icon="plus" onClick={() => setMostrarFormulario(true)}>
                    Nueva canción
                </Button>
            </Card>

            <Modal open={mostrarFormulario} onClose={() => setMostrarFormulario(false)} title="Nueva canción">
                <form onSubmit={handleAgregarCancion} className="space-y-4">
                    <Field label="Título de la canción">
                        <Input
                            type="text" required value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)}
                            placeholder="Ej: Tren al Sur..."
                        />
                    </Field>
                    <Field label="Artista original / compositor">
                        <Input
                            type="text" value={nuevoArtista} onChange={(e) => setNuevoArtista(e.target.value)}
                            placeholder="Ej: Los Prisioneros..."
                        />
                    </Field>

                    <div className="p-4 rounded-lg" style={{ background: "var(--ba-bg)", border: "1px solid var(--ba-border)" }}>
                        <label className="ba-label">
                            Adjuntar partitura, tablatura o cifrado{" "}
                            <span style={{ color: "var(--ba-text-subtle)", fontWeight: 400 }}>(Opcional, PDF)</span>
                        </label>
                        <input
                            type="file" accept=".pdf"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    setArchivoPartitura(e.target.files[0]);
                                }
                            }}
                            className="block w-full text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:cursor-pointer"
                            style={{ color: "var(--ba-text-muted)" }}
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setMostrarFormulario(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" disabled={procesando}>
                            {procesando ? "Guardando..." : "Agregar al repertorio"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {cargando ? (
                <p className="text-center animate-pulse py-10" style={{ color: "var(--ba-text-muted)" }}>
                    Sincronizando catálogo...
                </p>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {COLUMNAS.map(({ estado, label, dot }) => (
                        <div
                            key={estado}
                            className="rounded-2xl p-5 min-h-75"
                            style={{ background: "var(--ba-surface-2)", border: "1px solid var(--ba-border)" }}
                            onDragOver={handleOnDragOver}
                            onDrop={(e) => handleOnDrop(e, estado)}
                        >
                            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2.5" style={{ color: "var(--ba-text-muted)" }}>
                                <span className="w-3 h-3 rounded-full" style={{ background: dot }}></span>
                                {label}
                                <Badge className="ml-auto">{canciones.filter(c => c.estado === estado).length}</Badge>
                            </h2>
                            <div className="space-y-4">
                                {canciones.filter(c => c.estado === estado).map(cancion => (
                                    <TarjetaCancion
                                        key={cancion.id}
                                        cancion={cancion}
                                        onDragStart={handleOnDragStart}
                                        onDragEnd={handleOnDragEnd}
                                        onToggleSetlist={toggleSetlist}
                                        onEliminar={handleEliminarCancion}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- SUB-COMPONENTE: TARJETA DE CANCIÓN ---
interface TarjetaCancionProps {
    cancion: Cancion;
    onDragStart: (e: React.DragEvent, id: number) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onToggleSetlist: (id: number, valorActual: boolean) => void;
    onEliminar: (id: number) => void;
}

function TarjetaCancion({ cancion, onDragStart, onDragEnd, onToggleSetlist, onEliminar }: TarjetaCancionProps) {
    const enSetlist = cancion.en_setlist || false;

    return (
        <Card
            interactive
            className="cursor-grab active:cursor-grabbing flex items-center justify-between gap-4"
            style={{ padding: "var(--ba-space-4)" }}
            draggable="true"
            onDragStart={(e) => onDragStart(e, cancion.id)}
            onDragEnd={onDragEnd}
        >
            <div className="flex items-center gap-3 min-w-0">
                <i className="ti ti-grip-vertical" aria-hidden="true" style={{ color: "var(--ba-text-subtle)" }} />
                <div className="truncate">
                    <h3 className="font-bold text-base leading-tight truncate" style={{ color: "var(--ba-text)" }}>{cancion.titulo}</h3>
                    <p className="text-xs truncate" style={{ color: "var(--ba-text-muted)" }}>{cancion.artista || "Autor Desconocido"}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">

                {/* BOTÓN ESTRELLA: SETLIST DE LA SEMANA */}
                <button
                    onClick={() => onToggleSetlist(cancion.id, enSetlist)}
                    title={enSetlist ? "Quitar del Setlist de esta semana" : "Agregar al Setlist de esta semana"}
                    className="ba-icon-btn"
                    style={enSetlist ? { color: "var(--ba-warning)", background: "var(--ba-warning-soft)" } : undefined}
                >
                    <i className={`ti ${enSetlist ? "ti-star-filled" : "ti-star"}`} aria-hidden="true" />
                </button>

                {/* BOTÓN DESCARGA/VISTA DE PARTITURA */}
                {cancion.partitura && (
                    <a
                        href={cancion.partitura}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir partitura PDF"
                        className="ba-icon-btn"
                        style={{ color: "var(--ba-danger)" }}
                    >
                        <i className="ti ti-file-type-pdf" aria-hidden="true" />
                    </a>
                )}

                {/* BOTÓN ELIMINAR CANCIÓN */}
                <button
                    onClick={() => onEliminar(cancion.id)}
                    title="Eliminar del Catálogo"
                    className="ba-icon-btn ba-icon-btn--danger"
                >
                    <i className="ti ti-trash" aria-hidden="true" />
                </button>
            </div>
        </Card>
    );
}
