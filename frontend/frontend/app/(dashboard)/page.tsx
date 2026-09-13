"use client";

import { useState, useEffect } from "react";
import { useBanda } from "@/context/BandaContext";
import Link from "next/link";
import { Card, Button, Badge, StatGrid, StatCard, EmptyState } from "@/components/ui/ui";
import { groupByDay, formatTime, formatTimeRange, formatCLP, relativeDays } from "@/components/ui/format";

// 🔥 CAMBIO CRÍTICO: Definimos la URL de la API dinámicamente
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Ensayo {
  id: number;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  ubicacion: string;
  objetivo: string;
}

interface Cancion {
  id: number;
  estado: string;
}

interface Gasto {
  id: number;
  monto: number;
  fecha_gasto: string;
}

export default function DashboardPage() {
  const { bandaActiva } = useBanda();
  const [ensayos, setEnsayos] = useState<Ensayo[]>([]);
  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [miembros, setMiembros] = useState<unknown[]>([]);
  const [cargando, setCargando] = useState(false);

  // Cargamos los ensayos para mostrarlos en el resumen del home
  useEffect(() => {
    if (!bandaActiva) return;

    const cargarEnsayosHome = async () => {
      setCargando(true);
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`${API_URL}/api/v1/ensayos/?banda=${bandaActiva.id}`, {
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

  // Repertorio: total de canciones y cuántas en aprendizaje
  useEffect(() => {
    if (!bandaActiva) return;

    const cargarCanciones = async () => {
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`${API_URL}/api/v1/canciones/?banda=${bandaActiva.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) setCanciones(await res.json());
      } catch (error) {
        console.error("Error al cargar canciones en el Dashboard:", error);
      }
    };

    cargarCanciones();
  }, [bandaActiva]);

  // Gasto del mes
  useEffect(() => {
    if (!bandaActiva) return;

    const cargarGastos = async () => {
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`${API_URL}/api/v1/gastos/?banda=${bandaActiva.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) setGastos(await res.json());
      } catch (error) {
        console.error("Error al cargar gastos en el Dashboard:", error);
      }
    };

    cargarGastos();
  }, [bandaActiva]);

  // Integrantes activos
  useEffect(() => {
    if (!bandaActiva) return;

    const cargarMiembros = async () => {
      const token = localStorage.getItem("access_token");
      try {
        const res = await fetch(`${API_URL}/api/v1/membresias/?banda=${bandaActiva.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) setMiembros(await res.json());
      } catch (error) {
        console.error("Error al cargar integrantes en el Dashboard:", error);
      }
    };

    cargarMiembros();
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

  const gruposEnsayos = groupByDay(ensayos, (e) => e.fecha_hora_inicio);

  // TARJETA "PRÓXIMO ENSAYO": día corto + hora, con distancia relativa como hint
  const proximoEnsayo = ensayos[0];
  let valorProximoEnsayo = "—";
  if (proximoEnsayo) {
    const diaCorto = new Intl.DateTimeFormat("es-CL", { weekday: "short" })
      .format(new Date(proximoEnsayo.fecha_hora_inicio))
      .replace(".", "");
    valorProximoEnsayo = `${diaCorto.charAt(0).toUpperCase()}${diaCorto.slice(1)} ${formatTime(proximoEnsayo.fecha_hora_inicio)}`;
  }

  const enAprendizaje = canciones.filter((c) => c.estado === "En Aprendizaje").length;

  const ahora = new Date();
  const gastoDelMes = gastos
    .filter((g) => {
      const d = new Date(g.fecha_gasto);
      return d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth();
    })
    .reduce((acc, g) => acc + Number(g.monto), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ENCABEZADO DEL DASHBOARD */}
      <h1 className="ba-page-title">Panel de control</h1>

      {/* GRILLA DE MÉTRICAS RÁPIDAS */}
      <StatGrid>
        <StatCard
          label="Próximo ensayo"
          value={valorProximoEnsayo}
          hint={proximoEnsayo ? relativeDays(proximoEnsayo.fecha_hora_inicio) : undefined}
          hintTone="brand"
          icon="calendar-event"
        />
        <StatCard
          label="Repertorio"
          value={canciones.length}
          hint={enAprendizaje > 0 ? `${enAprendizaje} en aprendizaje` : undefined}
          hintTone="warning"
          icon="music"
        />
        <StatCard
          label="Gasto del mes"
          value={formatCLP(gastoDelMes)}
          hint={`${gastos.length} movimientos`}
          icon="report-money"
        />
        <StatCard
          label="Integrantes"
          value={miembros.length}
          hint={miembros.length === 1 ? "activo" : "activos"}
          hintTone="success"
          icon="users"
        />
      </StatGrid>

      {/* SECCIÓN PRINCIPAL: PRÓXIMOS ENSAYOS */}
      <Card flush style={{ overflow: "hidden" }}>
        <div
          className="px-6 py-4 flex justify-between items-center"
          style={{ borderBottom: "1px solid var(--ba-border)" }}
        >
          <h2 className="ba-section-title">Próximos ensayos</h2>
          <Link href="/ensayos" className="text-sm font-semibold hover:underline flex items-center gap-1" style={{ color: "var(--ba-brand)" }}>
            Ver agenda <i className="ti ti-arrow-right" aria-hidden="true" />
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
                  <p className="ba-label uppercase" style={{ marginBottom: "var(--ba-space-3)" }}>{dia.heading}</p>
                  <div className="space-y-4">
                    {dia.items.map((ensayo) => (
                      <div key={ensayo.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="font-semibold text-sm shrink-0" style={{ color: "var(--ba-text)" }}>
                            {formatTimeRange(ensayo.fecha_hora_inicio, ensayo.fecha_hora_fin)}
                          </span>
                          {ensayo.objetivo && (
                            <span className="text-sm ba-truncate" style={{ color: "var(--ba-text-muted)" }}>
                              {ensayo.objetivo}
                            </span>
                          )}
                        </div>
                        {ensayo.ubicacion && (
                          <Badge icon="map-pin" className="shrink-0">
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
