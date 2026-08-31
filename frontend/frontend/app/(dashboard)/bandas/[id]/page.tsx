"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import WaveSurfer from "wavesurfer.js";
import { Card, Button, IconButton, Badge, Avatar, Modal, Field, Input, EmptyState } from "@/components/ui/ui";

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

// WaveSurfer dibuja directo en <canvas>, así que no puede resolver var(--ba-*):
// leemos el valor ya calculado del token en tiempo de montaje.
function tokenColor(nombre: string) {
    if (typeof window === "undefined") return "#000000";
    return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

// --- REPRODUCTOR CON FORMA DE ONDA (reemplaza al <audio> nativo) ---
function WaveformPlayer({ src }: { src: string }) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [listo, setListo] = useState(false);
    const [reproduciendo, setReproduciendo] = useState(false);

    useEffect(() => {
        if (!contenedorRef.current) return;

        setListo(false);
        const ws = WaveSurfer.create({
            container: contenedorRef.current,
            url: src,
            height: 40,
            barWidth: 2,
            barGap: 2,
            barRadius: 2,
            cursorWidth: 1,
            waveColor: tokenColor("--ba-border-strong"),
            progressColor: tokenColor("--ba-brand"),
            cursorColor: tokenColor("--ba-text-muted"),
        });

        wavesurferRef.current = ws;
        ws.on("ready", () => setListo(true));
        ws.on("play", () => setReproduciendo(true));
        ws.on("pause", () => setReproduciendo(false));
        ws.on("finish", () => setReproduciendo(false));

        return () => {
            ws.destroy();
        };
    }, [src]);

    return (
        <div className="flex items-center gap-3">
            <IconButton
                icon={reproduciendo ? "player-pause-filled" : "player-play-filled"}
                label={reproduciendo ? "Pausar" : "Reproducir"}
                disabled={!listo}
                onClick={() => wavesurferRef.current?.playPause()}
                style={{ color: "var(--ba-brand)" }}
            />
            <div ref={contenedorRef} className="flex-1 min-w-0" />
        </div>
    );
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

    if (cargando) return <p className="p-8" style={{ color: "var(--ba-text-muted)" }}>Cargando...</p>;
    if (!banda) return <p className="p-8" style={{ color: "var(--ba-text-muted)" }}>Banda no encontrada.</p>;

    return (
        <div className="relative max-w-6xl mx-auto">
            <Link
                href="/bandas"
                className="mb-6 inline-flex items-center gap-1 text-sm transition"
                style={{ color: "var(--ba-text-muted)" }}
            >
                <i className="ti ti-arrow-left" aria-hidden="true" /> Volver a Mis Bandas
            </Link>

            <Card className="mb-8">
                <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--ba-text)" }}>{banda.nombre}</h1>
                <p className="font-semibold" style={{ color: "var(--ba-brand)" }}>{banda.genero_musical || "Género no especificado"}</p>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* --- SECCIÓN ALINEACIÓN --- */}
                <Card className="h-fit">
                    <h2 className="ba-section-title mb-6 pb-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--ba-border)" }}>
                        <i className="ti ti-users" aria-hidden="true" style={{ color: "var(--ba-brand)" }} /> Alineación
                    </h2>

                    {alineacion.length === 0 ? (
                        <p className="text-sm italic" style={{ color: "var(--ba-text-subtle)" }}>No hay miembros registrados aún.</p>
                    ) : (
                        <div className="space-y-4">
                            {alineacion.map((miembro) => (
                                <div
                                    key={miembro.id}
                                    className="p-4 rounded-lg flex items-center gap-4 transition"
                                    style={{ background: "var(--ba-surface-2)", border: "1px solid var(--ba-border)" }}
                                >
                                    <Avatar name={miembro.nombre_usuario || "?"} size={48} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-lg leading-tight truncate" style={{ color: "var(--ba-text)" }}>
                                            {miembro.nombre_usuario || "Usuario Desconocido"}
                                        </p>
                                        <p className="text-sm font-medium truncate" style={{ color: "var(--ba-text-muted)" }}>
                                            {miembro.instrumento || "Músico"}
                                        </p>
                                    </div>
                                    <Badge tone={miembro.rol === 'Líder' ? 'warning' : 'neutral'} className="shrink-0">
                                        {miembro.rol}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* --- SECCIÓN REPERTORIO / PISTAS --- */}
                <Card>
                    <div className="flex justify-between items-center mb-6 pb-2" style={{ borderBottom: "1px solid var(--ba-border)" }}>
                        <h2 className="ba-section-title flex items-center gap-2">
                            <i className="ti ti-headphones" aria-hidden="true" style={{ color: "var(--ba-brand)" }} /> Pistas y Maquetas
                        </h2>
                        <Button variant="primary" size="sm" icon="plus" onClick={() => setMostrarModal(true)}>
                            Agregar pista
                        </Button>
                    </div>

                    {pistas.length === 0 ? (
                        <EmptyState
                            icon="music-off"
                            title="Sin maquetas todavía"
                            body="Aún no se han subido maquetas o ideas musicales."
                        />
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
                                    <Card key={pista.id} nested>
                                        {/* CABECERA DE LA PISTA */}
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-bold text-base leading-tight flex items-center gap-2" style={{ color: "var(--ba-text)" }}>
                                                <i className="ti ti-music" aria-hidden="true" style={{ color: "var(--ba-brand)" }} /> {pista.titulo}
                                            </h3>
                                            <IconButton
                                                icon="trash"
                                                label="Eliminar pista permanentemente"
                                                danger
                                                onClick={() => handleEliminarPista(pista.id)}
                                            />
                                        </div>

                                        {/* Reproductor con forma de onda (fix de URL absoluta ya aplicado en audioSrc) */}
                                        <WaveformPlayer src={audioSrc} />
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>

            {/* --- MODAL DE SUBIDA Y GRABACIÓN --- */}
            <Modal open={mostrarModal} onClose={() => setMostrarModal(false)} title="Nueva pista">
                <div className="flex mb-6 p-1 rounded-lg" style={{ background: "var(--ba-bg)" }}>
                    <button
                        onClick={() => setModo("archivo")}
                        className="flex-1 py-2 text-sm font-semibold rounded-md transition"
                        style={modo === "archivo"
                            ? { background: "var(--ba-surface-2)", color: "var(--ba-text)" }
                            : { color: "var(--ba-text-muted)" }}
                    >
                        Subir archivo
                    </button>
                    <button
                        onClick={() => setModo("grabar")}
                        className="flex-1 py-2 text-sm font-semibold rounded-md transition"
                        style={modo === "grabar"
                            ? { background: "var(--ba-surface-2)", color: "var(--ba-text)" }
                            : { color: "var(--ba-text-muted)" }}
                    >
                        Grabar voz
                    </button>
                </div>

                <form onSubmit={handleSubirCancion} className="space-y-6">
                    <Field label="Título de la pista">
                        <Input
                            type="text" value={tituloCancion} onChange={(e) => setTituloCancion(e.target.value)}
                            placeholder="Ej: Idea Vocal Estribillo" required
                        />
                    </Field>

                    {modo === "archivo" ? (
                        <Field label="Archivo de audio">
                            <input
                                type="file" accept="audio/*"
                                onChange={(e) => setArchivoAudio(e.target.files ? e.target.files[0] : null)}
                                className="w-full text-sm cursor-pointer file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:cursor-pointer"
                                style={{ color: "var(--ba-text-muted)" }}
                            />
                        </Field>
                    ) : (
                        <div
                            className="rounded-lg p-6 flex flex-col items-center justify-center min-h-40"
                            style={{ background: "var(--ba-bg)", border: "1px solid var(--ba-border)" }}
                        >
                            {!audioURL && !grabando && (
                                <button
                                    type="button" onClick={iniciarGrabacion}
                                    className="w-16 h-16 rounded-full flex items-center justify-center transition transform hover:scale-105"
                                    style={{ background: "var(--ba-danger)", color: "var(--ba-on-brand)" }}
                                >
                                    <i className="ti ti-microphone" aria-hidden="true" style={{ fontSize: 28 }} />
                                </button>
                            )}

                            {grabando && (
                                <div className="flex flex-col items-center">
                                    <span className="animate-pulse font-bold mb-4 tracking-widest" style={{ color: "var(--ba-danger)" }}>
                                        REC... GRABANDO
                                    </span>
                                    <button
                                        type="button" onClick={detenerGrabacion}
                                        className="w-16 h-16 rounded-full flex items-center justify-center transition transform hover:scale-105"
                                        style={{ background: "var(--ba-surface-2)", border: "4px solid var(--ba-danger)" }}
                                    >
                                        <div className="w-5 h-5 rounded-sm" style={{ background: "var(--ba-danger)" }}></div>
                                    </button>
                                </div>
                            )}

                            {audioURL && !grabando && (
                                <div className="w-full flex flex-col items-center">
                                    <p className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: "var(--ba-success)" }}>
                                        <i className="ti ti-check" aria-hidden="true" /> ¡Toma capturada!
                                    </p>
                                    <div className="w-full mb-4">
                                        <WaveformPlayer src={audioURL} />
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={descartarGrabacion}>
                                        Descartar y volver a grabar
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {mensajeSubida && (
                        <div
                            className="text-sm p-3 rounded-lg text-center font-medium"
                            style={mensajeSubida.includes("éxito")
                                ? { background: "var(--ba-success-soft)", color: "var(--ba-success)" }
                                : { background: "var(--ba-brand-soft)", color: "var(--ba-brand)" }}
                        >
                            {mensajeSubida}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4" style={{ borderTop: "1px solid var(--ba-border)" }}>
                        <Button type="button" variant="ghost" onClick={() => setMostrarModal(false)} disabled={subiendo}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit" variant="primary"
                            disabled={subiendo || (modo === 'grabar' && !audioBlob) || (modo === 'archivo' && !archivoAudio)}
                        >
                            {subiendo ? "Guardando..." : "Guardar en banda"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
