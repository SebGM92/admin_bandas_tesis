from django.urls import path
from .views import CrearCheckoutView, EstadoPlanView, WebhookMercadoPagoView

urlpatterns = [
    path('estado/', EstadoPlanView.as_view(), name='pagos_estado'),
    path('checkout/', CrearCheckoutView.as_view(), name='pagos_checkout'),
    path('webhook/', WebhookMercadoPagoView.as_view(), name='pagos_webhook'),
]
