"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Field, Input, Button, IconButton, Modal, EmptyState } from "@/components/ui/ui";

interface Banda {
    id: number;
    nombre: string;
    genero_musical: string;
    fecha_creacion: string;
}

export default function MisBandas() {
    const [bandas, setBandas] = useState<Banda[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    // --- ESTADOS PARA CREAR BANDA ---
    const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
    const [nombreBanda, setNombreBanda] = useState("");
    const [procesandoCreacion, setProcesandoCreacion] = useState(false);

    // --- ESTADOS PARA EL SISTEMA DE INVITACIONES ---
    const [bandaAInvitar, setBandaAInvitar] = useState<Banda | null>(null);
    const [enlaceGenerado, setEnlaceGenerado] = useState("");
    const [generando, setGenerando] = useState(false);

    // --- CARGAR BANDAS ---
    useEffect(() => {
        const cargarBandas = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) {
                setError("No hay sesión activa.");
                setCargando(false);
                return;
            }

            try {
                const res = await fetch("http://127.0.0.1:8000/api/v1/bandas/", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                });

                if (res.ok) {
                    const data = await res.json();
                    setBandas(data);
                } else {
                    setError("No se pudieron cargar las bandas.");
                }
            } catch (err) {
                setError("Error de conexión con el servidor.");
            } finally {
                setCargando(false);
            }
        };

        cargarBandas();
    }, []);

    // --- CREAR BANDA ---
    const handleCrearBanda = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcesandoCreacion(true);
        const token = localStorage.getItem("access_token");

        try {
            const res = await fetch("http://127.0.0.1:8000/api/v1/bandas/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ nombre: nombreBanda }),
            });

            if (res.ok) {
                setMostrarModalCrear(false);
                setNombreBanda("");
                // Forzamos la recarga para que el Dashboard lea el Rol: Líder
                window.location.href = "/";
            } else {
                alert("Error al crear la banda. Revisa la consola.");
            }
        } catch (error) {
            alert("Error de conexión al intentar crear la banda.");
        } finally {
            setProcesandoCreacion(false);
        }
    };

    // --- ELIMINAR BANDA ---
    const handleEliminarBanda = async (e: React.MouseEvent, idBanda: number, nombreBanda: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm(`¿Estás seguro de que deseas eliminar la banda "${nombreBanda}"?`)) return;

        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/v1/bandas/${idBanda}/`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` },
            });

            if (res.ok) {
                setBandas(bandas.filter(banda => banda.id !== idBanda));
            } else {
                alert("Error al eliminar la banda.");
            }
        } catch (error) {
            alert("Error de red al intentar eliminar.");
        }
    };

    // --- GENERAR ENLACE DE INVITACIÓN ---
    const generarEnlace = async () => {
        if (!bandaAInvitar) return;
        setGenerando(true);
        setEnlaceGenerado("");

        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch("http://127.0.0.1:8000/api/v1/invitaciones/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ banda: bandaAInvitar.id })
            });

            if (res.ok) {
                const data = await res.json();
                const enlace = `${window.location.origin}/unirse/${data.token}`;
                setEnlaceGenerado(enlace);
            } else {
                alert("El backend aún no está listo para generar invitaciones.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setGenerando(false);
        }
    };

    const copiarAlPortapapeles = () => {
        navigator.clipboard.writeText(enlaceGenerado);
        alert("¡Enlace copiado al portapapeles!");
    };

    const cerrarModalInvitar = () => {
        setBandaAInvitar(null);
        setEnlaceGenerado("");
    };

    if (cargando) return <p className="p-8 animate-pulse" style={{ color: "var(--ba-text-muted)" }}>Cargando tus agrupaciones...</p>;
    if (error) return <p className="p-8" style={{ color: "var(--ba-danger)" }}>{error}</p>;

    return (
        <div className="relative">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="ba-page-title">Mis Bandas</h1>
                    <p style={{ color: "var(--ba-text-muted)" }}>Selecciona un proyecto para administrar su catálogo y miembros.</p>
                </div>
                <Button variant="primary" icon="plus" onClick={() => setMostrarModalCrear(true)}>
                    Nueva banda
                </Button>
            </div>

            {bandas.length === 0 ? (
                <Card>
                    <EmptyState
                        icon="users-group"
                        title="Aún no perteneces a ninguna banda"
                        action={
                            <Button variant="primary" onClick={() => setMostrarModalCrear(true)}>
                                Crear mi primera banda
                            </Button>
                        }
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bandas.map((banda) => (
                        <Card key={banda.id} interactive className="relative group flex flex-col justify-between h-full">
                            <IconButton
                                icon="trash"
                                label="Eliminar banda"
                                danger
                                onClick={(e) => handleEliminarBanda(e, banda.id, banda.nombre)}
                                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            />

                            <Link href={`/bandas/${banda.id}`} className="block flex-1 cursor-pointer">
                                <h3 className="text-xl font-bold mb-2 pr-8" style={{ color: "var(--ba-text)" }}>{banda.nombre}</h3>
                                <p className="text-sm mb-4" style={{ color: "var(--ba-text-muted)" }}>
                                    Género: {banda.genero_musical || "No especificado"}
                                </p>
                            </Link>

                            <div className="flex justify-between items-center mt-4 pt-4" style={{ borderTop: "1px solid var(--ba-border)" }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setBandaAInvitar(banda); }}
                                    className="text-sm hover:underline flex items-center gap-1"
                                    style={{ color: "var(--ba-success)" }}
                                >
                                    <i className="ti ti-user-plus" aria-hidden="true" /> Invitar músicos
                                </button>
                                <Link href={`/bandas/${banda.id}`} className="text-sm hover:underline flex items-center gap-1" style={{ color: "var(--ba-brand)" }}>
                                    Administrar <i className="ti ti-arrow-right" aria-hidden="true" />
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* --- MODAL PARA CREAR BANDA --- */}
            <Modal open={mostrarModalCrear} onClose={() => setMostrarModalCrear(false)} title="Crear nueva banda">
                <form onSubmit={handleCrearBanda}>
                    <Field label="Nombre del proyecto musical">
                        <Input
                            type="text"
                            required
                            autoFocus
                            value={nombreBanda}
                            onChange={(e) => setNombreBanda(e.target.value)}
                            placeholder="Ej: Los Prisioneros, Soda Stereo..."
                        />
                    </Field>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setMostrarModalCrear(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" disabled={procesandoCreacion || !nombreBanda.trim()}>
                            {procesandoCreacion ? "Creando..." : "Crear banda"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* --- MODAL DE INVITACIONES --- */}
            <Modal open={!!bandaAInvitar} onClose={cerrarModalInvitar} title={`Invitar a ${bandaAInvitar?.nombre ?? ""}`}>
                <p className="text-sm mb-6" style={{ color: "var(--ba-text-muted)" }}>
                    Genera un enlace único de invitación. Este enlace será válido por 7 días y solo podrá ser usado una vez.
                </p>

                {!enlaceGenerado ? (
                    <Button variant="primary" block disabled={generando} onClick={generarEnlace}>
                        {generando ? "Generando código..." : "Generar enlace de invitación"}
                    </Button>
                ) : (
                    <Field label="Enlace generado">
                        <div className="flex gap-2">
                            <Input type="text" readOnly value={enlaceGenerado} />
                            <Button variant="secondary" icon="copy" onClick={copiarAlPortapapeles}>
                                Copiar
                            </Button>
                        </div>
                    </Field>
                )}

                <div className="flex justify-end pt-4 mt-4" style={{ borderTop: "1px solid var(--ba-border)" }}>
                    <Button variant="ghost" onClick={cerrarModalInvitar}>Cerrar</Button>
                </div>
            </Modal>
        </div>
    );
}
