"use client";

import { useState, useEffect } from "react";
import { useBanda } from "@/context/BandaContext";
import Link from "next/link";
import { Card, Button, Badge, EmptyState } from "@/components/ui/ui";
import { groupByDay, formatTime } from "@/components/ui/format";

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

  if (!bandaActiva) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <EmptyState
          icon="music"
          title="¡Bienvenido a BandAdmin!"
          body="Para comenzar a revisar el panel de control operativo, selecciona un proyecto musical en la barra superior o crea uno nuevo."
          action={
            <Link href="/bandas">
              <Button variant="primary">Ir a Mis Bandas</Button>
            </Link>
          }
        />
      </div>
    );
  }

  // Encabezado corto de fecha para cada tarjeta de ensayo, usando el mismo
  // heading agrupado por día que la agenda completa (evita duplicar formato).
  const gruposEnsayos = groupByDay(ensayos, (e) => e.fecha_hora_inicio);

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ENCABEZADO DEL DASHBOARD */}
      <div>
        <h1 className="ba-page-title">Panel de Control</h1>
        <p style={{ color: "var(--ba-text-muted)" }}>
          Resumen operativo para <span className="font-semibold" style={{ color: "var(--ba-brand)" }}>{bandaActiva.nombre}</span>.
        </p>
      </div>

      {/* GRILLA DE TARJETAS DE ESTADO RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* TARJETA 1: ROL DEL USUARIO */}
        <Card className="flex flex-col justify-between">
          <span className="text-sm font-medium" style={{ color: "var(--ba-text-muted)" }}>Mi Estado en el Proyecto</span>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--ba-text-subtle)" }}>Tu rol:</span>
            <Badge tone={bandaActiva?.mi_rol === 'Líder' ? 'warning' : 'brand'}>
              {bandaActiva?.mi_rol === 'Líder' ? 'Líder' : 'Músico'}
            </Badge>
          </div>
        </Card>

        {/* TARJETA 2: ACCESO RÁPIDO A FINANZAS */}
        <Card className="flex flex-col justify-between">
          <span className="text-sm font-medium" style={{ color: "var(--ba-text-muted)" }}>Balances y Rendiciones</span>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--ba-text-subtle)" }}>Módulo Contable:</span>
            <Link href="/finanzas" className="text-sm font-semibold hover:underline flex items-center gap-1" style={{ color: "var(--ba-success)" }}>
              Ver Finanzas <i className="ti ti-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </Card>

        {/* TARJETA 3: ACCESO RÁPIDO A CATÁLOGO */}
        <Card className="flex flex-col justify-between">
          <span className="text-sm font-medium" style={{ color: "var(--ba-text-muted)" }}>Repertorio Musical</span>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--ba-text-subtle)" }}>Canciones de la banda:</span>
            <Link href="/catalogo" className="text-sm font-semibold hover:underline flex items-center gap-1" style={{ color: "var(--ba-brand)" }}>
              Abrir Catálogo <i className="ti ti-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </Card>

      </div>

      {/* SECCIÓN PRINCIPAL: PRÓXIMOS ENSAYOS */}
      <Card flush style={{ overflow: "hidden" }}>
        <div
          className="p-6 flex justify-between items-center"
          style={{ borderBottom: "1px solid var(--ba-border)", background: "var(--ba-surface-2)" }}
        >
          <h2 className="ba-section-title flex items-center gap-2">
            <i className="ti ti-calendar-event" aria-hidden="true" style={{ color: "var(--ba-brand)" }} /> Próximos Ensayos Agendados
          </h2>
          <Link href="/ensayos" className="text-sm font-semibold hover:underline flex items-center gap-1" style={{ color: "var(--ba-brand)" }}>
            Administrar Agenda <i className="ti ti-arrow-right" aria-hidden="true" />
          </Link>
        </div>

        <div className="p-6">
          {cargando ? (
            <p className="text-center py-4 animate-pulse" style={{ color: "var(--ba-text-muted)" }}>Sincronizando agenda...</p>
          ) : ensayos.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p style={{ color: "var(--ba-text-subtle)" }}>No tienes ensayos pendientes en la agenda de este proyecto.</p>
              <Link href="/ensayos">
                <Button variant="secondary" size="sm" icon="plus">Agendar Primer Ensayo</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {gruposEnsayos.map((dia) => (
                <div key={dia.key}>
                  <p className="ba-label capitalize">{dia.heading}</p>
                  <div className="divide-y" style={{ borderColor: "var(--ba-surface-2)" }}>
                    {dia.items.map((ensayo) => (
                      <div key={ensayo.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color: "var(--ba-text)" }}>
                            {formatTime(ensayo.fecha_hora_inicio)} hrs
                          </p>
                          {ensayo.objetivo && (
                            <p className="text-xs ba-truncate" style={{ color: "var(--ba-text-muted)", maxWidth: "32rem" }}>
                              <span className="font-medium" style={{ color: "var(--ba-text-subtle)" }}>Objetivo:</span> {ensayo.objetivo}
                            </p>
                          )}
                        </div>
                        {ensayo.ubicacion && (
                          <Badge icon="map-pin">
                            {ensayo.ubicacion.startsWith("http") ? "Enlace Virtual" : ensayo.ubicacion}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

    </div>
  );
}
