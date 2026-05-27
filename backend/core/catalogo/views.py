from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from bandas.models import Membresia
from django.db.models import Q
from .models import Cancion, Repertorio, SeccionPista, Grabacion
from .serializers import CancionSerializer, RepertorioSerializer, SeccionPistaSerializer, GrabacionSerializer


class CancionViewSet(viewsets.ModelViewSet):
    """
    Las canciones son 'públicas' en la plataforma (como un diccionario global).
    Cualquier banda puede sugerir 'Bohemian Rhapsody' y usar la misma Canción base,
    pero el estado de ensayo (Repertorio) es privado para cada banda.
    """
    queryset = Cancion.objects.all()
    serializer_class = CancionSerializer
    permission_classes = [IsAuthenticated]


class RepertorioViewSet(viewsets.ModelViewSet):
    """
    API endpoint para los setlists. 
    ESTE ES EL NÚCLEO DE LA SEGURIDAD MULTI-TENANT: 
    Un usuario solo puede ver y modificar el repertorio de las bandas a las que pertenece.
    """
    serializer_class = RepertorioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 1. Obtenemos el usuario que hizo la petición (extraído del Token JWT)
        usuario = self.request.user

        # 2. Le decimos a Django: Filtra la tabla Repertorio y devuelve SOLO las filas
        # donde la banda tenga al menos una membresía asociada a este usuario.
        return Repertorio.objects.filter(banda__membresias__usuario=usuario).distinct()

    def perform_create(self, serializer):
        # Medida de seguridad extra al crear:
        # Aseguramos que el usuario no intente inyectar datos para una banda a la que no pertenece
        banda = serializer.validated_data.get('banda')

        if banda.membresias.filter(usuario=self.request.user).exists():
            serializer.save()
        else:
            raise PermissionDenied(
                "No tienes permiso para agregar canciones a esta banda.")

    # --- NUEVA LÓGICA DE ROLES (RBAC) ---

    def check_lider_permission(self, banda_id):
        """Función auxiliar para verificar si el usuario es líder de esta banda"""
        membresia = Membresia.objects.filter(
            banda_id=banda_id, usuario=self.request.user).first()
        if not membresia or membresia.rol != 'Líder':
            raise PermissionDenied(
                "Operación rechazada: Solo el líder de la banda puede modificar o eliminar el repertorio.")

    def perform_destroy(self, instance):
        # Antes de borrar de la base de datos, verificamos el rol
        self.check_lider_permission(instance.banda.id)
        instance.delete()

    def perform_update(self, serializer):
        # Si el usuario está intentando cambiar el estado (Aprobar/Rechazar/Mover de columna)
        if 'estado' in self.request.data:
            self.check_lider_permission(serializer.instance.banda.id)

        serializer.save()


class SeccionPistaViewSet(viewsets.ModelViewSet):
    """API endpoint para el desglose de instrumentos por canción."""
    serializer_class = SeccionPistaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Un usuario solo ve las secciones de las canciones que están en el repertorio de sus bandas
        usuario = self.request.user
        return SeccionPista.objects.filter(cancion__repertorio__banda__membresias__usuario=usuario).distinct()


class GrabacionViewSet(viewsets.ModelViewSet):
    """API endpoint para las subidas de audio de los integrantes."""
    serializer_class = GrabacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Un usuario solo ve las grabaciones de sus compañeros de banda o las suyas propias
        usuario = self.request.user
        return Grabacion.objects.filter(
            Q(usuario=usuario) |
            Q(seccion__cancion__repertorio__banda__membresias__usuario=usuario)
        ).distinct()

    def perform_create(self, serializer):
        # Al subir un audio, forzamos que el "dueño" sea el usuario autenticado
        serializer.save(usuario=self.request.user)
