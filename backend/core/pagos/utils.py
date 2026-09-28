"""
Reglas del plan Free y helpers para saber si un usuario/banda es Pro.

Los límites están centralizados acá (no repartidos como números mágicos
en cada ViewSet) para poder ajustarlos en un solo lugar.
"""

# --- LÍMITES DEL PLAN FREE ---
LIMITE_BANDAS_FREE = 1
LIMITE_TECH_RIDER_EXPORTS_FREE = 1
LIMITE_STEMS_POR_CANCION_FREE = 2
LIMITE_TOMAS_POR_PISTA_FREE = 1
LIMITE_COMENTARIOS_POR_TOMA_FREE = 5


def usuario_es_pro(usuario):
    """
    ¿Este usuario tiene una Suscripcion propia autorizada?
    (OneToOne opcional: si nunca la creó, simplemente no es Pro).
    """
    suscripcion = getattr(usuario, 'suscripcion', None)
    return bool(suscripcion and suscripcion.es_pro)


def banda_es_pro(banda):
    """
    Una banda es Pro si al menos uno de sus integrantes pagó el plan.
    Evita el escenario "el líder es Free pero un músico ya se suscribió
    y aun así la banda queda limitada".
    """
    return any(
        usuario_es_pro(membresia.usuario)
        for membresia in banda.membresias.select_related('usuario').all()
    )
