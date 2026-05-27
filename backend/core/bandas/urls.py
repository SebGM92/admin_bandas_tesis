from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BandaViewSet, GastoViewSet, InvitacionViewSet, MembresiaViewSet, EnsayoViewSet, CancionViewSet

# El router crea automáticamente las URLs para nuestro CRUD
router = DefaultRouter()
router.register(r'bandas', BandaViewSet, basename='banda')
router.register(r'membresias', MembresiaViewSet, basename='membresia')
router.register(r'ensayos', EnsayoViewSet, basename='ensayo')
router.register(r'invitaciones', InvitacionViewSet, basename='invitacion')
router.register(r'gastos', GastoViewSet, basename='gasto')
router.register(r'canciones', CancionViewSet, basename='canciones')

urlpatterns = [
    path('', include(router.urls)),
]
