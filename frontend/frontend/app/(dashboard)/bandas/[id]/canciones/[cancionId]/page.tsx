"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { type Region } from "wavesurfer.js/plugins/regions";
import { Card, Button, IconButton, Avatar, Badge, Modal, Field, Input, EmptyState } from "@/components/ui/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface CancionDetalle {
    id: number;
    titulo: string;
    artista: string;
    banda: number;
}

interface TomaData {
    id: number;
    pista: number;
    usuario: number;
    nombre_usuario: string;
    archivo_audio: string;
    fecha_subida: string;
    total_comentarios: number;
}

interface PistaData {
    id: number;
    cancion: number;
    nombre: string;
    creado_por: number | null;
    nombre_creador: string | null;
    orden: number;
    fecha_creacion: string;
    tomas: TomaData[];
}

interface ComentarioData {
    id: number;
    toma: number;
    usuario: number;
    nombre_usuario: string;
    texto: string;
    momento_segundos: number;
    fecha_creacion: string;
}

// WaveSurfer dibuja directo en <canvas>, así que no puede resolver var(--ba-*):
// leemos el valor ya calculado del token en tiempo de montaje.
function tokenColor(nombre: string) {
    if (typeof window === "undefined") return "#000000";
    return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

function formatearTiempo(segundos: number) {
    if (!Number.isFinite(segundos) || segundos < 0) segundos = 0;
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

// --- REPRODUCTOR CON MARCADORES DE COMENTARIOS SOBRE LA FORMA DE ONDA ---
function ReproductorConComentarios({ toma, onEliminarToma }: { toma: TomaData; onEliminarToma: () => void }) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const regionsRef = useRef<RegionsPlugin | null>(null);

    const [listo, setListo] = useState(false);
    const [reproduciendo, setReproduciendo] = useState(false);
    const [tiempoActual, setTiempoActual] = useState(0);
    const [comentarios, setComentarios] = useState<ComentarioData[]>([]);
    const [textoComentario, setTextoComentario] = useState("");
    const [enviandoComentario, setEnviandoComentario] = useState(false);

    const audioSrc = toma.archivo_audio.startsWith("http")
        ? toma.archivo_audio
        : `${API_URL}${toma.archivo_audio.startsWith("/") ? "" : "/"}${toma.archivo_audio}`;

    // Cargar el hilo de comentarios de esta toma
    useEffect(() => {
        const cargarComentarios = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/v1/comentarios-audio/?toma=${toma.id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) setComentarios(await res.json());
            } catch (error) {
                console.error("Error al cargar comentarios:", error);
            }
        };
        cargarComentarios();
    }, [toma.id]);

    // Montar WaveSurfer + plugin de regiones (usamos regiones puntuales como marcadores)
    useEffect(() => {
        if (!contenedorRef.current) return;
        setListo(false);

        const regions = RegionsPlugin.create();
        regionsRef.current = regions;

        const ws = WaveSurfer.create({
            container: contenedorRef.current,
            url: audioSrc,
            height: 56,
            barWidth: 2,
            barGap: 2,
            barRadius: 2,
            cursorWidth: 1,
            waveColor: tokenColor("--ba-border-strong"),
            progressColor: tokenColor("--ba-brand"),
            cursorColor: tokenColor("--ba-text-muted"),
            plugins: [regions],
        });

        wavesurferRef.current = ws;
        ws.on("ready", () => setListo(true));
        ws.on("play", () => setReproduciendo(true));
        ws.on("pause", () => setReproduciendo(false));
        ws.on("finish", () => setReproduciendo(false));
        ws.on("timeupdate", (t) => setTiempoActual(t));

        regions.on("region-clicked", (region: Region, e: MouseEvent) => {
            e.stopPropagation();
            ws.setTime(region.start);
            ws.play();
        });

        return () => {
            ws.destroy();
        };
    }, [audioSrc]);

    // Repintar los marcadores cada vez que cambia el hilo de comentarios
    useEffect(() => {
        if (!listo || !regionsRef.current) return;
        regionsRef.current.clearRegions();
        comentarios.forEach((c) => {
            regionsRef.current?.addRegion({
                start: c.momento_segundos,
                content: `${c.nombre_usuario}: ${c.texto}`,
                color: "rgba(124, 58, 237, 0.35)",
                drag: false,
                resize: false,
            });
        });
    }, [comentarios, listo]);

    const irAComentario = (segundos: number) => {
        wavesurferRef.current?.setTime(segundos);
        wavesurferRef.current?.play();
    };

    const handleAgregarComentario = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!textoComentario.trim()) return;
        setEnviandoComentario(true);
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_URL}/api/v1/comentarios-audio/`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ toma: toma.id, texto: textoComentario, momento_segundos: tiempoActual }),
            });
            if (res.ok) {
                const nuevo = await res.json();
                setComentarios(prev => [...prev, nuevo].sort((a, b) => a.momento_segundos - b.momento_segundos));
                setTextoComentario("");
            } else {
                alert("No se pudo publicar el comentario.");
            }
        } catch (error) {
            alert("Error de red al publicar el comentario.");
        } finally {
            setEnviandoComentario(false);
        }
    };

    const handleEliminarComentario = async (comentarioId: number) => {
        if (!window.confirm("¿Eliminar este comentario?")) return;
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_URL}/api/v1/comentarios-audio/${comentarioId}/`, {
                method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok || res.status === 204) {
                setComentarios(prev => prev.filter(c => c.id !== comentarioId));
            } else {
                alert("No tienes permiso para eliminar este comentario.");
            }
        } catch (error) {
            alert("Error de red.");
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--ba-text)" }}>
                    <Avatar name={toma.nombre_usuario || "?"} size={22} />
                    {toma.nombre_usuario}
                    <span className="text-xs font-normal" style={{ color: "var(--ba-text-subtle)" }}>
                        {new Date(toma.fecha_subida).toLocaleDateString()}
                    </span>
                </p>
                <IconButton icon="trash" label="Eliminar toma" danger onClick={onEliminarToma} />
            </div>

            <div className="flex items-center gap-3">
                <IconButton
                    icon={reproduciendo ? "player-pause-filled" : "player-play-filled"}
                    label={reproduciendo ? "Pausar" : "Reproducir"}
                    disabled={!listo}
                    onClick={() => wavesurferRef.current?.playPause()}
                    style={{ color: "var(--ba-brand)" }}
                />
                <div ref={contenedorRef} className="flex-1 min-w-0" />
                <span className="text-xs tabular-nums shrink-0" style={{ color: "var(--ba-text-muted)" }}>
                    {formatearTiempo(tiempoActual)}
                </span>
            </div>

            <form onSubmit={handleAgregarComentario} className="flex gap-2">
                <Input
                    type="text"
                    placeholder={`Comentar en el segundo ${formatearTiempo(tiempoActual)}...`}
                    value={textoComentario}
                    onChange={(e) => setTextoComentario(e.target.value)}
                    className="flex-1"
                />
                <Button type="submit" variant="secondary" size="sm" disabled={enviandoComentario || !textoComentario.trim()}>
                    {enviandoComentario ? "..." : "Comentar"}
                </Button>
            </form>

            {comentarios.length > 0 && (
                <div className="space-y-2 pl-1 pt-1">
                    {comentarios.map((c) => (
                        <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
                            <button
                                type="button"
                                onClick={() => irAComentario(c.momento_segundos)}
                                className="flex items-start gap-2 text-left hover:underline min-w-0"
                            >
                                <Badge tone="brand" className="shrink-0 tabular-nums">{formatearTiempo(c.momento_segundos)}</Badge>
                                <span className="min-w-0" style={{ color: "var(--ba-text)" }}>
                                    <strong>{c.nombre_usuario}:</strong> {c.texto}
                                </span>
                            </button>
                            <IconButton icon="trash" label="Eliminar comentario" danger onClick={() => handleEliminarComentario(c.id)} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- TARJETA DE UN STEM (PISTA) CON SUS TOMAS ---
function TarjetaPista({
    pista, onTomaSubida, onEliminarPista, onEliminarToma
}: {
    pista: PistaData;
    onTomaSubida: (pistaId: number, toma: TomaData) => void;
    onEliminarPista: (pistaId: number) => void;
    onEliminarToma: (pistaId: number, tomaId: number) => void;
}) {
    const [subiendoToma, setSubiendoToma] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubirToma = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;

        setSubiendoToma(true);
        const token = localStorage.getItem("access_token");
        const formData = new FormData();
        formData.append("pista", String(pista.id));
        formData.append("archivo_audio", archivo);

        try {
            const res = await fetch(`${API_URL}/api/v1/tomas/`, {
                method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: formData,
            });
            if (res.ok) {
                const nuevaToma = await res.json();
                onTomaSubida(pista.id, nuevaToma);
            } else {
                alert("No se pudo subir la toma.");
            }
        } catch (error) {
            alert("Error de red al subir la toma.");
        } finally {
            setSubiendoToma(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <Card nested>
            <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: "1px solid var(--ba-border)" }}>
                <div>
                    <h3 className="font-bold text-base" style={{ color: "var(--ba-text)" }}>{pista.nombre}</h3>
                    {pista.nombre_creador && (
                        <p className="text-xs" style={{ color: "var(--ba-text-muted)" }}>Creada por {pista.nombre_creador}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <label className={`ba-btn ba-btn--secondary ba-btn--sm cursor-pointer${subiendoToma ? " opacity-60 pointer-events-none" : ""}`}>
                        <i className="ti ti-upload" aria-hidden="true" />
                        {subiendoToma ? "Subiendo..." : "Subir toma"}
                        <input
                            ref={inputRef}
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={handleSubirToma}
                            disabled={subiendoToma}
                        />
                    </label>
                    <IconButton icon="trash" label="Eliminar stem" danger onClick={() => onEliminarPista(pista.id)} />
                </div>
            </div>

            {pista.tomas.length === 0 ? (
                <p className="text-sm italic" style={{ color: "var(--ba-text-subtle)" }}>
                    Sin tomas todavía. Sube la primera grabación para este stem.
                </p>
            ) : (
                <div className="space-y-6">
                    {pista.tomas.map((toma, i) => (
                        <div key={toma.id} className={i > 0 ? "pt-6" : ""} style={i > 0 ? { borderTop: "1px solid var(--ba-border)" } : undefined}>
                            <ReproductorConComentarios
                                toma={toma}
                                onEliminarToma={() => onEliminarToma(pista.id, toma.id)}
                            />
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

export default function PerfilCancion() {
    const params = useParams();
    const bandaId = params.id;
    const cancionId = params.cancionId;

    const [cancion, setCancion] = useState<CancionDetalle | null>(null);
    const [pistas, setPistas] = useState<PistaData[]>([]);
    const [cargando, setCargando] = useState(true);

    const [mostrarModalPista, setMostrarModalPista] = useState(false);
    const [nombrePista, setNombrePista] = useState("");
    const [creandoPista, setCreandoPista] = useState(false);

    useEffect(() => {
        const cargarEstudio = async () => {
            const token = localStorage.getItem("access_token");
            if (!token || !cancionId || cancionId === "undefined") {
                setCargando(false);
                return;
            }

            try {
                const [resCancion, resPistas] = await Promise.all([
                    fetch(`${API_URL}/api/v1/canciones/${cancionId}/`, { headers: { "Authorization": `Bearer ${token}` } }),
                    fetch(`${API_URL}/api/v1/pistas/?cancion=${cancionId}`, { headers: { "Authorization": `Bearer ${token}` } }),
                ]);
                if (resCancion.ok) setCancion(await resCancion.json());
                if (resPistas.ok) setPistas(await resPistas.json());
            } catch (error) {
                console.error("Error al cargar el estudio:", error);
            } finally {
                setCargando(false);
            }
        };
        cargarEstudio();
    }, [cancionId]);

    const handleCrearPista = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreandoPista(true);
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_URL}/api/v1/pistas/`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ cancion: cancionId, nombre: nombrePista }),
            });
            if (res.ok) {
                const nueva = await res.json();
                setPistas(prev => [...prev, nueva]);
                setMostrarModalPista(false);
                setNombrePista("");
            } else {
                alert("No se pudo crear el stem.");
            }
        } catch (error) {
            alert("Error de red al crear el stem.");
        } finally {
            setCreandoPista(false);
        }
    };

    const handleEliminarPista = async (pistaId: number) => {
        if (!window.confirm("¿Eliminar este stem junto con todas sus tomas y comentarios? Esta acción no se puede deshacer.")) return;
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_URL}/api/v1/pistas/${pistaId}/`, {
                method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok || res.status === 204) {
                setPistas(prev => prev.filter(p => p.id !== pistaId));
            } else {
                alert("No se pudo eliminar el stem.");
            }
        } catch (error) {
            alert("Error de red.");
        }
    };

    const handleTomaSubida = (pistaId: number, nuevaToma: TomaData) => {
        setPistas(prev => prev.map(p => p.id === pistaId ? { ...p, tomas: [nuevaToma, ...p.tomas] } : p));
    };

    const handleEliminarToma = async (pistaId: number, tomaId: number) => {
        if (!window.confirm("¿Eliminar esta toma junto con sus comentarios?")) return;
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_URL}/api/v1/tomas/${tomaId}/`, {
                method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok || res.status === 204) {
                setPistas(prev => prev.map(p => p.id === pistaId ? { ...p, tomas: p.tomas.filter(t => t.id !== tomaId) } : p));
            } else {
                alert("No se pudo eliminar la toma.");
            }
        } catch (error) {
            alert("Error de red.");
        }
    };

    if (cargando) return <p className="p-8" style={{ color: "var(--ba-text-muted)" }}>Cargando estudio...</p>;
    if (!cancion) return <p className="p-8" style={{ color: "var(--ba-text-muted)" }}>Canción no encontrada.</p>;

    return (
        <div className="relative max-w-4xl mx-auto pb-12">
            <Link
                href={`/bandas/${bandaId}`}
                className="mb-6 inline-flex items-center gap-1 text-sm transition"
                style={{ color: "var(--ba-text-muted)" }}
            >
                <i className="ti ti-arrow-left" aria-hidden="true" /> Volver a la banda
            </Link>

            <Card className="mb-8">
                <p className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: "var(--ba-brand)" }}>
                    Estudio Multitrack
                </p>
                <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--ba-text)" }}>{cancion.titulo}</h1>
                <p style={{ color: "var(--ba-text-muted)" }}>{cancion.artista || "Autor desconocido"}</p>
            </Card>

            <div className="flex justify-between items-center mb-6">
                <h2 className="ba-section-title flex items-center gap-2">
                    <i className="ti ti-waveform" aria-hidden="true" style={{ color: "var(--ba-brand)" }} /> Stems
                </h2>
                <Button variant="primary" size="sm" icon="plus" onClick={() => setMostrarModalPista(true)}>
                    Nuevo stem
                </Button>
            </div>

            {pistas.length === 0 ? (
                <Card>
                    <EmptyState
                        icon="waveform"
                        title="Todavía no hay stems"
                        body="Crea el primer stem (Ej: Voz principal, Bajo, Batería) para que la banda empiece a grabar sobre esta canción."
                    />
                </Card>
            ) : (
                <div className="space-y-6">
                    {pistas.map((pista) => (
                        <TarjetaPista
                            key={pista.id}
                            pista={pista}
                            onTomaSubida={handleTomaSubida}
                            onEliminarPista={handleEliminarPista}
                            onEliminarToma={handleEliminarToma}
                        />
                    ))}
                </div>
            )}

            {/* --- MODAL: NUEVO STEM --- */}
            <Modal open={mostrarModalPista} onClose={() => setMostrarModalPista(false)} title="Nuevo stem">
                <form onSubmit={handleCrearPista} className="space-y-6">
                    <Field label="Nombre del stem">
                        <Input
                            type="text" required autoFocus value={nombrePista}
                            onChange={(e) => setNombrePista(e.target.value)}
                            placeholder="Ej: Voz principal, Línea de bajo, Batería..."
                        />
                    </Field>
                    <div className="flex justify-end gap-3 pt-4" style={{ borderTop: "1px solid var(--ba-border)" }}>
                        <Button type="button" variant="ghost" onClick={() => setMostrarModalPista(false)} disabled={creandoPista}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" disabled={creandoPista || !nombrePista.trim()}>
                            {creandoPista ? "Creando..." : "Crear stem"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
