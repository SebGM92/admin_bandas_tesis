"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// 1. Definimos qué forma tiene nuestra información
interface BandaActiva {
    id: number;
    nombre: string;
    mi_rol?: string;
}

interface BandaContextType {
    bandaActiva: BandaActiva | null;
    setBandaActiva: (banda: BandaActiva | null) => void;
}

// 2. Creamos el contexto vacío
const BandaContext = createContext<BandaContextType | undefined>(undefined);

// 3. Creamos el "Proveedor" que envolverá nuestra aplicación
export function BandaProvider({ children }: { children: ReactNode }) {
    const [bandaActiva, setBandaActiva] = useState<BandaActiva | null>(null);

    // Al cargar la app, revisamos si el usuario ya había seleccionado una banda antes
    useEffect(() => {
        const guardada = localStorage.getItem("banda_activa");
        if (guardada) {
            setBandaActiva(JSON.parse(guardada));
        }
    }, []);

    // Función modificada para guardar en el estado y en localStorage al mismo tiempo
    const actualizarBanda = (banda: BandaActiva | null) => {
        setBandaActiva(banda);
        if (banda) {
            localStorage.setItem("banda_activa", JSON.stringify(banda));
        } else {
            localStorage.removeItem("banda_activa");
        }
    };

    return (
        <BandaContext.Provider value={{ bandaActiva, setBandaActiva: actualizarBanda }}>
            {children}
        </BandaContext.Provider>
    );
}

// 4. Creamos un Hook personalizado (useBanda) para usarlo fácilmente en otras pantallas
export function useBanda() {
    const context = useContext(BandaContext);
    if (context === undefined) {
        throw new Error("useBanda debe ser usado dentro de un BandaProvider");
    }
    return context;
}