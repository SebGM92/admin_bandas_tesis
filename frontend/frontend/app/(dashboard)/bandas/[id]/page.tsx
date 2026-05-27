"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface BandaDetalle {
    id: number;
    nombre: string;
    genero_musical: string;
    fecha_creacion: string;
}

// --- NUEVA INTERFAZ PARA LAS PISTAS ---
interface Pista {
    id: number;
    titulo: string;
    archivo_audio: string; // La URL que nos devolverá Django
}

export default function PerfilBanda() {
    const params = useParams();
    const id = params.id;

    const [banda, setBanda] = useState<BandaDetalle | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    // --- ESTADOS DE DATOS ---
    const [alineacion, setAlineacion] = useState<any[]>([]);
    const [pistas, setPistas] = useState<Pista[]>([]); // Estado para las canciones grabadas

    // --- ESTADOS DEL MODAL ---
    const [mostrarModal, setMostrarModal] = useState(false);
    const [tituloCancion, setTituloCancion] = useState("");
    const [modo, setModo] = useState<"archivo" | "grabar">("archivo");
    const [subiendo, setSubiendo] = useState(false);
    const [mensajeSubida, setMensajeSubida] = useState("");

    // --- ESTADOS PARA ARCHIVO ---
    const [archivoAudio, setArchivoAudio] = useState<File | null>(null);

    // --- ESTADOS PARA GRABACIÓN WEB ---
    const [grabando, setGrabando] = useState(false);
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);

    // 1. Cargar detalles de la banda
    useEffect(() => {
        const cargarDetalleBanda = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

            try {
                const res = await fetch(`${baseUrl}/api/v1/bandas/${id}/`, {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${token}` },
                });
                if (res.ok) setBanda(await res.json());
            } catch (err) {
                setError("Error de conexión.");
            } finally {
                setCargando(false);
            }
        };
        cargarDetalleBanda();
    }, [id]);

    // 2. Cargar la alineación (miembros)
    useEffect(() => {
        const cargarAlineacion = async () => {
            const token = localStorage.getItem("access_token");
            if (!token || !id) return;

            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

            try {
                const res = await fetch(`${baseUrl}/api/v1/membresias/?banda=${id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setAlineacion(data);
                }
            } catch (error) {
                console.error("Error al cargar alineación:", error);
            }
        };
        cargarAlineacion();
    }, [id]);

    // 3. Cargar las Pistas y Maquetas
    useEffect(() => {
        const cargarPistas = async () => {
            const token = localStorage.getItem("access_token");
            if (!token || !id) return;

            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

            try {
                // AÑADIMOS EL PARÁMETRO: &maquetas=true al final de la URL
                const res = await fetch(`${baseUrl}/api/v1/canciones/?banda=${id}&maquetas=true`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPistas(data);
                }
            } catch (error) {
                console.error("Error al cargar pistas:", error);
            }
        };
        cargarPistas();
    }, [id]);

    // --- LÓGICA DE GRABACIÓN ---
    const iniciarGrabacion = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                setAudioBlob(blob);
                setAudioURL(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setGrabando(true);
            setAudioURL(null);
        } catch (err) {
            alert("No se pudo acceder al micrófono. Verifica los permisos del navegador.");
        }
    };

    const detenerGrabacion = () => {
        if (mediaRecorderRef.current && grabando) {
            mediaRecorderRef.current.stop();
            setGrabando(false);
        }
    };

    const descartarGrabacion = () => {
        setAudioBlob(null);
        setAudioURL(null);
    };

    // --- LÓGICA DE SUBIDA (API) ---
    const handleSubirCancion = async (e: React.FormEvent) => {
        e.preventDefault();

        let archivoParaSubir: File | null = null;

        if (modo === "archivo" && archivoAudio) {
            archivoParaSubir = archivoAudio;
        } else if (modo === "grabar" && audioBlob) {
            archivoParaSubir = new File([audioBlob], "toma_vocal.webm", { type: "audio/webm" });
        }

        if (!tituloCancion || !archivoParaSubir) {
            setMensajeSubida("Por favor, ingresa un título y asegúrate de tener un audio listo.");
            return;
        }

        setSubiendo(true);
        setMensajeSubida("Subiendo a la base de datos...");
        const token = localStorage.getItem("access_token");

        const formData = new FormData();
        formData.append("titulo", tituloCancion);
        formData.append("archivo_audio", archivoParaSubir);
        formData.append("banda", id as string);

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        try {
            const res = await fetch(`${baseUrl}/api/v1/canciones/`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                const nuevaPista = await res.json();
                setPistas(prev => [nuevaPista, ...prev]);

                setMensajeSubida("¡Pista guardada con éxito!");
                setTimeout(() => {
                    setMostrarModal(false);
                    setTituloCancion("");
                    setArchivoAudio(null);
                    descartarGrabacion();
                    setMensajeSubida("");
                }, 2000);
            } else {
                setMensajeSubida("Error al subir el archivo.");
            }
        } catch (error) {
            setMensajeSubida("Error de red.");
        } finally {
            setSubiendo(false);
        }
    };

    // --- LÓGICA PARA ELIMINAR PISTA ---
    const handleEliminarPista = async (pistaId: number) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar esta pista? Esta acción no se puede deshacer.")) return;

        const token = localStorage.getItem("access_token");
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        try {
            const res = await fetch(`${baseUrl}/api/v1/canciones/${pistaId}/`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok || res.status === 204) {
                setPistas(prev => prev.filter(p => p.id !== pistaId));
            } else {
                alert("Hubo un problema al intentar eliminar la pista en el servidor.");
            }
        } catch (error) {
            alert("Error de red al intentar conectar con el servidor.");
        }
    };

    if (cargando) return <div className="text-gray-400 p-8">Cargando...</div>;
    if (!banda) return <div className="text-gray-400 p-8">Banda no encontrada.</div>;

    return (
        <div className="relative max-w-6xl mx-auto">
            <Link href="/bandas" className="text-gray-400 hover:text-white mb-6 inline-block transition">
                ← Volver a Mis Bandas
            </Link>

            <div className="bg-gray-800 rounded-xl p-8 shadow-md border border-gray-700 mb-8">
                <h1 className="text-4xl font-bold mb-2 text-white">{banda.nombre}</h1>
                <p className="text-blue-400 font-semibold">{banda.genero_musical || "Género no especificado"}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* --- SECCIÓN ALINEACIÓN DINÁMICA --- */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-md h-fit">
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-gray-700 pb-2 flex items-center gap-2">
                        <span>🎸</span> Alineación
                    </h2>

                    {alineacion.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">No hay miembros registrados aún.</p>
                    ) : (
                        <div className="space-y-4">
                            {alineacion.map((miembro) => (
                                <div key={miembro.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700 flex items-center gap-4 hover:border-gray-600 transition">
                                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center font-bold text-lg shadow-inner shrink-0">
                                        {miembro.nombre_usuario?.charAt(0).toUpperCase() || "?"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white text-lg leading-tight truncate">
                                            {miembro.nombre_usuario || "Usuario Desconocido"}
                                        </p>
                                        <p className="text-sm text-gray-400 font-medium truncate">
                                            {miembro.instrumento || "Músico"}
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wider border ${miembro.rol === 'Líder'
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                            : 'bg-gray-800 text-gray-400 border-gray-700'
                                            }`}>
                                            {miembro.rol}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- SECCIÓN REPERTORIO / PISTAS DINÁMICA --- */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-md">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <span>🎧</span> Pistas y Maquetas
                        </h2>
                        <button onClick={() => setMostrarModal(true)} className="bg-blue-600 hover:bg-blue-500 transition px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                            + Agregar Pista
                        </button>
                    </div>

                    {pistas.length === 0 ? (
                        <p className="text-gray-500 py-10 text-center border-2 border-dashed border-gray-700 rounded-xl bg-gray-900/30">
                            Aún no se han subido maquetas o ideas musicales.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {pistas.map((pista) => {
                                if (!pista.archivo_audio) return null;

                                const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

                                // Verificación de URL absoluta limpia para evitar problemas de diagonales dobles o rotas
                                const audioSrc = pista.archivo_audio.startsWith('http')
                                    ? pista.archivo_audio
                                    : `${baseUrl}${pista.archivo_audio.startsWith('/') ? '' : '/'}${pista.archivo_audio}`;

                                return (
                                    <div key={pista.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition shadow-sm">

                                        {/* CABECERA DE LA PISTA */}
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-bold text-white text-base leading-tight flex items-center gap-2">
                                                <span className="text-blue-400">🎵</span> {pista.titulo}
                                            </h3>

                                            <button
                                                onClick={() => handleEliminarPista(pista.id)}
                                                title="Eliminar pista permanentemente"
                                                className="text-gray-500 hover:text-red-500 hover:bg-gray-800 transition p-1.5 rounded-md"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Reproductor de audio con fix de URL absoluta y carga de metadatos */}
                                        <audio
                                            src={audioSrc}
                                            controls
                                            className="w-full h-10 outline-none"
                                            preload="metadata"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL DE SUBIDA Y GRABACIÓN --- */}
            {mostrarModal && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700 shadow-2xl">
                        <h3 className="text-2xl font-bold mb-4 text-white">Nueva Pista</h3>

                        <div className="flex mb-6 bg-gray-900 rounded p-1">
                            <button onClick={() => setModo("archivo")} className={`flex-1 py-2 text-sm font-semibold rounded transition ${modo === "archivo" ? "bg-gray-700 text-white shadow" : "text-gray-400 hover:text-white"}`}>
                                Subir Archivo
                            </button>
                            <button onClick={() => setModo("grabar")} className={`flex-1 py-2 text-sm font-semibold rounded transition ${modo === "grabar" ? "bg-gray-700 text-white shadow" : "text-gray-400 hover:text-white"}`}>
                                Grabar Voz
                            </button>
                        </div>

                        <form onSubmit={handleSubirCancion} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-300">Título de la Pista</label>
                                <input type="text" value={tituloCancion} onChange={(e) => setTituloCancion(e.target.value)} className="w-full p-3 rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Ej: Idea Vocal Estribillo" required />
                            </div>

                            {modo === "archivo" ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-300">Archivo de Audio</label>
                                    <input type="file" accept="audio/*" onChange={(e) => setArchivoAudio(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer" />
                                </div>
                            ) : (
                                <div className="border border-gray-700 rounded-lg p-6 bg-gray-900 flex flex-col items-center justify-center min-h-40">
                                    {!audioURL && !grabando && (
                                        <button type="button" onClick={iniciarGrabacion} className="w-16 h-16 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] transition transform hover:scale-105">
                                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-2a5 5 0 01-10 0H3a7.001 7.001 0 006 6.93V17H6v2h8v-2h-3v-2z" clipRule="evenodd"></path></svg>
                                        </button>
                                    )}

                                    {grabando && (
                                        <div className="flex flex-col items-center">
                                            <span className="text-red-500 animate-pulse font-bold mb-4 tracking-widest">REC... GRABANDO</span>
                                            <button type="button" onClick={detenerGrabacion} className="w-16 h-16 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-white border-4 border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.7)] transition transform hover:scale-105">
                                                <div className="w-5 h-5 bg-red-600 rounded-sm"></div>
                                            </button>
                                        </div>
                                    )}

                                    {audioURL && !grabando && (
                                        <div className="w-full flex flex-col items-center">
                                            <p className="text-emerald-400 text-sm font-bold mb-3 flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                ¡Toma capturada!
                                            </p>
                                            <audio src={audioURL} controls className="w-full mb-4 h-10 outline-none" />
                                            <button type="button" onClick={descartarGrabacion} className="text-red-400 text-sm hover:text-red-300 hover:underline font-medium">
                                                Descartar y volver a grabar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {mensajeSubida && (
                                <div className={`text-sm p-3 rounded-lg text-center font-medium ${mensajeSubida.includes("éxito") ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"}`}>
                                    {mensajeSubida}
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                                <button type="button" onClick={() => setMostrarModal(false)} className="px-5 py-2.5 text-gray-400 hover:text-white transition font-medium" disabled={subiendo}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={subiendo || (modo === 'grabar' && !audioBlob) || (modo === 'archivo' && !archivoAudio)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                    {subiendo ? "Guardando..." : "Guardar en Banda"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}