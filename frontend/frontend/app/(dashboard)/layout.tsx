"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { BandaProvider, useBanda } from "@/context/BandaContext";
import SelectorBanda from "@/components/SelectorBanda";

// --- INTERFAZ PARA EL SETLIST ---
interface CancionSetlist {
    id: number;
    titulo: string;
    artista: string;
}

function DashboardContent({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { bandaActiva } = useBanda();

    const [nombreUsuario, setNombreUsuario] = useState("Cargando...");
    const [instrumento, setInstrumento] = useState("Músico");

    // --- ESTADO Y LÓGICA PARA EL SETLIST DE LA SEMANA ---
    const [setlist, setSetlist] = useState<CancionSetlist[]>([]);

    // 1. Cargar datos del Usuario
    useEffect(() => {
        const fetchMe = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            try {
                const res = await fetch("http://127.0.0.1:8000/api/v1/usuarios/me/", {
                    cache: "no-store",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    setNombreUsuario(data.username || "Usuario");
                    if (data.instrumento_principal) {
                        setInstrumento(data.instrumento_principal);
                    }
                } else {
                    console.error("Error del backend:", await res.text());
                    setNombreUsuario("Usuario");
                }
            } catch (error) {
                console.error("Error de red:", error);
                setNombreUsuario("Usuario");
            }
        };

        fetchMe();
    }, [pathname]);

    // 2. Cargar el Setlist cuando cambie la banda o la ruta
    useEffect(() => {
        if (!bandaActiva) return;

        const cargarSetlist = async () => {
            const token = localStorage.getItem("access_token");
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/v1/canciones/?banda=${bandaActiva.id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Filtramos y guardamos solo las que tienen la estrella activada
                    setSetlist(data.filter((c: any) => c.en_setlist));
                }
            } catch (error) {
                console.error("Error al cargar setlist:", error);
            }
        };

        cargarSetlist();
    }, [bandaActiva, pathname]); // Volvemos a cargar si navegas para mantenerlo sincronizado

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("banda_activa");
        router.push("/login");
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden">

            {/* MENU LATERAL (SIDEBAR) */}
            <aside className="w-64 bg-gray-800 flex flex-col justify-between md:flex border-r border-gray-700">
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-minimalista">
                    <div className="h-16 flex items-center justify-center border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
                        <h1 className="text-xl font-bold text-blue-400 tracking-wide">BandAdmin</h1>
                    </div>

                    <nav className="p-4 space-y-1.5">
                        <Link href="/" className="block py-2.5 px-4 rounded-lg transition duration-200 hover:bg-gray-700 text-sm font-medium">
                            Inicio
                        </Link>
                        <Link href="/bandas" className="block py-2.5 px-4 rounded-lg transition duration-200 hover:bg-gray-700 text-sm font-medium">
                            Mis Bandas
                        </Link>
                        <Link href="/catalogo" className="block py-2.5 px-4 rounded-lg transition duration-200 hover:bg-gray-700 text-sm font-medium">
                            Catálogo Musical
                        </Link>
                        <Link href="/ensayos" className="block py-2.5 px-4 rounded-lg transition duration-200 hover:bg-gray-700 text-sm font-medium">
                            Calendario de Ensayos
                        </Link>
                        <Link href="/finanzas" className="block py-2.5 px-4 rounded-lg transition duration-200 hover:bg-gray-700 text-emerald-400 text-sm font-medium">
                            Finanzas
                        </Link>
                    </nav>

                    {/* --- NUEVA SECCIÓN: SETLIST DE LA SEMANA --- */}
                    {bandaActiva && (
                        <div className="mt-8 px-5 pb-6">
                            <h3 className="text-[11px] uppercase text-gray-500 font-extrabold tracking-widest mb-4 border-b border-gray-700/60 pb-2 flex items-center justify-between">
                                Setlist de la Semana
                                <span className="bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded text-[10px]">
                                    {setlist.length}
                                </span>
                            </h3>

                            {setlist.length === 0 ? (
                                <p className="text-xs text-gray-500 italic px-1">Sin canciones asignadas.</p>
                            ) : (
                                <ul className="space-y-2.5">
                                    {setlist.map(cancion => (
                                        <li key={cancion.id} className="bg-gray-900/60 p-2.5 rounded-md border border-gray-700/50 shadow-sm flex items-start gap-2.5 hover:border-gray-600 transition">
                                            <span className="text-blue-400 text-sm mt-0.5">🎵</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-200 leading-tight truncate" title={cancion.titulo}>
                                                    {cancion.titulo}
                                                </p>
                                                <p className="text-[10px] text-gray-500 truncate" title={cancion.artista}>
                                                    {cancion.artista || "Banda Original"}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {/* BOTÓN CERRAR SESIÓN */}
                <div className="p-4 border-t border-gray-700 bg-gray-800">
                    <button
                        onClick={handleLogout}
                        className="w-full bg-red-600/90 hover:bg-red-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition duration-200 flex justify-center items-center gap-2"
                    >
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* ÁREA PRINCIPAL */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* BARRA SUPERIOR (NAVBAR) */}
                <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 shrink-0">
                    <div className="text-xl font-bold text-blue-400 md:hidden tracking-wide">
                        BandAdmin
                    </div>

                    <div className="flex-1 flex justify-start md:pl-4">
                        <SelectorBanda />
                    </div>

                    <div className="flex items-center space-x-4 ml-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-white">
                                Bienvenido, {nombreUsuario}
                            </p>
                            <p className={`text-xs transition-colors duration-200 ${bandaActiva?.mi_rol === 'Líder' ? 'text-amber-400 font-bold' : 'text-blue-400 font-medium'
                                }`}>
                                {bandaActiva?.mi_rol === 'Líder'
                                    ? 'Rol: Líder'
                                    : `Músico: ${instrumento}`
                                }
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-gray-700 cursor-pointer hover:border-blue-400 transition shrink-0 text-sm">
                            {nombreUsuario.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* CONTENIDO DINÁMICO */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-6">
                    {children}
                </main>

            </div>
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <BandaProvider>
            <DashboardContent>{children}</DashboardContent>
        </BandaProvider>
    );
}