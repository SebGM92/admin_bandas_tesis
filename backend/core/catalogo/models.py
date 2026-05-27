from django.db import models
from django.conf import settings
from bandas.models import Banda
from django.utils import timezone


class Cancion(models.Model):
    titulo = models.CharField(
        max_length=200, verbose_name='Título de la Canción')
    genero = models.CharField(
        max_length=50, blank=True, null=True, verbose_name='Género Musical')
    bpm = models.PositiveIntegerField(
        blank=True, null=True, verbose_name='BPM (Pulsos por minuto)')
    tonalidad = models.CharField(
        max_length=20, blank=True, null=True, verbose_name='Tonalidad (Ej: Do Mayor, Am)')

    # NUEVO: Soporte para documentos PDF (Letras, Acordes, Partituras)
    archivo_pdf = models.FileField(
        upload_to='partituras/%Y/%m/',
        blank=True,
        null=True,
        verbose_name='Partitura o Letra (PDF)'
    )

    class Meta:
        # Esto le dice a PostgreSQL que siempre devuelva las canciones ordenadas alfabéticamente
        ordering = ['titulo']

    def __str__(self):
        return self.titulo


class Repertorio(models.Model):
    """
    Relación N:M entre Banda y Cancion. Permite a una banda tener su propio setlist.
    """
    ESTADO_CHOICES = [
        # Actualizamos los estados para que calcen perfecto con las 3 columnas de tu frontend
        ('SUGERIDA', 'Sugerida (Pendiente de Aprobación)'),  # NUEVO ESTADO INICIAL
        ('POR_TOCAR', 'Nuevas / Por Tocar'),
        ('APRENDIENDO', 'En Aprendizaje'),
        ('ACTIVA', 'Repertorio Activo'),
    ]
    banda = models.ForeignKey(
        Banda, on_delete=models.CASCADE, related_name='repertorio')
    cancion = models.ForeignKey(Cancion, on_delete=models.CASCADE)

    estado = models.CharField(
        max_length=20, choices=ESTADO_CHOICES, default='POR_TOCAR')

    # NUEVO CAMPO: Para el sistema de renovación del catálogo
    ultima_vez_tocada = models.DateField(
        null=True, blank=True, verbose_name='Última vez tocada en ensayo/en vivo')

    class Meta:
        unique_together = ('banda', 'cancion')

    def __str__(self):
        return f"{self.cancion.titulo} - {self.banda.nombre} ({self.estado})"


class SeccionPista(models.Model):
    """
    El desglose de la canción (Ej: Línea de bajo, Voz principal, Batería).
    """
    cancion = models.ForeignKey(
        Cancion, on_delete=models.CASCADE, related_name='secciones')
    nombre_instrumento = models.CharField(
        max_length=50, verbose_name='Instrumento / Voz')
    notas_o_tablatura = models.TextField(
        blank=True, null=True, verbose_name='Notas, acordes o indicaciones')

    def __str__(self):
        return f"{self.nombre_instrumento} - {self.cancion.titulo}"


class Grabacion(models.Model):
    """
    El entregable del usuario demostrando que aprendió su sección.
    """
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='grabaciones')
    seccion = models.ForeignKey(
        SeccionPista, on_delete=models.CASCADE, related_name='grabaciones')

    archivo_audio = models.FileField(
        upload_to='grabaciones/%Y/%m/', verbose_name='Archivo de Audio')
    fecha_subida = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Grabación de {self.usuario.username} - {self.seccion.nombre_instrumento}"
