from rest_framework import serializers
from .models import Suscripcion


class SuscripcionSerializer(serializers.ModelSerializer):
    es_pro = serializers.BooleanField(read_only=True)

    class Meta:
        model = Suscripcion
        fields = ['id', 'estado', 'es_pro', 'fecha_inicio', 'fecha_actualizacion']
        read_only_fields = fields
