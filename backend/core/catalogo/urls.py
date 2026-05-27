from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CancionViewSet, RepertorioViewSet, SeccionPistaViewSet, GrabacionViewSet

# El router crea automáticamente las URLs para los ViewSets
router = DefaultRouter()
router.register(r'canciones', CancionViewSet, basename='cancion')
router.register(r'repertorio', RepertorioViewSet, basename='repertorio')
router.register(r'secciones', SeccionPistaViewSet, basename='seccion')
router.register(r'grabaciones', GrabacionViewSet, basename='grabacion')

urlpatterns = [
    path('', include(router.urls)),
]
