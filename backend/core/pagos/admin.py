from django.contrib import admin
from .models import Suscripcion, Pago


@admin.register(Suscripcion)
class SuscripcionAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'estado', 'mercadopago_preapproval_id', 'fecha_actualizacion')
    list_filter = ('estado',)
    search_fields = ('usuario__username', 'usuario__email', 'mercadopago_preapproval_id')


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ('suscripcion', 'mercadopago_payment_id', 'estado', 'monto', 'fecha_recibido')
    list_filter = ('estado',)
    readonly_fields = ('payload_bruto',)
