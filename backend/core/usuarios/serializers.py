from rest_framework import serializers
from django.contrib.auth import get_user_model

# get_user_model() es la forma segura de llamar a tu modelo personalizado
Usuario = get_user_model()


class RegistroUsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        # Estos son los campos que pediremos en el formulario de Next.js
        fields = ('id', 'username', 'email',
                  'password', 'instrumento_principal')
        # write_only asegura que la contraseña se pueda enviar, pero la API nunca la devuelva al consultar
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # Usamos create_user en lugar de create() normal para que Django aplique el hash a la contraseña
        usuario = Usuario.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            instrumento_principal=validated_data.get(
                'instrumento_principal', '')
        )
        return usuario
