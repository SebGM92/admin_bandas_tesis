"use client";

import { useState, useEffect } from "react";
import { useBanda } from "@/context/BandaContext";
import Link from "next/link";

interface Ensayo {
  id: number;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  ubicacion: string;
  objetivo: string;
}

export default function DashboardPage() {
  const { bandaActiva } = useBanda();
  const [ensayos, setEnsayos] = useState<Ensayo[]>([]);
  const [cargando, setCargando] = useState(false);

  // Cargamos los ensayos para mostrarlos en el resumen del home
  useEffect(() => {
    if (!bandaActiva) return;

    const cargarEnsayosHome = async () => {
      setCargando(true);
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/v1/ensayos/?banda=${bandaActiva.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();

          // Filtramos para mostrar solo los ensayos futuros o de hoy en adelante
          const ahora = new Date();
          const futuros = data.filter((e: Ensayo) => new Date(e.fecha_hora_fin) >= ahora);

          // Ordenamos cronológicamente (el más cercano primero) y tomamos los 3 primeros
          const proximos3 = futuros.sort(
            (a: Ensayo, b: Ensayo) => new Date(a.fecha_hora_inicio).getTime() - new Date(b.fecha_hora_inicio).getTime()
          ).slice(0, 3);

          setEnsayos(proximos3);
        }
      } catch (error) {
        console.error("Error al cargar ensayos en el Dashboard:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarEnsayosHome();
  }, [bandaActiva]);

  // Función auxiliar para el formato de hora corto en el dashboard
  const formatearFechaCorta = (fechaStr: string) => {
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    };
    return new Date(fechaStr).toLocaleDateString('es-CL', opciones);
  };

  if (!bandaActiva) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <span className="text-5xl mb-4">🎸</span>
        <h1 className="text-2xl font-bold text-white mb-2">¡Bienvenido a BandAdmin!</h1>
        <p className="text-gray-400 max-w-md mb-6">
          Para comenzar a revisar el panel de control operativo, selecciona un proyecto musical en la barra superior o crea uno nuevo.
        </p>
        <Link href="/bandas" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg transition">
          Ir a Mis Bandas
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ENCABEZADO DEL DASHBOARD */}
      <div>
        <h1 className="text-4xl font-extrabold text-white mb-2">Panel de Control</h1>
        <p className="text-gray-400">
          Resumen operativo para <span className="text-blue-400 font-semibold">{bandaActiva.nombre}</span>.
        </p>
      </div>

      {/* GRILLA DE TARJETAS DE ESTADO RAPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* TARJETA 1: ROL DEL USUARIO */}
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col justify-between shadow-sm">
          <span className="text-gray-400 text-sm font-medium">Mi Estado en el Proyecto</span>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-gray-500 text-sm">Tu rol:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${bandaActiva?.mi_rol === 'Líder'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
              {bandaActiva?.mi_rol === 'Líder' ? 'Líder' : 'Músico'}
            </span>
          </div>
        </div>

        {/* TARJETA 2: ACCESO RÁPIDO A FINANZAS */}
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col justify-between shadow-sm">
          <span className="text-gray-400 text-sm font-medium">Balances y Rendiciones</span>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-gray-500 text-sm">Módulo Contable:</span>
            <Link href="/finanzas" className="text-emerald-400 hover:underline text-sm font-semibold flex items-center gap-1">
              Ver Finanzas <span>→</span>
            </Link>
          </div>
        </div>

        {/* TARJETA 3: ACCESO RÁPIDO A CATÁLOGO */}
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col justify-between shadow-sm">
          <span className="text-gray-400 text-sm font-medium">Repertorio Musical</span>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-gray-500 text-sm">Canciones de la banda:</span>
            <Link href="/catalogo" className="text-blue-400 hover:underline text-sm font-semibold flex items-center gap-1">
              Abrir Catálogo <span>→</span>
            </Link>
          </div>
        </div>

      </div>

      {/* SECCIÓN PRINCIPAL: PRÓXIMOS ENSAYOS */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/40">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📅</span> Próximos Ensayos Agendados
          </h2>
          <Link
            href="/ensayos"
            className="text-blue-400 hover:underline text-sm font-semibold flex items-center gap-1"
          >
            Administrar Agenda →
          </Link>
        </div>

        <div className="p-6">
          {cargando ? (
            <p className="text-gray-400 text-center py-4 animate-pulse">Sincronizando agenda...</p>
          ) : ensayos.length === 0 ? (
            <div className="text-center py-6 text-gray-500 space-y-3">
              <p>No tienes ensayos pendientes en la agenda de este proyecto.</p>
              <Link href="/ensayos" className="inline-block bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-2 px-4 rounded transition">
                + Agendar Primer Ensayo
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/60">
              {ensayos.map((ensayo) => (
                <div key={ensayo.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-white capitalize text-sm">
                      {formatearFechaCorta(ensayo.fecha_hora_inicio)}
                    </p>
                    {ensayo.objetivo && (
                      <p className="text-xs text-gray-400 max-w-xl line-clamp-1">
                        <span className="text-gray-500 font-medium">Objetivo:</span> {ensayo.objetivo}
                      </p>
                    )}
                  </div>

                  {ensayo.ubicacion && (
                    <span className="bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-300 max-w-xs truncate flex items-center gap-1">
                      📍 {ensayo.ubicacion.startsWith("http") ? "Enlace Virtual" : ensayo.ubicacion}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
