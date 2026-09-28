from django.conf import settings
from django.db import models


class Suscripcion(models.Model):
    """
    El estado del plan Pro de un Usuario. Una banda se considera Pro si
    CUALQUIERA de sus integrantes tiene una Suscripcion autorizada (ver
    pagos.utils.banda_es_pro): el objetivo es que "la banda se junte" para
    pagar el plan, no forzar a que sea justo el líder quien pague.

    El campo 'estado' usa los mismos valores que MercadoPago retorna para
    un Preapproval (pending/authorized/paused/cancelled), así evitamos
    tener que traducir entre dos vocabularios distintos.
    """
    ESTADO_CHOICES = [
        ('pending', 'Pendiente de autorización'),
        ('authorized', 'Autorizada (Pro activo)'),
        ('paused', 'Pausada'),
        ('cancelled', 'Cancelada'),
    ]

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='suscripcion')
    mercadopago_preapproval_id = models.CharField(
        max_length=100, blank=True, null=True, unique=True,
        help_text="ID de la suscripción (preapproval) en MercadoPago"
    )
    estado = models.CharField(
        max_length=20, choices=ESTADO_CHOICES, default='pending')
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Suscripción'
        verbose_name_plural = 'Suscripciones'

    @property
    def es_pro(self):
        return self.estado == 'authorized'

    def __str__(self):
        return f"{self.usuario.username} - {self.get_estado_display()}"


class Pago(models.Model):
    """
    Bitácora de las notificaciones/pagos que llegan desde MercadoPago.
    No es la fuente de verdad del plan (eso es Suscripcion.estado); sirve
    para auditar y depurar qué pasó con cada cobro.
    """
    suscripcion = models.ForeignKey(
        Suscripcion, on_delete=models.CASCADE, related_name='pagos')
    mercadopago_payment_id = models.CharField(
        max_length=100, blank=True, null=True)
    monto = models.DecimalField(
        max_digits=10, decimal_places=0, blank=True, null=True)
    estado = models.CharField(max_length=30, blank=True, null=True)
    payload_bruto = models.JSONField(
        blank=True, null=True,
        help_text="Copia cruda de la notificación recibida, para depurar."
    )
    fecha_recibido = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        ordering = ['-fecha_recibido']

    def __str__(self):
        return f"Pago {self.mercadopago_payment_id or '(sin id)'} - {self.estado}"
