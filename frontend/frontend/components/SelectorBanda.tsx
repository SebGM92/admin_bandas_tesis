"use client";

import { useEffect, useState } from "react";
import { useBanda } from "@/context/BandaContext";

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
                const res = await fetch("http://127.0.0.1:8000/api/v1/bandas/", {
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
        return <div className="text-sm text-gray-500 animate-pulse">Cargando proyectos...</div>;
    }

    if (bandas.length === 0) {
        return <div className="text-sm text-red-400">Sin bandas registradas</div>;
    }

    return (
        <div className="flex items-center gap-2">
            <label htmlFor="selector-banda" className="text-sm text-gray-400 hidden md:block">
                Proyecto Activo:
            </label>
            <select
                id="selector-banda"
                value={bandaActiva?.id || ""}
                onChange={manejarCambio}
                className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 cursor-pointer shadow-sm hover:border-gray-500 transition"
            >
                <option value="" disabled>Selecciona una banda...</option>
                {bandas.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
            </select>
        </div>
    );
}