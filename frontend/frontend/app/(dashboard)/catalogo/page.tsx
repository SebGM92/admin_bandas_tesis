"use client";

import { useState, useEffect } from "react";
import { useBanda } from "@/context/BandaContext";

type EstadoCancion = 'Por tocar' | 'En Aprendizaje' | 'Repertorio Activo';

interface Cancion {
    id: number;
    titulo: string;
    artista: string;
    estado: EstadoCancion;
    partitura?: string;
    en_setlist?: boolean;
}

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

    // --- NUEVO: ELIMINAR CANCIÓN ---
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
            <div className="flex flex-col items-center justify-center h-[60vh] text-center text-gray-500">
                Selecciona un proyecto activo para administrar su Catálogo Musical.
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-8">
            <div className="flex justify-between items-center bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg">
                <div>
                    <h1 className="text-3xl font-bold text-white">Catálogo Musical</h1>
                    <p className="text-gray-400">Repertorio y estado de aprendizaje para <strong className="text-blue-400">{bandaActiva.nombre}</strong></p>
                </div>
                <button
                    onClick={() => setMostrarFormulario(!mostrarFormulario)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-lg shadow transition"
                >
                    {mostrarFormulario ? "✕ Cerrar Panel" : "＋ Nueva Canción"}
                </button>
            </div>

            {mostrarFormulario && (
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-inner">
                    <form onSubmit={handleAgregarCancion} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1.5 font-medium">Título de la Canción</label>
                                <input
                                    type="text" required value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)}
                                    placeholder="Ej: Tren al Sur..."
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1.5 font-medium">Artista Original / Compositor</label>
                                <input
                                    type="text" value={nuevoArtista} onChange={(e) => setNuevoArtista(e.target.value)}
                                    placeholder="Ej: Los Prisioneros..."
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                            <label className="block text-gray-400 text-sm mb-2 font-medium">
                                Adjuntar Partitura, Tablatura o Cifrado <span className="text-gray-500 text-xs">(Opcional - Formato PDF)</span>
                            </label>
                            <input
                                type="file" accept=".pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setArchivoPartitura(e.target.files[0]);
                                    }
                                }}
                                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600 file:cursor-pointer cursor-pointer"
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit" disabled={procesando}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg transition disabled:opacity-50"
                            >
                                {procesando ? "Guardando..." : "Agregar al Repertorio"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {cargando ? (
                <p className="text-center text-gray-400 animate-pulse py-10">Sincronizando catálogo...</p>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                    {/* COLUMNA 1: POR TOCAR */}
                    <div className="bg-gray-900/40 rounded-2xl p-5 border border-gray-800/50 min-h-75" onDragOver={handleOnDragOver} onDrop={(e) => handleOnDrop(e, 'Por tocar')}>
                        <h2 className="text-lg font-semibold text-gray-400 mb-5 flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full bg-gray-600"></span>
                            Por Tocar
                            <span className="bg-gray-800 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-md ml-auto">
                                {canciones.filter(c => c.estado === 'Por tocar').length}
                            </span>
                        </h2>
                        <div className="space-y-4">
                            {canciones.filter(c => c.estado === 'Por tocar').map(cancion => (
                                <TarjetaCancion
                                    key={cancion.id}
                                    cancion={cancion}
                                    onDragStart={handleOnDragStart}
                                    onDragEnd={handleOnDragEnd}
                                    onToggleSetlist={toggleSetlist}
                                    onEliminar={handleEliminarCancion} // Pasamos la nueva función
                                />
                            ))}
                        </div>
                    </div>

                    {/* COLUMNA 2: EN APRENDIZAJE */}
                    <div className="bg-gray-900/40 rounded-2xl p-5 border border-gray-800/50 min-h-75" onDragOver={handleOnDragOver} onDrop={(e) => handleOnDrop(e, 'En Aprendizaje')}>
                        <h2 className="text-lg font-semibold text-amber-300 mb-5 flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                            En Aprendizaje
                            <span className="bg-gray-800 text-amber-500/80 text-xs font-bold px-2 py-0.5 rounded-md ml-auto">
                                {canciones.filter(c => c.estado === 'En Aprendizaje').length}
                            </span>
                        </h2>
                        <div className="space-y-4">
                            {canciones.filter(c => c.estado === 'En Aprendizaje').map(cancion => (
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

                    {/* COLUMNA 3: REPERTORIO ACTIVO */}
                    <div className="bg-gray-900/40 rounded-2xl p-5 border border-gray-800/50 min-h-75" onDragOver={handleOnDragOver} onDrop={(e) => handleOnDrop(e, 'Repertorio Activo')}>
                        <h2 className="text-lg font-semibold text-emerald-400 mb-5 flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                            Repertorio Activo
                            <span className="bg-gray-800 text-emerald-500/80 text-xs font-bold px-2 py-0.5 rounded-md ml-auto">
                                {canciones.filter(c => c.estado === 'Repertorio Activo').length}
                            </span>
                        </h2>
                        <div className="space-y-4">
                            {canciones.filter(c => c.estado === 'Repertorio Activo').map(cancion => (
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
    onEliminar: (id: number) => void; // Prop para el botón de eliminar
}

function TarjetaCancion({ cancion, onDragStart, onDragEnd, onToggleSetlist, onEliminar }: TarjetaCancionProps) {
    return (
        <div
            className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow hover:border-gray-500 transition-all duration-150 cursor-grab active:cursor-grabbing flex items-center justify-between gap-4 group"
            draggable="true"
            onDragStart={(e) => onDragStart(e, cancion.id)}
            onDragEnd={onDragEnd}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </div>
                <div className="truncate">
                    <h3 className="font-bold text-white text-base leading-tight truncate">{cancion.titulo}</h3>
                    <p className="text-xs text-gray-400 truncate">{cancion.artista || "Autor Desconocido"}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">

                {/* BOTÓN ESTRELLA: SETLIST DE LA SEMANA */}
                <button
                    onClick={() => onToggleSetlist(cancion.id, cancion.en_setlist || false)}
                    title={cancion.en_setlist ? "Quitar del Setlist de esta semana" : "Agregar al Setlist de esta semana"}
                    className={`transition p-1 rounded-md border ${cancion.en_setlist
                        ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/30 hover:bg-yellow-400/20"
                        : "text-gray-500 bg-gray-900/50 border-gray-700 hover:text-yellow-400 hover:border-gray-600"
                        }`}
                >
                    <svg className="w-5 h-5" fill={cancion.en_setlist ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                </button>

                {/* BOTÓN DESCARGA/VISTA DE PARTITURA */}
                {cancion.partitura && (
                    <a
                        href={cancion.partitura}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir partitura PDF"
                        className="text-red-400 hover:text-red-300 transition p-1 bg-gray-900/50 rounded-md border border-gray-700"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </a>
                )}

                {/* BOTÓN ELIMINAR CANCIÓN (Basurero) */}
                <button
                    onClick={() => onEliminar(cancion.id)}
                    title="Eliminar del Catálogo"
                    className="text-gray-500 hover:text-red-400 bg-gray-900/50 hover:bg-gray-800 transition p-1 rounded-md border border-gray-700 hover:border-red-400/30"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>

                {/* PUNTO DE COLOR DEL ESTADO */}
                <span className={`w-2 h-2 ml-1 rounded-full ${cancion.estado === 'Repertorio Activo' ? 'bg-emerald-500' :
                    cancion.estado === 'En Aprendizaje' ? 'bg-amber-500' :
                        'bg-gray-600'
                    }`}></span>
            </div>
        </div>
    );
}