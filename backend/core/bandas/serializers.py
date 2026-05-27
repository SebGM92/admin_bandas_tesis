from rest_framework import serializers
# Agregamos 'Cancion' al final de tus importaciones desde .models
from .models import Banda, Membresia, Ensayo, Invitacion, Gasto, Cancion


class BandaSerializer(serializers.ModelSerializer):
    # 1. Agregamos el campo virtual
    mi_rol = serializers.SerializerMethodField()

    class Meta:
        model = Banda
        fields = '__all__'  # Esto expone todos los campos del modelo + 'mi_rol'

    # 2. Agregamos la función que calcula el valor de 'mi_rol'
    def get_mi_rol(self, obj):
        # Extraemos el usuario que está haciendo la petición a la API
        request = self.context.get('request')

        # Validación de seguridad por si el serializer se usa en procesos internos sin request
        if not request or not request.user.is_authenticated:
            return "Desconocido"

        # Buscamos la membresía del usuario en esta banda en particular
        # Nota: Asume que pusimos related_name='membresias' en el modelo Membresia
        membresia = obj.membresias.filter(usuario=request.user).first()

        if membresia:
            return membresia.rol
        return "Desconocido"


class MembresiaSerializer(serializers.ModelSerializer):
    nombre_usuario = serializers.ReadOnlyField(source='usuario.username')
    instrumento = serializers.ReadOnlyField(
        source='usuario.instrumento_principal')

    class Meta:
        model = Membresia
        fields = [
            'id',
            'usuario',
            'nombre_usuario',
            'instrumento',
            'banda',
            'rol',
            'fecha_ingreso',
            'es_administrador'
        ]


class EnsayoSerializer(serializers.ModelSerializer):
    nombre_banda = serializers.CharField(source='banda.nombre', read_only=True)

    class Meta:
        model = Ensayo
        fields = ['id', 'banda', 'nombre_banda',
                  'fecha_hora_inicio', 'fecha_hora_fin', 'ubicacion', 'objetivo', 'asistentes']


class InvitacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitacion
        fields = ['id', 'banda', 'token',
                  'fecha_creacion', 'fecha_expiracion', 'usada']
        # Protegemos estos campos para que el frontend no pueda modificarlos (hackearlos)
        read_only_fields = ['token', 'fecha_creacion',
                            'fecha_expiracion', 'usada']


class GastoSerializer(serializers.ModelSerializer):
    # Cambiamos el nombre de la variable para que Next.js la lea directamente
    pagado_por_nombre = serializers.ReadOnlyField(
        source='pagado_por.username', default="Desconocido")
    nombre_banda = serializers.ReadOnlyField(source='banda.nombre')

    class Meta:
        model = Gasto
        fields = [
            'id',
            'banda',
            'nombre_banda',
            'descripcion',
            'monto',
            'pagado_por',
            'pagado_por_nombre',
            'comprobante_url',  # <-- Reflejamos el cambio aquí
            'fecha_gasto'
        ]
        read_only_fields = ['pagado_por', 'fecha_gasto']


# --- NUEVO SERIALIZADOR PARA EL MÓDULO DE CATÁLOGO ---
class CancionSerializer(serializers.ModelSerializer):
    # Campo opcional de solo lectura para saber el nombre de la banda si fuera necesario
    nombre_banda = serializers.ReadOnlyField(source='banda.nombre')

    class Meta:
        model = Cancion
        fields = [
            'id',
            'banda',
            'nombre_banda',
            'titulo',
            'artista',
            'estado',  # El campo clave para las columnas del tablero Kanban
            'partitura',
            'en_setlist',
            'archivo_audio'
        ]
