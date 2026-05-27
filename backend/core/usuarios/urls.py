from django.urls import path
from .views import ActivarCuentaView, PerfilUsuarioView, RegistroUsuarioView, UsuarioMeView, GoogleLoginView

urlpatterns = [
    path('registro/', RegistroUsuarioView.as_view(), name='registro_usuario'),
    path('perfil/', PerfilUsuarioView.as_view(), name='perfil_update'),
    path('me/', UsuarioMeView.as_view(), name='usuario_me'),
    # NUEVA RUTA: Recibe dos variables dinámicas en la URL
    path('activar/<uidb64>/<token>/',
         ActivarCuentaView.as_view(), name='activar_cuenta'),
    path('google/', GoogleLoginView.as_view(), name='google_login'),
]
