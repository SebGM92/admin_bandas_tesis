from django.http import HttpResponse
from django.utils.text import slugify
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .models import Banda, Gasto, Membresia, Ensayo, Invitacion, Cancion, Equipamiento, Pista, Toma, ComentarioAudio
from .serializers import BandaSerializer, InvitacionSerializer, MembresiaSerializer, EnsayoSerializer, InvitacionSerializer, GastoSerializer, CancionSerializer, EquipamientoSerializer, PistaSerializer, TomaSerializer, ComentarioAudioSerializer
from .pdf import generar_tech_rider_pdf


class BandaViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite ver o editar bandas.
    """
    serializer_class = BandaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Seguridad: un usuario solo puede ver/editar/borrar las bandas
        # a las que pertenece (igual que el resto de los ViewSets).
        return Banda.objects.filter(
            membresias__usuario=self.request.user).distinct()

    def perform_create(self, serializer):
        # 1. Guardamos la banda en la base de datos
        banda_creada = serializer.save()

        # 2. Creamos el vínculo automáticamente, asignando al creador como Líder
        Membresia.objects.create(
            banda=banda_creada,
            usuario=self.request.user,
            rol='Líder',
            es_administrador=True
        )

    # --- ENDPOINT PARA DESCARGAR EL TECH RIDER EN PDF ---
    # Ruta: GET /api/v1/bandas/{id}/tech-rider-pdf/
    @action(detail=True, methods=['get'], url_path='tech-rider-pdf')
    def tech_rider_pdf(self, request, pk=None):
        banda = self.get_object()

        # Seguridad: solo un miembro de la banda puede descargar su Tech Rider
        if not banda.membresias.filter(usuario=request.user).exists():
            raise PermissionDenied(
                "No perteneces a esta banda, no puedes descargar su Tech Rider.")

        equipos = banda.equipamiento.all()
        buffer = generar_tech_rider_pdf(banda, equipos)

        nombre_archivo = f"tech-rider-{slugify(banda.nombre) or 'banda'}.pdf"
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{nombre_archivo}"'
        return response


class MembresiaViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite ver o editar las membresías (roles).
    """
    serializer_class = MembresiaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 1. Seguridad: Solo ver membresías de bandas a las que el usuario pertenece
        queryset = Membresia.objects.filter(
            banda__membresias__usuario=self.request.user).distinct()

        # 2. Filtro dinámico: Si el frontend pide los miembros de una banda en específico
        banda_id = self.request.query_params.get('banda', None)
        if banda_id:
            queryset = queryset.filter(banda_id=banda_id)

        return queryset


class EnsayoViewSet(viewsets.ModelViewSet):
    serializer_class = EnsayoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        usuario = self.request.user
        # Aplicamos el mismo filtro de seguridad multi-tenant
        queryset = Ensayo.objects.filter(
            banda__membresias__usuario=usuario).distinct()

        banda_id = self.request.query_params.get('banda', None)
        if banda_id:
            queryset = queryset.filter(banda_id=banda_id)

        return queryset


class CancionViewSet(viewsets.ModelViewSet):
    serializer_class = CancionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        usuario = self.request.user
        # Filtramos para que solo vean canciones de bandas a las que pertenecen
        queryset = Cancion.objects.filter(
            banda__membresias__usuario=usuario).distinct()

        # Leemos el parámetro ?banda=ID que envía Next.js
        banda_id = self.request.query_params.get('banda', None)
        if banda_id:
            queryset = queryset.filter(banda_id=banda_id)

        es_maqueta_param = self.request.query_params.get('maquetas', None)
        if es_maqueta_param == 'true':
            queryset = queryset.filter(es_maqueta=True)
        else:
            queryset = queryset.filter(es_maqueta=False)

        return queryset

    def perform_create(self, serializer):
        # Si el JSON o FormData enviado por el frontend contiene un archivo de audio,
        # Django marcará automáticamente esta canción como una maqueta privada.
        if 'archivo_audio' in self.request.FILES or self.request.data.get('archivo_audio'):
            serializer.save(es_maqueta=True)
        else:
            serializer.save(es_maqueta=False)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context


class InvitacionViewSet(viewsets.ModelViewSet):
    serializer_class = InvitacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Un usuario solo puede ver las invitaciones de las bandas a las que pertenece
        return Invitacion.objects.filter(banda__membresias__usuario=self.request.user).distinct()

    def perform_create(self, serializer):
        # Cuando el líder hace POST desde Next.js, Django automáticamente dice:
        # "El creador de esta invitación es el usuario que hizo la petición"
        serializer.save(creado_por=self.request.user)

    # --- ENDPOINT PARA ACEPTAR LA INVITACIÓN ---
    # Esto creará la ruta: /api/v1/invitaciones/aceptar/{token}/
    @action(detail=False, methods=['post'], url_path='aceptar/(?P<token>[^/.]+)')
    def aceptar(self, request, token=None):
        try:
            invitacion = Invitacion.objects.get(token=token)
        except Invitacion.DoesNotExist:
            return Response({'error': 'Enlace de invitación inválido o inexistente.'}, status=status.HTTP_404_NOT_FOUND)

        # Usamos la property "es_valida" que creamos en el modelo
        if not invitacion.es_valida:
            return Response({'error': 'Esta invitación ha expirado o ya fue usada.'}, status=status.HTTP_400_BAD_REQUEST)

        # Evitar duplicados: verificar si el usuario ya está en la banda
        if Membresia.objects.filter(usuario=request.user, banda=invitacion.banda).exists():
            return Response({'error': 'Ya eres miembro de esta banda.'}, status=status.HTTP_400_BAD_REQUEST)

        # Magia: Crear la membresía para el nuevo usuario
        Membresia.objects.create(
            usuario=request.user,
            banda=invitacion.banda,
            rol='Músico'  # Actualizado al choice oficial que definiste en models.py
        )

        # Quemar la invitación para que no se re-utilice (Seguridad)
        invitacion.usada = True
        invitacion.save()

        return Response({
            'mensaje': f'¡Te has unido exitosamente a {invitacion.banda.nombre}!',
            'banda_id': invitacion.banda.id
        }, status=status.HTTP_200_OK)


class GastoViewSet(viewsets.ModelViewSet):
    """
    API endpoint para el Módulo de Finanzas.
    Permite registrar gastos asociados a una banda.
    """
    serializer_class = GastoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        usuario = self.request.user

        # 1. Filtramos los gastos base (solo de bandas a las que el usuario pertenece)
        queryset = Gasto.objects.filter(
            banda__membresias__usuario=usuario).distinct()

        # 2. Escuchamos el parámetro '?banda=ID' que envía Next.js
        banda_id = self.request.query_params.get('banda', None)
        if banda_id:
            # Si el frontend pidió una banda específica, refinamos la búsqueda
            queryset = queryset.filter(banda_id=banda_id)

        return queryset

    def perform_create(self, serializer):
        banda = serializer.validated_data.get('banda')

        # Verificamos que el usuario pertenezca a la banda antes de registrar el gasto
        if not banda.membresias.filter(usuario=self.request.user).exists():
            raise PermissionDenied(
                "No puedes registrar gastos en una banda a la que no perteneces.")

        # Guardamos automáticamente al usuario logueado como el que pagó
        serializer.save(pagado_por=self.request.user)


class EquipamientoViewSet(viewsets.ModelViewSet):
    serializer_class = EquipamientoSerializer
    permission_classes = [IsAuthenticated]  # Solo usuarios logueados

    def get_queryset(self):
        """
        Permite filtrar el equipamiento enviando el ID de la banda por URL.
        Ejemplo: /api/v1/equipamiento/?banda=2
        """
        usuario = self.request.user

        # Seguridad: Solo equipamiento de bandas a las que el usuario pertenece
        queryset = Equipamiento.objects.filter(
            banda__membresias__usuario=usuario).distinct()

        banda_id = self.request.query_params.get('banda', None)
        if banda_id is not None:
            # Filtramos solo los equipos de la banda solicitada
            queryset = queryset.filter(banda_id=banda_id)

        return queryset

    def perform_create(self, serializer):
        banda = serializer.validated_data.get('banda')

        # Verificamos que el usuario pertenezca a la banda antes de registrar el equipo
        if not banda.membresias.filter(usuario=self.request.user).exists():
            raise PermissionDenied(
                "No puedes registrar equipamiento en una banda a la que no perteneces.")

        serializer.save()


# --- MÓDULO MULTITRACK ---

class PistaViewSet(viewsets.ModelViewSet):
    """
    API endpoint para los 'stems' (Voz, Bajo, Batería, etc.) de una canción.
    """
    serializer_class = PistaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Seguridad: solo pistas de canciones de bandas a las que el usuario pertenece
        queryset = Pista.objects.filter(
            cancion__banda__membresias__usuario=self.request.user).distinct()

        cancion_id = self.request.query_params.get('cancion', None)
        if cancion_id:
            queryset = queryset.filter(cancion_id=cancion_id)

        return queryset

    def perform_create(self, serializer):
        cancion = serializer.validated_data.get('cancion')

        if not cancion.banda.membresias.filter(usuario=self.request.user).exists():
            raise PermissionDenied(
                "No puedes crear pistas en una canción de una banda a la que no perteneces.")

        serializer.save(creado_por=self.request.user)


class TomaViewSet(viewsets.ModelViewSet):
    """
    API endpoint para las grabaciones (tomas) que suben los integrantes a una Pista.
    """
    serializer_class = TomaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Toma.objects.filter(
            pista__cancion__banda__membresias__usuario=self.request.user).distinct()

        pista_id = self.request.query_params.get('pista', None)
        if pista_id:
            queryset = queryset.filter(pista_id=pista_id)

        return queryset

    def perform_create(self, serializer):
        pista = serializer.validated_data.get('pista')

        if not pista.cancion.banda.membresias.filter(usuario=self.request.user).exists():
            raise PermissionDenied(
                "No puedes subir tomas a una pista de una banda a la que no perteneces.")

        serializer.save(usuario=self.request.user)


class ComentarioAudioViewSet(viewsets.ModelViewSet):
    """
    API endpoint para los comentarios anclados a un instante (en segundos) de una Toma.
    """
    serializer_class = ComentarioAudioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ComentarioAudio.objects.filter(
            toma__pista__cancion__banda__membresias__usuario=self.request.user).distinct()

        toma_id = self.request.query_params.get('toma', None)
        if toma_id:
            queryset = queryset.filter(toma_id=toma_id)

        return queryset

    def perform_create(self, serializer):
        toma = serializer.validated_data.get('toma')

        if not toma.pista.cancion.banda.membresias.filter(usuario=self.request.user).exists():
            raise PermissionDenied(
                "No puedes comentar en una toma de una banda a la que no perteneces.")

        serializer.save(usuario=self.request.user)

    def perform_update(self, serializer):
        # Un comentario es la opinión de alguien puntual: solo su autor puede editarlo
        if serializer.instance.usuario != self.request.user:
            raise PermissionDenied("Solo puedes editar tus propios comentarios.")
        serializer.save()

    def perform_destroy(self, instance):
        # El autor del comentario o el líder de la banda pueden eliminarlo (moderación)
        banda = instance.toma.pista.cancion.banda
        es_lider = banda.membresias.filter(
            usuario=self.request.user, rol='Líder').exists()

        if instance.usuario != self.request.user and not es_lider:
            raise PermissionDenied(
                "No tienes permiso para eliminar este comentario.")

        instance.delete()
