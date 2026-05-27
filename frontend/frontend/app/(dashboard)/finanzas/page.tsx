"use client";

import { useState, useEffect } from "react";
import { useBanda } from "@/context/BandaContext";

// 1. Actualizamos la interfaz TypeScript
interface Gasto {
    id: number;
    descripcion: string;
    monto: number;
    pagado_por_nombre: string;
    fecha_gasto: string;
    comprobante_url?: string; // <-- Nuevo campo opcional
}

export default function FinanzasPage() {
    const { bandaActiva } = useBanda();

    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [descripcion, setDescripcion] = useState("");
    const [monto, setMonto] = useState("");
    const [comprobanteUrl, setComprobanteUrl] = useState(""); // <-- Nuevo estado
    const [procesando, setProcesando] = useState(false);

    useEffect(() => {
        if (!bandaActiva) return;

        const cargarGastos = async () => {
            const token = localStorage.getItem("access_token");
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/v1/gastos/?banda=${bandaActiva.id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setGastos(data);
                }
            } catch (error) {
                console.error("Error al cargar finanzas:", error);
            }
        };

        cargarGastos();
    }, [bandaActiva]);

    const handleRegistrarPago = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bandaActiva) return;

        setProcesando(true);
        const token = localStorage.getItem("access_token");

        try {
            const res = await fetch("http://127.0.0.1:8000/api/v1/gastos/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    descripcion: descripcion,
                    monto: parseInt(monto),
                    banda: bandaActiva.id,
                    comprobante_url: comprobanteUrl || null // <-- Lo enviamos al backend
                })
            });

            if (res.ok) {
                const nuevoGasto = await res.json();
                setGastos([nuevoGasto, ...gastos]);
                setDescripcion("");
                setMonto("");
                setComprobanteUrl(""); // Limpiamos el campo
            } else {
                alert("Error al registrar el gasto en el servidor.");
            }
        } catch (error) {
            alert("Error de red.");
        } finally {
            setProcesando(false);
        }
    };

    if (!bandaActiva) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 text-lg">Selecciona un proyecto activo en la parte superior para ver sus finanzas.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 flex flex-col md:flex-row gap-8">

            {/* FORMULARIO DE REGISTRO */}
            <div className="w-full md:w-1/3">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        💸 Registrar Nuevo Pago
                    </h2>
                    <form onSubmit={handleRegistrarPago}>
                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">Descripción</label>
                            <input
                                type="text" required
                                value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                                placeholder="Ej: Shure SM58"
                                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">Monto (CLP)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500">$</span>
                                <input
                                    type="number" required min="1"
                                    value={monto} onChange={(e) => setMonto(e.target.value)}
                                    placeholder="159990"
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-3 pl-8 text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        {/* NUEVO INPUT PARA EL ENLACE */}
                        <div className="mb-6">
                            <label className="block text-gray-400 text-sm mb-2">
                                Link del Comprobante <span className="text-gray-500 text-xs">(Opcional)</span>
                            </label>
                            <input
                                type="url"
                                value={comprobanteUrl} onChange={(e) => setComprobanteUrl(e.target.value)}
                                placeholder="https://drive.google.com/..."
                                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white outline-none focus:border-blue-500 text-sm"
                            />
                        </div>

                        <button
                            type="submit" disabled={procesando}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded transition disabled:opacity-50"
                        >
                            {procesando ? "Procesando..." : "Registrar Pago"}
                        </button>
                    </form>
                </div>
            </div>

            {/* HISTORIAL DE MOVIMIENTOS */}
            <div className="w-full md:w-2/3">
                <h2 className="text-2xl font-bold text-white mb-6">Historial de Movimientos</h2>

                {gastos.length === 0 ? (
                    <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center text-gray-400">
                        No hay gastos registrados en {bandaActiva.nombre}.
                    </div>
                ) : (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900 border-b border-gray-700">
                                <tr>
                                    <th className="p-4 text-gray-400 font-medium">Descripción</th>
                                    <th className="p-4 text-gray-400 font-medium">Pagado por</th>
                                    <th className="p-4 text-gray-400 font-medium">Fecha</th>
                                    <th className="p-4 text-emerald-400 font-medium text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gastos.map((gasto) => (
                                    <tr key={gasto.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                                        <td className="p-4 font-medium text-white">
                                            {/* Renderizamos la descripción y, si hay link, un botón pequeño al lado */}
                                            <div className="flex items-center gap-2">
                                                <span>{gasto.descripcion}</span>
                                                {gasto.comprobante_url && (
                                                    <a
                                                        href={gasto.comprobante_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Ver comprobante"
                                                        className="text-blue-400 hover:text-blue-300 transition"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                        </svg>
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            <span className="bg-gray-700 text-blue-400 font-semibold px-2 py-1 rounded text-xs uppercase tracking-wider">
                                                {gasto.pagado_por_nombre || "Desconocido"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm">{gasto.fecha_gasto}</td>
                                        <td className="p-4 text-emerald-400 font-bold text-right">
                                            ${gasto.monto.toLocaleString('es-CL')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}