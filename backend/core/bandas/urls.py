from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BandaViewSet, GastoViewSet, InvitacionViewSet, MembresiaViewSet, EnsayoViewSet, CancionViewSet, EquipamientoViewSet, PistaViewSet, TomaViewSet, ComentarioAudioViewSet

# El router crea automáticamente las URLs para nuestro CRUD
router = DefaultRouter()
router.register(r'bandas', BandaViewSet, basename='banda')
router.register(r'membresias', MembresiaViewSet, basename='membresia')
router.register(r'ensayos', EnsayoViewSet, basename='ensayo')
router.register(r'invitaciones', InvitacionViewSet, basename='invitacion')
router.register(r'gastos', GastoViewSet, basename='gasto')
router.register(r'canciones', CancionViewSet, basename='canciones')
router.register(r'equipamiento', EquipamientoViewSet, basename='equipamiento')
# --- MÓDULO MULTITRACK ---
router.register(r'pistas', PistaViewSet, basename='pista')
router.register(r'tomas', TomaViewSet, basename='toma')
router.register(r'comentarios-audio', ComentarioAudioViewSet, basename='comentario-audio')

urlpatterns = [
    path('', include(router.urls)),
]
