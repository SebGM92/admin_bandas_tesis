"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import WaveSurfer from "wavesurfer.js";
import { Card, Button, IconButton, Badge, Avatar, Modal, Field, Input, EmptyState } from "@/components/ui/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface BandaDetalle {
    id: number;
    nombre: string;
    genero_musical: string;
    fecha_creacion: string;
}

interface Pista {
    id: number;
    titulo: string;
    archivo_audio: string;
}

// 🔥 NUEVA INTERFAZ PARA EL EQUIPAMIENTO
interface Equipo {
    id: number;
    nombre: string;
    tipo: string;
    tipo_display: string;
    marca_modelo: string;
    cantidad: number;
    propio: boolean;
    requiere_corriente: boolean;
    requiere_phantom_power: boolean;
    notas_tecnicas: string;
}

function tokenColor(nombre: string) {
    if (typeof window === "undefined") return "#000000";
    return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

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

    const [alineacion, setAlineacion] = useState<any[]>([]);
    const [pistas, setPistas] = useState<Pista[]>([]);

    // 🔥 NUEVOS ESTADOS PARA EL INVENTARIO
    const [inventario, setInventario] = useState<Equipo[]>([]);
    const [mostrarModalEquipo, setMostrarModalEquipo] = useState(false);
    const [subiendoEquipo, setSubiendoEquipo] = useState(false);
    const [formEquipo, setFormEquipo] = useState({
        nombre: "",
        tipo: "INSTRUMENTO",
        marca_modelo: "",
        cantidad: 1,
        propio: true,
        requiere_corriente: false,
        requiere_phantom_power: false,
        notas_tecnicas: ""
    });

    const [mostrarModal, setMostrarModal] = useState(false);
    const [tituloCancion, setTituloCancion] = useState("");
    const [modo, setModo] = useState<"archivo" | "grabar">("archivo");
    const [subiendo, setSubiendo] = useState(false);
    const [mensajeSubida, setMensajeSubida] = useState("");
    const [archivoAudio, setArchivoAudio] = useState<File | null>(null);
    const [grabando, setGrabando] = useState(false);
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);

    useEffect(() => {
        const cargarDetalleBanda = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/v1/bandas/${id}/`, {
                    headers: { "Authorization": `Bearer ${token}` },
                });
                if (res.ok) setBanda(await res.json());
            } catch (err) { setError("Error de conexión."); } finally { setCargando(false); }
        };
        cargarDetalleBanda();
    }, [id]);

    useEffect(() => {
        const cargarAlineacion = async () => {
            const token = localStorage.getItem("access_token");
            if (!token || !id) return;
            try {
                const res = await fetch(`${API_URL}/api/v1/membresias/?banda=${id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) setAlineacion(await res.json());
            } catch (error) { console.error(error); }
        };
        cargarAlineacion();
    }, [id]);

    useEffect(() => {
        const cargarPistas = async () => {
            const token = localStorage.getItem("access_token");
            if (!token || !id) return;
            try {
                const res = await fetch(`${API_URL}/api/v1/canciones/?banda=${id}&maquetas=true`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) setPistas(await res.json());
            } catch (error) { console.error(error); }
        };
        cargarPistas();
    }, [id]);

    // 🔥 NUEVO EFECTO: CARGAR INVENTARIO
    useEffect(() => {
        const cargarInventario = async () => {
            const token = localStorage.getItem("access_token");
            if (!token || !id) return;
            try {
                const res = await fetch(`${API_URL}/api/v1/equipamiento/?banda=${id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) setInventario(await res.json());
            } catch (error) { console.error(error); }
        };
        cargarInventario();
    }, [id]);

    // --- LÓGICAS DE AUDIO (Mantenidas intactas) ---
    const iniciarGrabacion = async () => { /* ... (código existente omitido visualmente, pero se mantiene igual) ... */
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                setAudioBlob(blob);
                setAudioURL(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
            setGrabando(true);
            setAudioURL(null);
        } catch (err) { alert("No se pudo acceder al micrófono."); }
    };

    const detenerGrabacion = () => { if (mediaRecorderRef.current && grabando) { mediaRecorderRef.current.stop(); setGrabando(false); } };
    const descartarGrabacion = () => { setAudioBlob(null); setAudioURL(null); };

    const handleSubirCancion = async (e: React.FormEvent) => {
        e.preventDefault();
        let archivoParaSubir: File | null = null;
        if (modo === "archivo" && archivoAudio) { archivoParaSubir = archivoAudio; }
        else if (modo === "grabar" && audioBlob) { archivoParaSubir = new File([audioBlob], "toma_vocal.webm", { type: "audio/webm" }); }

        if (!tituloCancion || !archivoParaSubir) { setMensajeSubida("Ingresa un título y un audio."); return; }

        setSubiendo(true); setMensajeSubida("Subiendo a Cloudinary...");
        const token = localStorage.getItem("access_token");
        const formData = new FormData();
        formData.append("titulo", tituloCancion);
        formData.append("archivo_audio", archivoParaSubir);
        formData.append("banda", id as string);

        try {
            const res = await fetch(`${API_URL}/api/v1/canciones/`, {
                method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: formData,
            });
            if (res.ok) {
                const nuevaPista = await res.json();
                setPistas(prev => [nuevaPista, ...prev]);
                setMensajeSubida("¡Pista guardada!");
                setTimeout(() => { setMostrarModal(false); setTituloCancion(""); setArchivoAudio(null); descartarGrabacion(); setMensajeSubida(""); }, 2000);
            } else { setMensajeSubida("Error al subir el archivo."); }
        } catch (error) { setMensajeSubida("Error de red."); } finally { setSubiendo(false); }
    };

    const handleEliminarPista = async (pistaId: number) => {
        if (!window.confirm("¿Eliminar pista?")) return;
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_URL}/api/v1/canciones/${pistaId}/`, {
                method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok || res.status === 204) { setPistas(prev => prev.filter(p => p.id !== pistaId)); }
            else { alert("Problema al intentar eliminar."); }
        } catch (error) { alert("Error de red."); }
    };

    // 🔥 NUEVAS LÓGICAS PARA EQUIPAMIENTO
    const handleGuardarEquipo = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubiendoEquipo(true);
        const token = localStorage.getItem("access_token");

        try {
            const res = await fetch(`${API_URL}/api/v1/equipamiento/`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ ...formEquipo, banda: id }),
            });

            if (res.ok) {
                const nuevoEquipo = await res.json();
                setInventario(prev => [...prev, nuevoEquipo]);
                setMostrarModalEquipo(false);
                setFormEquipo({ nombre: "", tipo: "INSTRUMENTO", marca_modelo: "", cantidad: 1, propio: true, requiere_corriente: false, requiere_phantom_power: false, notas_tecnicas: "" });
            } else {
                alert("Hubo un error al guardar el equipo.");
            }
        } catch (error) {
            alert("Error de conexión.");
        } finally {
            setSubiendoEquipo(false);
        }
    };

    const handleEliminarEquipo = async (equipoId: number) => {
        if (!window.confirm("¿Deseas quitar este ítem del inventario?")) return;
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_URL}/api/v1/equipamiento/${equipoId}/`, {
                method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok || res.status === 204) {
                setInventario(prev => prev.filter(e => e.id !== equipoId));
            }
        } catch (error) { alert("Error de red."); }
    };

    if (cargando) return <p className="p-8" style={{ color: "var(--ba-text-muted)" }}>Cargando...</p>;
    if (!banda) return <p className="p-8" style={{ color: "var(--ba-text-muted)" }}>Banda no encontrada.</p>;

    return (
        <div className="relative max-w-6xl mx-auto pb-12">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* SECCIÓN ALINEACIÓN (Intacta) */}
                <Card className="h-fit">
                    <h2 className="ba-section-title mb-6 pb-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--ba-border)" }}>
                        <i className="ti ti-users" aria-hidden="true" style={{ color: "var(--ba-brand)" }} /> Alineación
                    </h2>
                    {alineacion.length === 0 ? (
                        <p className="text-sm italic" style={{ color: "var(--ba-text-subtle)" }}>No hay miembros registrados aún.</p>
                    ) : (
                        <div className="space-y-4">
                            {alineacion.map((miembro) => (
                                <div key={miembro.id} className="p-4 rounded-lg flex items-center gap-4 transition" style={{ background: "var(--ba-surface-2)", border: "1px solid var(--ba-border)" }}>
                                    <Avatar name={miembro.nombre_usuario || "?"} size={48} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-lg leading-tight truncate" style={{ color: "var(--ba-text)" }}>{miembro.nombre_usuario || "Usuario Desconocido"}</p>
                                        <p className="text-sm font-medium truncate" style={{ color: "var(--ba-text-muted)" }}>{miembro.instrumento || "Músico"}</p>
                                    </div>
                                    <Badge tone={miembro.rol === 'Líder' ? 'warning' : 'neutral'} className="shrink-0">{miembro.rol}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* SECCIÓN PISTAS Y MAQUETAS (Intacta) */}
                <Card>
                    <div className="flex justify-between items-center mb-6 pb-2" style={{ borderBottom: "1px solid var(--ba-border)" }}>
                        <h2 className="ba-section-title flex items-center gap-2">
                            <i className="ti ti-headphones" aria-hidden="true" style={{ color: "var(--ba-brand)" }} /> Pistas y Maquetas
                        </h2>
                        <Button variant="primary" size="sm" icon="plus" onClick={() => setMostrarModal(true)}>Agregar pista</Button>
                    </div>
                    {pistas.length === 0 ? (
                        <EmptyState icon="music-off" title="Sin maquetas todavía" body="Aún no se han subido maquetas o ideas musicales." />
                    ) : (
                        <div className="space-y-4">
                            {pistas.map((pista) => {
                                if (!pista.archivo_audio) return null;
                                const audioSrc = pista.archivo_audio.startsWith('http') ? pista.archivo_audio : `${API_URL}${pista.archivo_audio.startsWith('/') ? '' : '/'}${pista.archivo_audio}`;
                                return (
                                    <Card key={pista.id} nested>
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-bold text-base leading-tight flex items-center gap-2" style={{ color: "var(--ba-text)" }}>
                                                <i className="ti ti-music" aria-hidden="true" style={{ color: "var(--ba-brand)" }} /> {pista.titulo}
                                            </h3>
                                            <IconButton icon="trash" label="Eliminar pista permanentemente" danger onClick={() => handleEliminarPista(pista.id)} />
                                        </div>
                                        <WaveformPlayer src={audioSrc} />
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>

            {/* 🔥 NUEVA SECCIÓN: INVENTARIO Y TECH RIDER */}
            <Card>
                <div className="flex justify-between items-center mb-6 pb-2" style={{ borderBottom: "1px solid var(--ba-border)" }}>
                    <h2 className="ba-section-title flex items-center gap-2">
                        <i className="ti ti-clipboard-list" aria-hidden="true" style={{ color: "var(--ba-brand)" }} /> Inventario y Tech Rider
                    </h2>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" icon="file-download" onClick={() => alert("Próximamente: Exportación de PDF lista para enviar al ingeniero de sonido.")}>
                            Exportar PDF
                        </Button>
                        <Button variant="primary" size="sm" icon="plus" onClick={() => setMostrarModalEquipo(true)}>
                            Añadir Equipo
                        </Button>
                    </div>
                </div>

                {inventario.length === 0 ? (
                    <EmptyState
                        icon="box"
                        title="Inventario vacío"
                        body="Registra las guitarras, amplificadores, micrófonos y cables para armar tu Tech Rider."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--ba-border)", color: "var(--ba-text-muted)" }}>
                                    <th className="pb-3 font-semibold text-sm">Categoría</th>
                                    <th className="pb-3 font-semibold text-sm">Equipo</th>
                                    <th className="pb-3 font-semibold text-sm">Marca / Modelo</th>
                                    <th className="pb-3 font-semibold text-sm text-center">Cant.</th>
                                    <th className="pb-3 font-semibold text-sm text-center">Requisitos</th>
                                    <th className="pb-3 font-semibold text-sm text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventario.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: "1px solid var(--ba-border)" }} className="hover:bg-(--ba-surface-2) transition">
                                        <td className="py-3 pr-4">
                                            <Badge tone="neutral" className="text-xs">{item.tipo_display}</Badge>
                                        </td>
                                        <td className="py-3 pr-4 font-medium" style={{ color: "var(--ba-text)" }}>
                                            {item.nombre}
                                            {item.propio ?
                                                <span className="ml-2 text-xs font-normal" style={{ color: "var(--ba-success)" }}>(Propio)</span> :
                                                <span className="ml-2 text-xs font-normal" style={{ color: "var(--ba-danger)" }}>(Pedir al local)</span>
                                            }
                                        </td>
                                        <td className="py-3 pr-4 text-sm" style={{ color: "var(--ba-text-muted)" }}>{item.marca_modelo || "-"}</td>
                                        <td className="py-3 pr-4 text-center font-bold" style={{ color: "var(--ba-text)" }}>{item.cantidad}</td>
                                        <td className="py-3 pr-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                {item.requiere_corriente && <i className="ti ti-plug" title="Requiere 220v" style={{ color: "var(--ba-warning)" }} />}
                                                {item.requiere_phantom_power && <i className="ti ti-bolt" title="Requiere Phantom Power +48v" style={{ color: "var(--ba-danger)" }} />}
                                            </div>
                                        </td>
                                        <td className="py-3 text-right">
                                            <IconButton icon="trash" label="Eliminar" danger onClick={() => handleEliminarEquipo(item.id)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* MODAL PISTAS (Intacto) */}
            <Modal open={mostrarModal} onClose={() => setMostrarModal(false)} title="Nueva pista">
                {/* ... Contenido del modal de grabación original ... */}
                <form onSubmit={handleSubirCancion} className="space-y-6">
                    <Field label="Título de la pista">
                        <Input type="text" value={tituloCancion} onChange={(e) => setTituloCancion(e.target.value)} placeholder="Ej: Idea Vocal Estribillo" required />
                    </Field>
                    <div className="flex mb-4 p-1 rounded-lg" style={{ background: "var(--ba-bg)" }}>
                        <button type="button" onClick={() => setModo("archivo")} className="flex-1 py-2 text-sm font-semibold rounded-md transition" style={modo === "archivo" ? { background: "var(--ba-surface-2)", color: "var(--ba-text)" } : { color: "var(--ba-text-muted)" }}>Subir archivo</button>
                        <button type="button" onClick={() => setModo("grabar")} className="flex-1 py-2 text-sm font-semibold rounded-md transition" style={modo === "grabar" ? { background: "var(--ba-surface-2)", color: "var(--ba-text)" } : { color: "var(--ba-text-muted)" }}>Grabar voz</button>
                    </div>
                    {modo === "archivo" ? (
                        <Field label="Archivo de audio">
                            <input type="file" accept="audio/*" onChange={(e) => setArchivoAudio(e.target.files ? e.target.files[0] : null)} className="w-full text-sm cursor-pointer file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:cursor-pointer" style={{ color: "var(--ba-text-muted)" }} />
                        </Field>
                    ) : (
                        <div className="rounded-lg p-6 flex flex-col items-center justify-center min-h-40" style={{ background: "var(--ba-bg)", border: "1px solid var(--ba-border)" }}>
                            {!audioURL && !grabando && (<button type="button" onClick={iniciarGrabacion} className="w-16 h-16 rounded-full flex items-center justify-center transition transform hover:scale-105" style={{ background: "var(--ba-danger)", color: "var(--ba-on-brand)" }}><i className="ti ti-microphone" style={{ fontSize: 28 }} /></button>)}
                            {grabando && (<div className="flex flex-col items-center"><span className="animate-pulse font-bold mb-4 tracking-widest" style={{ color: "var(--ba-danger)" }}>REC... GRABANDO</span><button type="button" onClick={detenerGrabacion} className="w-16 h-16 rounded-full flex items-center justify-center transition transform hover:scale-105" style={{ background: "var(--ba-surface-2)", border: "4px solid var(--ba-danger)" }}><div className="w-5 h-5 rounded-sm" style={{ background: "var(--ba-danger)" }}></div></button></div>)}
                            {audioURL && !grabando && (<div className="w-full flex flex-col items-center"><p className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: "var(--ba-success)" }}><i className="ti ti-check" /> ¡Toma capturada!</p><div className="w-full mb-4"><WaveformPlayer src={audioURL} /></div><Button type="button" variant="ghost" size="sm" onClick={descartarGrabacion}>Descartar y volver a grabar</Button></div>)}
                        </div>
                    )}
                    {mensajeSubida && <div className="text-sm p-3 rounded-lg text-center font-medium" style={mensajeSubida.includes("éxito") ? { background: "var(--ba-success-soft)", color: "var(--ba-success)" } : { background: "var(--ba-brand-soft)", color: "var(--ba-brand)" }}>{mensajeSubida}</div>}
                    <div className="flex justify-end gap-3 pt-4" style={{ borderTop: "1px solid var(--ba-border)" }}>
                        <Button type="button" variant="ghost" onClick={() => setMostrarModal(false)} disabled={subiendo}>Cancelar</Button>
                        <Button type="submit" variant="primary" disabled={subiendo || (modo === 'grabar' && !audioBlob) || (modo === 'archivo' && !archivoAudio)}>{subiendo ? "Guardando..." : "Guardar en banda"}</Button>
                    </div>
                </form>
            </Modal>

            {/* 🔥 NUEVO MODAL: AGREGAR EQUIPAMIENTO */}
            <Modal open={mostrarModalEquipo} onClose={() => setMostrarModalEquipo(false)} title="Registrar Equipamiento">
                <form onSubmit={handleGuardarEquipo} className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Tipo de equipo">
                            <select
                                className="w-full rounded-md p-2 text-sm"
                                style={{ background: "var(--ba-surface-2)", border: "1px solid var(--ba-border)", color: "var(--ba-text)" }}
                                value={formEquipo.tipo}
                                onChange={(e) => setFormEquipo({ ...formEquipo, tipo: e.target.value })}
                            >
                                <option value="INSTRUMENTO">Instrumento</option>
                                <option value="MICROFONIA">Microfonía</option>
                                <option value="MONITOREO">Monitoreo</option>
                                <option value="BACKLINE">Backline / Amps</option>
                                <option value="ACCESORIOS">Accesorios / Cables</option>
                            </select>
                        </Field>
                        <Field label="Cantidad">
                            <Input type="number" min="1" required value={formEquipo.cantidad} onChange={(e) => setFormEquipo({ ...formEquipo, cantidad: parseInt(e.target.value) })} />
                        </Field>
                    </div>

                    <Field label="Nombre descriptivo">
                        <Input
                            type="text" required value={formEquipo.nombre}
                            onChange={(e) => setFormEquipo({ ...formEquipo, nombre: e.target.value })}
                            placeholder="Ej: Monitor Activo Wharfedale, Gibson Gold Top Les Paul P90..."
                        />
                    </Field>

                    <Field label="Marca y Modelo (Opcional)">
                        <Input
                            type="text" value={formEquipo.marca_modelo}
                            onChange={(e) => setFormEquipo({ ...formEquipo, marca_modelo: e.target.value })}
                            placeholder="Ej: Shure SM58, Behringer DI20, Klotz XLR..."
                        />
                    </Field>

                    <div className="p-4 rounded-lg space-y-3" style={{ background: "var(--ba-surface-2)", border: "1px solid var(--ba-border)" }}>
                        <p className="text-sm font-semibold mb-2" style={{ color: "var(--ba-text)" }}>Requisitos Técnicos (Stage Plot)</p>

                        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--ba-text-muted)" }}>
                            <input type="checkbox" checked={formEquipo.propio} onChange={(e) => setFormEquipo({ ...formEquipo, propio: e.target.checked })} />
                            Es equipo propio (La banda lo lleva)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--ba-text-muted)" }}>
                            <input type="checkbox" checked={formEquipo.requiere_corriente} onChange={(e) => setFormEquipo({ ...formEquipo, requiere_corriente: e.target.checked })} />
                            Necesita enchufe / corriente 220v en escenario
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--ba-text-muted)" }}>
                            <input type="checkbox" checked={formEquipo.requiere_phantom_power} onChange={(e) => setFormEquipo({ ...formEquipo, requiere_phantom_power: e.target.checked })} />
                            Necesita Phantom Power (+48v) desde la consola
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 mt-2" style={{ borderTop: "1px solid var(--ba-border)" }}>
                        <Button type="button" variant="ghost" onClick={() => setMostrarModalEquipo(false)} disabled={subiendoEquipo}>Cancelar</Button>
                        <Button type="submit" variant="primary" disabled={subiendoEquipo || !formEquipo.nombre}>
                            {subiendoEquipo ? "Guardando..." : "Agregar al inventario"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}