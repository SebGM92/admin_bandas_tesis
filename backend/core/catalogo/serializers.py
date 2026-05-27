from rest_framework import serializers
from .models import Cancion, Repertorio, SeccionPista, Grabacion


class CancionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cancion
        fields = '__all__'


class RepertorioSerializer(serializers.ModelSerializer):
    titulo_cancion = serializers.CharField(
        source='cancion.titulo', read_only=True)
    # Exponemos la URL del PDF (si existe)
    url_pdf = serializers.FileField(
        source='cancion.archivo_pdf', read_only=True)

    class Meta:
        model = Repertorio
        fields = [
            'id',
            'banda',
            'cancion',
            'titulo_cancion',
            'url_pdf',  # Añadimos el PDF
            'estado',
            'ultima_vez_tocada'
        ]


class SeccionPistaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeccionPista
        fields = '__all__'


class GrabacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grabacion
        fields = '__all__'
