import logging

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from bandas.models import Banda
from .mercadopago_client import (
    MercadoPagoNoConfigurado, consultar_suscripcion, crear_suscripcion_pro,
)
from .models import Pago, Suscripcion
from .serializers import SuscripcionSerializer
from .utils import (
    LIMITE_BANDAS_FREE, LIMITE_COMENTARIOS_POR_TOMA_FREE,
    LIMITE_STEMS_POR_CANCION_FREE, LIMITE_TECH_RIDER_EXPORTS_FREE,
    LIMITE_TOMAS_POR_PISTA_FREE, banda_es_pro, usuario_es_pro,
)

logger = logging.getLogger(__name__)


class EstadoPlanView(APIView):
    """
    GET /api/v1/pagos/estado/?banda=<id>  (banda es opcional)

    Le dice al frontend si el usuario logueado es Pro, si la banda
    consultada es Pro, y cuáles son los límites vigentes del plan Free
    (para no tener que duplicar esos números en el frontend).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        suscripcion = getattr(request.user, 'suscripcion', None)

        data = {
            'usuario_es_pro': usuario_es_pro(request.user),
            'suscripcion': SuscripcionSerializer(suscripcion).data if suscripcion else None,
            'limites_free': {
                'bandas': LIMITE_BANDAS_FREE,
                'tech_rider_exports': LIMITE_TECH_RIDER_EXPORTS_FREE,
                'stems_por_cancion': LIMITE_STEMS_POR_CANCION_FREE,
                'tomas_por_pista': LIMITE_TOMAS_POR_PISTA_FREE,
                'comentarios_por_toma': LIMITE_COMENTARIOS_POR_TOMA_FREE,
            },
        }

        banda_id = request.query_params.get('banda')
        if banda_id:
            try:
                banda = Banda.objects.get(
                    id=banda_id, membresias__usuario=request.user)
            except Banda.DoesNotExist:
                return Response({'error': 'Banda no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
            data['banda_es_pro'] = banda_es_pro(banda)

        return Response(data)


class CrearCheckoutView(APIView):
    """
    POST /api/v1/pagos/checkout/

    Crea (o reutiliza) la suscripción del usuario en MercadoPago y
    devuelve la URL del checkout hosteado para redirigirlo ahí.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = request.user

        if usuario_es_pro(usuario):
            return Response(
                {'error': 'Ya tienes el plan Pro activo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            preapproval_id, init_point = crear_suscripcion_pro(usuario)
        except MercadoPagoNoConfigurado as e:
            logger.warning(str(e))
            return Response(
                {'error': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except RuntimeError as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        Suscripcion.objects.update_or_create(
            usuario=usuario,
            defaults={
                'mercadopago_preapproval_id': preapproval_id,
                'estado': 'pending',
            },
        )

        return Response({'init_point': init_point}, status=status.HTTP_201_CREATED)


class WebhookMercadoPagoView(APIView):
    """
    POST /api/v1/pagos/webhook/

    MercadoPago llama a esta URL cuando cambia el estado de una
    suscripción o llega un cobro. No confiamos en el contenido del
    aviso: solo lo usamos para saber QUÉ id consultar, y ahí sí le
    volvemos a preguntar a MercadoPago cuál es el estado real.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        return self._procesar(request)

    def get(self, request):
        # MercadoPago a veces manda la notificación como GET con query params.
        return self._procesar(request)

    def _procesar(self, request):
        # MercadoPago manda la notificación como query params (?type=...&data.id=...)
        # o como body JSON ({"type": "...", "data": {"id": "..."}}), según el evento.
        body = request.data if isinstance(request.data, dict) else {}
        data_body = body.get('data') if isinstance(body.get('data'), dict) else {}

        tipo = request.query_params.get('type') or request.query_params.get('topic') or body.get('type')
        preapproval_id = (
            request.query_params.get('data.id')
            or request.query_params.get('id')
            or data_body.get('id')
        )

        if tipo not in ('preapproval', 'subscription_preapproval') or not preapproval_id:
            # No es una notificación de suscripción que nos interese; respondemos 200
            # igual para que MercadoPago no siga reintentando.
            return Response(status=status.HTTP_200_OK)

        try:
            datos = consultar_suscripcion(preapproval_id)
        except Exception:
            logger.exception(
                "Error al consultar la suscripción %s desde el webhook", preapproval_id)
            return Response(status=status.HTTP_502_BAD_GATEWAY)

        try:
            suscripcion = Suscripcion.objects.get(
                mercadopago_preapproval_id=preapproval_id)
        except Suscripcion.DoesNotExist:
            logger.warning(
                "Webhook de una suscripción que no tenemos registrada: %s", preapproval_id)
            return Response(status=status.HTTP_200_OK)

        estado_nuevo = datos.get('status', suscripcion.estado)
        if estado_nuevo != suscripcion.estado:
            suscripcion.estado = estado_nuevo
            suscripcion.save(update_fields=['estado', 'fecha_actualizacion'])
            logger.info(
                "Suscripción %s actualizada a estado '%s' (usuario=%s)",
                preapproval_id, estado_nuevo, suscripcion.usuario_id,
            )

        Pago.objects.create(
            suscripcion=suscripcion,
            estado=estado_nuevo,
            payload_bruto=datos,
        )

        return Response(status=status.HTTP_200_OK)
