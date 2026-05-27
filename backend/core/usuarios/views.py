import requests
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import serializers
from django.core.mail import send_mail
from django.conf import settings
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
# <-- Importamos el motor criptográfico
from django.core.signing import TimestampSigner, SignatureExpired, BadSignature
from .models import Usuario


class RegistroUsuarioView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'error': 'Email y contraseña son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

        if Usuario.objects.filter(email=email).exists():
            return Response({'error': 'Este correo electrónico ya está registrado.'}, status=status.HTTP_400_BAD_REQUEST)

        username_temporal = email.split('@')[0]

        usuario = Usuario.objects.create_user(
            username=username_temporal,
            email=email,
            password=password,
            is_active=False
        )

        # --- NUEVA ARQUITECTURA: FIRMA CRIPTOGRÁFICA ---
        uidb64 = urlsafe_base64_encode(force_bytes(usuario.pk))
        signer = TimestampSigner()
        # Firmamos el UID. El token incluirá un sello de tiempo y una firma irrompible.
        token = signer.sign(uidb64)

        enlace_activacion = f"http://localhost:3000/activar/{uidb64}/{token}"

        mensaje_texto = f"""
        ¡Hola {username_temporal}!
        
        Bienvenido a BandAdmin. Estamos emocionados de que unas tu talento a nuestra plataforma.
        
        Para activar tu cuenta y poder iniciar sesión, haz clic en el siguiente enlace:
        {enlace_activacion}
        
        Si no solicitaste esta cuenta, puedes ignorar este correo de forma segura.
        
        ¡A rockear!
        El equipo de BandAdmin
        """

        try:
            send_mail(
                subject="Activa tu cuenta en BandAdmin",
                message=mensaje_texto,
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[email],
                fail_silently=False,
            )
            return Response({'mensaje': 'Usuario creado. Revisa tu correo.'}, status=status.HTTP_201_CREATED)

        except Exception as e:
            usuario.delete()
            return Response({'error': f'Error al enviar el correo: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ActivarCuentaView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            usuario = Usuario.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            return Response({'error': 'Enlace corrupto.'}, status=status.HTTP_400_BAD_REQUEST)

        # Lógica Idempotente: Si ya está activo (ej: doble clic), no hacemos nada y damos OK
        if usuario.is_active:
            return Response({'mensaje': 'La cuenta ya está activada.'}, status=status.HTTP_200_OK)

        # --- VALIDACIÓN DE LA FIRMA CRIPTOGRÁFICA ---
        signer = TimestampSigner()
        try:
            # Verificamos que el token sea válido y no tenga más de 48 horas (172800 segundos)
            uid_desencriptado = signer.unsign(token, max_age=172800)

            # Si nadie manipuló el token, los datos coincidirán
            if uid_desencriptado == uidb64:
                usuario.is_active = True
                usuario.save()
                return Response({'mensaje': 'Cuenta activada exitosamente.'}, status=status.HTTP_200_OK)
            else:
                raise BadSignature

        except SignatureExpired:
            return Response({'error': 'El enlace ha expirado.'}, status=status.HTTP_400_BAD_REQUEST)
        except BadSignature:
            return Response({'error': 'El enlace de activación es inválido.'}, status=status.HTTP_400_BAD_REQUEST)


# --- ENDPOINTS DE PERFIL (Se mantienen igual) ---

class PerfilUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['username', 'instrumento_principal']


class PerfilUsuarioView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        usuario = request.user
        serializer = PerfilUpdateSerializer(
            usuario, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'mensaje': 'Perfil actualizado con éxito.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UsuarioMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Blindaje arquitectónico: Evitamos un Error 500 si el modelo aún no enlaza bien sus 'choices'
        try:
            instrumento = request.user.get_instrumento_principal_display()
        except AttributeError:
            instrumento = getattr(
                request.user, 'instrumento_principal', 'Sin Instrumento')

        return Response({
            'username': request.user.username,
            'email': request.user.email,
            'instrumento_principal': instrumento if instrumento else "Sin Instrumento"
        })


class GoogleLoginView(APIView):
    """
    Recibe el token de acceso de Google desde el frontend.
    Lo valida con la API de Google, extrae el correo electrónico,
    y crea al usuario o inicia su sesión devolviendo tokens JWT propios.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        access_token = request.data.get('access_token')

        if not access_token:
            return Response({'error': 'Token de Google faltante.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Django le pregunta a Google por la identidad de este token
        google_response = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )

        if not google_response.ok:
            return Response({'error': 'Token de Google inválido o expirado.'}, status=status.HTTP_401_UNAUTHORIZED)

        # 2. Extraemos los datos verificados por Google
        user_data = google_response.json()
        email = user_data.get('email')

        if not email:
            return Response({'error': 'No se pudo obtener el correo desde Google.'}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Buscamos al usuario o lo creamos (Token Swapping)
        try:
            # Si el usuario ya existe, lo obtenemos
            usuario = Usuario.objects.get(email=email)
        except Usuario.DoesNotExist:
            # Si es la primera vez que entra con Google, le creamos la cuenta
            username_temporal = email.split('@')[0]

            # NUEVA ARQUITECTURA: Creamos la instancia sin contraseña
            usuario = Usuario(
                username=username_temporal,
                email=email,
                is_active=True  # Activado automáticamente gracias a la verificación de Google
            )
            # Bloqueamos permanentemente el inicio de sesión con contraseña tradicional para esta cuenta
            usuario.set_unusable_password()
            usuario.save()

        # 4. Generamos los Tokens JWT oficiales de BandAdmin
        refresh = RefreshToken.for_user(usuario)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            # Bandera para saber si mandarlo al Onboarding
            'es_nuevo': not usuario.instrumento_principal
        }, status=status.HTTP_200_OK)
