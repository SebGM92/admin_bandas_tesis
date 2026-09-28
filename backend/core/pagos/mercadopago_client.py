"""
Capa fina sobre el SDK oficial de MercadoPago. Nadie fuera de este
archivo debería importar 'mercadopago' directamente: así, si mañana
cambia el SDK o la pasarela, el resto del proyecto no se entera.
"""
import logging

import mercadopago
from django.conf import settings

logger = logging.getLogger(__name__)


class MercadoPagoNoConfigurado(Exception):
    """El backend no tiene MERCADOPAGO_ACCESS_TOKEN configurado todavía."""


def _obtener_sdk():
    access_token = getattr(settings, 'MERCADOPAGO_ACCESS_TOKEN', None)
    if not access_token:
        raise MercadoPagoNoConfigurado(
            "Falta MERCADOPAGO_ACCESS_TOKEN en las variables de entorno. "
            "Consigue un access token de prueba en tu cuenta de MercadoPago "
            "Developers (modo sandbox) para poder generar el checkout."
        )
    return mercadopago.SDK(access_token)


def crear_suscripcion_pro(usuario):
    """
    Crea una suscripción (preapproval) sin plan asociado en MercadoPago
    para que el usuario la autorice con su propia tarjeta en el checkout
    hosteado. Devuelve (preapproval_id, init_point).
    """
    sdk = _obtener_sdk()

    preapproval_data = {
        "reason": "BandAdmin Pro - Suscripción mensual",
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": settings.MERCADOPAGO_PRECIO_PRO_CLP,
            "currency_id": "CLP",
        },
        "back_url": f"{settings.FRONTEND_URL}/planes/retorno",
        "payer_email": usuario.email,
        "status": "pending",
    }

    resultado = sdk.preapproval().create(preapproval_data)

    if resultado["status"] not in (200, 201):
        logger.error(
            "MercadoPago rechazó la creación de la suscripción (usuario=%s): %s",
            usuario.id, resultado.get("response"),
        )
        raise RuntimeError(
            f"MercadoPago devolvió un error al crear la suscripción: {resultado.get('response')}"
        )

    respuesta = resultado["response"]
    return respuesta["id"], respuesta["init_point"]


def consultar_suscripcion(preapproval_id):
    """
    Vuelve a preguntarle a MercadoPago por el estado real de una
    suscripción. Nunca confiamos en el 'status' que venga en el body de
    un webhook: siempre se re-consulta por ID, que es el patrón que
    recomienda MercadoPago para evitar notificaciones falsificadas.
    """
    sdk = _obtener_sdk()
    resultado = sdk.preapproval().get(preapproval_id)

    if resultado["status"] != 200:
        logger.error(
            "No se pudo consultar la suscripción %s en MercadoPago: %s",
            preapproval_id, resultado.get("response"),
        )
        raise RuntimeError(
            f"MercadoPago devolvió un error al consultar la suscripción: {resultado.get('response')}"
        )

    return resultado["response"]
