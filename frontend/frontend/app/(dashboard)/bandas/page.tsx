"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Banda {
    id: number;
    nombre: string;
    genero_musical: string;
    fecha_creacion: string;
}

export default function MisBandas() {
    const router = useRouter();
    const [bandas, setBandas] = useState<Banda[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    // --- NUEVOS ESTADOS PARA CREAR BANDA ---
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

    if (cargando) return <div className="text-gray-400 p-8 animate-pulse">Cargando tus agrupaciones...</div>;
    if (error) return <div className="text-red-400 p-8">{error}</div>;

    return (
        <div className="p-6 relative">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Mis Bandas</h1>
                    <p className="text-gray-400">Selecciona un proyecto para administrar su catálogo y miembros.</p>
                </div>
                {/* BOTÓN SUPERIOR ACTIVADO */}
                <button
                    onClick={() => setMostrarModalCrear(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow transition"
                >
                    + Nueva Banda
                </button>
            </div>

            {bandas.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                    <p className="text-gray-400 text-lg mb-4">Aún no perteneces a ninguna banda.</p>
                    {/* BOTÓN CENTRAL ACTIVADO */}
                    <button
                        onClick={() => setMostrarModalCrear(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow transition"
                    >
                        Crear mi primera banda
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bandas.map((banda) => (
                        <div key={banda.id} className="relative group bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700 hover:border-blue-500 transition duration-200 flex flex-col justify-between h-full">

                            <button
                                onClick={(e) => handleEliminarBanda(e, banda.id, banda.nombre)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900/50 hover:bg-gray-900 p-2 rounded-full z-10"
                                title="Eliminar banda"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>

                            <Link href={`/bandas/${banda.id}`} className="block flex-1 cursor-pointer">
                                <div>
                                    <h3 className="text-xl font-bold mb-2 pr-8">{banda.nombre}</h3>
                                    <p className="text-gray-400 text-sm mb-4">Género: {banda.genero_musical || "No especificado"}</p>
                                </div>
                            </Link>

                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setBandaAInvitar(banda); }}
                                    className="text-green-400 text-sm hover:underline flex items-center gap-1"
                                >
                                    <span>+</span> Invitar Músicos
                                </button>
                                <Link href={`/bandas/${banda.id}`}>
                                    <span className="text-blue-400 text-sm hover:underline cursor-pointer">Administrar →</span>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- MODAL PARA CREAR BANDA --- */}
            {mostrarModalCrear && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
                        <h2 className="text-2xl font-bold text-white mb-4">Crear Nueva Banda</h2>
                        <form onSubmit={handleCrearBanda}>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">
                                    Nombre del Proyecto Musical
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={nombreBanda}
                                    onChange={(e) => setNombreBanda(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ej: Los Prisioneros, Soda Stereo..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setMostrarModalCrear(false)}
                                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={procesandoCreacion || !nombreBanda.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {procesandoCreacion ? "Creando..." : "Crear Banda"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL DE INVITACIONES (El tuyo intacto) --- */}
            {bandaAInvitar && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700 shadow-2xl">
                        <h3 className="text-2xl font-bold mb-2">Invitar a {bandaAInvitar.nombre}</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Genera un enlace único de invitación. Este enlace será válido por 7 días y solo podrá ser usado una vez.
                        </p>

                        {!enlaceGenerado ? (
                            <div className="flex justify-center mb-6">
                                <button
                                    onClick={generarEnlace}
                                    disabled={generando}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-bold rounded-lg disabled:opacity-50 w-full transition"
                                >
                                    {generando ? 'Generando código...' : 'Generar Enlace de Invitación'}
                                </button>
                            </div>
                        ) : (
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-gray-300">Enlace generado:</label>
                                <div className="flex bg-gray-900 border border-gray-600 rounded overflow-hidden">
                                    <input
                                        type="text"
                                        readOnly
                                        value={enlaceGenerado}
                                        className="w-full p-3 bg-transparent text-white outline-none text-sm"
                                    />
                                    <button
                                        onClick={copiarAlPortapapeles}
                                        className="bg-gray-700 hover:bg-gray-600 px-4 text-white transition"
                                        title="Copiar"
                                    >
                                        Copiar
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end border-t border-gray-700 pt-4 mt-2">
                            <button
                                onClick={() => { setBandaAInvitar(null); setEnlaceGenerado(""); }}
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}