"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { BandaProvider, useBanda } from "@/context/BandaContext";
import SelectorBanda from "@/components/SelectorBanda";
import { Badge } from "@/components/ui/ui";

// --- INTERFAZ PARA EL SETLIST ---
interface CancionSetlist {
    id: number;
    titulo: string;
    artista: string;
}

const NAV_ITEMS = [
    { href: "/", label: "Inicio", icon: "home" },
    { href: "/bandas", label: "Mis bandas", icon: "users" },
    { href: "/catalogo", label: "Catálogo", icon: "music" },
    { href: "/ensayos", label: "Ensayos", icon: "calendar-event" },
    { href: "/finanzas", label: "Finanzas", icon: "file-invoice" },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { bandaActiva } = useBanda();

    const [nombreUsuario, setNombreUsuario] = useState("Cargando...");
    const [instrumento, setInstrumento] = useState("Músico");

    // --- ESTADO Y LÓGICA PARA EL SETLIST DE LA SEMANA ---
    const [setlist, setSetlist] = useState<CancionSetlist[]>([]);

    // --- SIDEBAR COMO DRAWER EN MOBILE ---
    const [sidebarAbierto, setSidebarAbierto] = useState(false);

    // Cerramos el drawer automáticamente al navegar
    useEffect(() => {
        setSidebarAbierto(false);
    }, [pathname]);

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
        <div className="flex h-screen overflow-hidden" style={{ background: "var(--ba-bg)", color: "var(--ba-text)" }}>

            {/* OVERLAY (solo mobile, cierra el drawer al tocar fuera) */}
            {sidebarAbierto && (
                <div
                    className="fixed inset-0 z-30 md:hidden"
                    style={{ background: "rgba(3, 6, 12, 0.65)" }}
                    onClick={() => setSidebarAbierto(false)}
                    aria-hidden="true"
                />
            )}

            {/* MENU LATERAL (SIDEBAR / DRAWER EN MOBILE) */}
            <aside
                className={`w-64 flex flex-col justify-between fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0 ${sidebarAbierto ? "translate-x-0" : "-translate-x-full"
                    }`}
                style={{ background: "var(--ba-sidebar)", borderRight: "1px solid var(--ba-border)" }}
            >
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-minimalista">
                    <div
                        className="h-16 flex items-center gap-2.5 px-5 sticky top-0 z-10"
                        style={{ borderBottom: "1px solid var(--ba-border)", background: "var(--ba-sidebar)" }}
                    >
                        <i className="ti ti-shield-check" aria-hidden="true" style={{ color: "var(--ba-brand)", fontSize: 22 }} />
                        <h1 className="text-lg font-bold tracking-wide" style={{ color: "var(--ba-text)" }}>BandAdmin</h1>
                        <button
                            onClick={() => setSidebarAbierto(false)}
                            aria-label="Cerrar menú"
                            className="absolute right-4 md:hidden"
                            style={{ color: "var(--ba-text-muted)" }}
                        >
                            <i className="ti ti-x" aria-hidden="true" />
                        </button>
                    </div>

                    <nav className="p-4 space-y-1.5">
                        {NAV_ITEMS.map((item) => {
                            const activo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 py-2.5 px-4 rounded-lg transition duration-200 text-sm font-medium ${activo ? "" : "hover:bg-[var(--ba-surface-2)]"
                                        }`}
                                    style={activo
                                        ? { background: "var(--ba-brand-soft)", color: "var(--ba-brand)" }
                                        : { color: "var(--ba-text-muted)" }}
                                >
                                    <i className={`ti ti-${item.icon}`} aria-hidden="true" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* --- NUEVA SECCIÓN: SETLIST DE LA SEMANA --- */}
                    {bandaActiva && (
                        <div className="mt-8 px-5 pb-6">
                            <h3
                                className="text-[11px] uppercase font-extrabold tracking-widest mb-4 pb-2"
                                style={{ color: "var(--ba-text-subtle)", borderBottom: "1px solid var(--ba-border)" }}
                            >
                                Setlist de la Semana
                            </h3>

                            {setlist.length === 0 ? (
                                <p className="text-xs italic px-1" style={{ color: "var(--ba-text-subtle)" }}>Sin canciones asignadas.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {setlist.map(cancion => (
                                        <li key={cancion.id} className="min-w-0">
                                            <p className="text-sm font-semibold leading-tight truncate" style={{ color: "var(--ba-text)" }} title={cancion.titulo}>
                                                {cancion.titulo}
                                            </p>
                                            <p className="text-xs truncate" style={{ color: "var(--ba-text-subtle)" }} title={cancion.artista}>
                                                {cancion.artista || "Banda Original"}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {/* BOTÓN CERRAR SESIÓN */}
                <div className="p-4" style={{ borderTop: "1px solid var(--ba-border)", background: "var(--ba-sidebar)" }}>
                    <button
                        onClick={handleLogout}
                        className="w-full text-sm font-medium py-2.5 px-4 rounded-lg transition duration-200 flex justify-center items-center gap-2"
                        style={{ background: "transparent", color: "var(--ba-text-muted)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ba-surface-2)"; e.currentTarget.style.color = "var(--ba-danger)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ba-text-muted)"; }}
                    >
                        <i className="ti ti-logout" aria-hidden="true" />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* ÁREA PRINCIPAL */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* BARRA SUPERIOR (NAVBAR) */}
                <header
                    className="h-16 flex items-center justify-between px-6 shrink-0"
                    style={{ background: "var(--ba-surface)", borderBottom: "1px solid var(--ba-border)" }}
                >
                    <div className="flex items-center gap-3 md:hidden">
                        <button
                            onClick={() => setSidebarAbierto(true)}
                            aria-label="Abrir menú"
                            style={{ color: "var(--ba-text-muted)" }}
                        >
                            <i className="ti ti-menu-2" aria-hidden="true" style={{ fontSize: 22 }} />
                        </button>
                        <span className="text-xl font-bold tracking-wide" style={{ color: "var(--ba-brand)" }}>
                            BandAdmin
                        </span>
                    </div>

                    <div className="flex-1 flex justify-start md:pl-4">
                        <SelectorBanda />
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                        {bandaActiva && (
                            <Badge tone={bandaActiva.mi_rol === 'Líder' ? 'warning' : 'brand'} className="hidden sm:inline-flex">
                                {bandaActiva.mi_rol === 'Líder' ? 'Líder' : instrumento}
                            </Badge>
                        )}
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg cursor-pointer transition shrink-0 text-sm"
                            style={{ background: "var(--ba-brand)", color: "var(--ba-on-brand)", border: "2px solid var(--ba-border)" }}
                            title={nombreUsuario}
                        >
                            {nombreUsuario.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* CONTENIDO DINÁMICO */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6" style={{ background: "var(--ba-bg)" }}>
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