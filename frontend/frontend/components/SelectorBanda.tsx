"use client";

import { useEffect, useState } from "react";
import { useBanda } from "@/context/BandaContext";

// 🔥 CAMBIO CRÍTICO: Definimos la URL de la API dinámicamente
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Banda {
    id: number;
    nombre: string;
}

export default function SelectorBanda() {
    const { bandaActiva, setBandaActiva } = useBanda();
    const [bandas, setBandas] = useState<Banda[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargarBandas = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            try {
                const res = await fetch(`${API_URL}/api/v1/bandas/`, {
                    headers: { "Authorization": `Bearer ${token}` },
                });

                if (res.ok) {
                    const data: Banda[] = await res.json();
                    setBandas(data);

                    // Inteligencia UX: Si el usuario tiene bandas pero no ha seleccionado ninguna, 
                    // le autoseleccionamos la primera por defecto.
                    if (data.length > 0 && !localStorage.getItem("banda_activa")) {
                        setBandaActiva(data[0]);
                    }
                }
            } catch (error) {
                console.error("Error al cargar las bandas para el selector.");
            } finally {
                setCargando(false);
            }
        };

        cargarBandas();
    }, [setBandaActiva]); // Se ejecuta al montar el componente

    // Cuando el usuario elige otra banda en el menú
    const manejarCambio = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const idSeleccionado = Number(e.target.value);
        const bandaEncontrada = bandas.find(b => b.id === idSeleccionado);
        if (bandaEncontrada) {
            setBandaActiva(bandaEncontrada);
        }
    };

    if (cargando) {
        return <div className="text-sm animate-pulse" style={{ color: "var(--ba-text-subtle)" }}>Cargando proyectos...</div>;
    }

    if (bandas.length === 0) {
        return <div className="text-sm" style={{ color: "var(--ba-danger)" }}>Sin bandas registradas</div>;
    }

    return (
        <div
            className="relative inline-flex items-center gap-2 h-10 pl-4 pr-8 rounded-full"
            style={{ border: "1px solid var(--ba-border)", background: "var(--ba-surface-2)" }}
        >
            <label htmlFor="selector-banda" className="text-sm hidden sm:inline" style={{ color: "var(--ba-text-muted)" }}>
                Proyecto
            </label>
            <select
                id="selector-banda"
                value={bandaActiva?.id || ""}
                onChange={manejarCambio}
                className="appearance-none bg-transparent border-none outline-none text-sm font-semibold cursor-pointer max-w-40 sm:max-w-none truncate"
                style={{ color: "var(--ba-text)" }}
            >
                <option value="" disabled>Selecciona una banda...</option>
                {bandas.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
            </select>
            <i
                className="ti ti-chevron-down"
                aria-hidden="true"
                style={{ color: "var(--ba-text-muted)", position: "absolute", right: 12, fontSize: 14, pointerEvents: "none" }}
            />
        </div>
    );
}