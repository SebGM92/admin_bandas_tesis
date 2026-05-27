import uuid  # Para generar códigos únicos
from django.utils import timezone
from datetime import timedelta
from django.db import models
from django.conf import settings


class Banda(models.Model):
    nombre = models.CharField(
        max_length=100, verbose_name='Nombre de la Banda')
    genero_musical = models.CharField(
        max_length=50, blank=True, null=True, verbose_name='Género Musical')
    fecha_creacion = models.DateTimeField(
        auto_now_add=True, verbose_name='Fecha de Creación')

    integrantes = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='Membresia',
        related_name='bandas'
    )

    def __str__(self):
        return self.nombre


class Membresia(models.Model):
    """
    Tabla intermedia que conecta al Usuario con la Banda y le asigna un Rol.
    """
    # --- AJUSTE: Estandarizamos los roles para que Next.js los lea perfectamente ---
    ROLES_CHOICES = [
        ('Líder', 'Líder'),
        ('Músico', 'Músico'),
    ]

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    banda = models.ForeignKey(
        Banda, on_delete=models.CASCADE, related_name='membresias')

    rol = models.CharField(
        max_length=50,
        choices=ROLES_CHOICES,  # Restringimos a las opciones oficiales
        default='Músico',
        verbose_name='Rol en la banda'
    )
    fecha_ingreso = models.DateTimeField(auto_now_add=True)

    es_administrador = models.BooleanField(
        default=False,
        verbose_name='¿Es administrador/líder de la banda?'
    )

    class Meta:
        # --- AJUSTE: Un usuario solo puede tener un registro por banda ---
        unique_together = ('usuario', 'banda')

    def __str__(self):
        return f"{self.usuario.username} - {self.rol} en {self.banda.nombre}"


class Cancion(models.Model):
    # Definimos los 3 estados estrictos
    ESTADOS_CHOICES = [
        ('Por tocar', 'Por tocar'),
        ('En Aprendizaje', 'En Aprendizaje'),
        ('Repertorio Activo', 'Repertorio Activo'),
    ]

    banda = models.ForeignKey(
        Banda, on_delete=models.CASCADE, related_name='canciones')
    titulo = models.CharField(max_length=200)
    artista = models.CharField(max_length=200, blank=True, null=True)

    # Este es el campo mágico. Por defecto, todo entra a "Por tocar"
    estado = models.CharField(
        max_length=50,
        choices=ESTADOS_CHOICES,
        default='Por tocar'
    )

    partitura = models.FileField(
        upload_to='partituras/',
        blank=True,
        null=True,
        verbose_name='Partitura o Archivo adjunto (PDF)'
    )

    # --- NUEVO CAMPO: Agregado para almacenar las maquetas o tomas grabadas ---
    archivo_audio = models.FileField(
        upload_to='canciones/',
        blank=True,
        null=True,
        verbose_name='Archivo de Audio (Maqueta/Grabación)'
    )

    en_setlist = models.BooleanField(
        default=False,
        verbose_name='¿Está en el Setlist de esta semana?'
    )

    es_maqueta = models.BooleanField(
        default=False,
        verbose_name='¿Es una maqueta/grabación de referencia?'
    )

    def __str__(self):
        return f"{self.titulo} - {self.artista}"


class Ensayo(models.Model):
    banda = models.ForeignKey(
        Banda, on_delete=models.CASCADE, related_name='ensayos')
    fecha_hora_inicio = models.DateTimeField(verbose_name='Inicio del Ensayo')
    fecha_hora_fin = models.DateTimeField(verbose_name='Fin del Ensayo')
    ubicacion = models.CharField(
        max_length=200, blank=True, null=True, verbose_name='Ubicación/Link')

    objetivo = models.TextField(
        blank=True, null=True, help_text="Ej: Revisar el setlist para el viernes", verbose_name='Objetivo del ensayo')

    asistentes = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name='ensayos_asistidos')

    class Meta:
        ordering = ['fecha_hora_inicio']
        verbose_name = 'Ensayo'
        verbose_name_plural = 'Ensayos'

    def __str__(self):
        return f"Ensayo: {self.banda.nombre} - {self.fecha_hora_inicio.strftime('%d/%m/%Y %H:%M')}"


class Invitacion(models.Model):
    banda = models.ForeignKey(
        Banda, on_delete=models.CASCADE, related_name='invitaciones')
    token = models.UUIDField(
        default=uuid.uuid4, editable=False, unique=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    email_invitado = models.EmailField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_expiracion = models.DateTimeField()
    usada = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.id:
            self.fecha_expiracion = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def es_valida(self):
        return not self.usada and timezone.now() < self.fecha_expiracion

    def __str__(self):
        return f"Invitación para {self.banda.nombre} (Token: {self.token})"


class Gasto(models.Model):
    banda = models.ForeignKey(
        Banda, on_delete=models.CASCADE, related_name='gastos')
    descripcion = models.CharField(
        max_length=255, help_text="Ej: Sala de ensayo, Cuerdas, Grabación")
    monto = models.DecimalField(max_digits=10, decimal_places=0)
    pagado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='gastos_pagados')
    fecha_gasto = models.DateField(auto_now_add=True)

    # --- NUEVO CAMPO ---
    comprobante_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='Link del comprobante (Boleta, Drive, etc.)'
    )

    def __str__(self):
        return f"{self.descripcion} - ${self.monto} ({self.banda.nombre})"
