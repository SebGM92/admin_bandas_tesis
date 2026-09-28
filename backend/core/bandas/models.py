import uuid  # Para generar códigos únicos
from django.utils import timezone
from datetime import timedelta
from django.db import models
from django.conf import settings


class Instrumento(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100)
    familia = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.nombre


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

    # --- MÓDULO FREEMIUM: contador para el límite del plan gratuito ---
    tech_riders_exportados = models.PositiveIntegerField(
        default=0,
        verbose_name='Tech Riders exportados',
        help_text="Cuántas veces se descargó el PDF del Tech Rider (limitado en el plan Free)."
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
        unique_together = ('usuario', 'banda',)

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

# Asegúrate de heredar del nombre exacto de tu clase original (ej. Instrumento)


class InstrumentoProxy(Instrumento):
    class Meta:
        proxy = True  # Esto le dice a Django que NO cree una nueva tabla en la BD

        # Aquí defines bajo qué categoría quieres que aparezca
        # Reemplaza si tu app de usuarios se llama diferente (ej: 'users')
        app_label = 'usuarios'

        # El nombre que se mostrará en la interfaz
        verbose_name = 'Instrumento'
        verbose_name_plural = 'Instrumentos'


class Equipamiento(models.Model):
    TIPO_EQUIPO_CHOICES = [
        ('INSTRUMENTO', 'Instrumento (Guitarras, Bajos, Teclados)'),
        ('MICROFONIA', 'Microfonía (Dinámicos, Condensador, Inalámbricos)'),
        ('MONITOREO', 'Monitoreo (In-Ears, Monitores Activos)'),
        ('BACKLINE', 'Backline (Amplificadores, Baterías)'),
        ('ACCESORIOS', 'Accesorios (Cables XLR, Cajas Directas, Pedales)'),
    ]

    banda = models.ForeignKey(
        'Banda',  # Asegúrate de que coincida con el nombre de tu modelo de banda
        on_delete=models.CASCADE,
        related_name='equipamiento'
    )

    nombre = models.CharField(
        max_length=150,
        help_text="Ej: Gibson Gold Top Les Paul P90, Monitor Activo Wharfedale..."
    )
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_EQUIPO_CHOICES,
        default='INSTRUMENTO'
    )
    marca_modelo = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        help_text="Ej: Shure SM58, Behringer DI20, Klotz XLR"
    )
    cantidad = models.PositiveIntegerField(default=1)

    # Datos críticos para el ingeniero de sonido (Tech Rider)
    propio = models.BooleanField(
        default=True,
        help_text="¿La banda lleva este equipo o lo debe proveer el local?"
    )
    requiere_corriente = models.BooleanField(
        default=False,
        help_text="¿Necesita enchufe 220v en el escenario?"
    )
    requiere_phantom_power = models.BooleanField(
        default=False,
        help_text="¿Necesita +48v desde la consola?"
    )

    notas_tecnicas = models.TextField(
        blank=True,
        null=True,
        help_text="Instrucciones para el sonidista. Ej: 'Se usa con caja directa', 'Microfonear al centro del cono'."
    )
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['tipo', 'nombre']
        verbose_name = "Equipamiento"
        verbose_name_plural = "Equipamientos"

    def __str__(self):
        return f"{self.cantidad}x {self.nombre} ({self.get_tipo_display()})"


# --- MÓDULO MULTITRACK: Pistas (stems), Tomas y Comentarios con timestamp ---

class Pista(models.Model):
    """
    Un 'stem' dentro de una Cancion (Ej: Voz principal, Línea de bajo, Batería).
    Cada Pista puede acumular varias Tomas: versiones grabadas por distintos
    integrantes de la banda encima de la misma idea.
    """
    cancion = models.ForeignKey(
        Cancion, on_delete=models.CASCADE, related_name='pistas')
    nombre = models.CharField(
        max_length=100,
        verbose_name='Nombre del stem',
        help_text="Ej: Voz principal, Línea de bajo, Batería, Guitarra base"
    )
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='pistas_creadas'
    )
    orden = models.PositiveIntegerField(default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['orden', 'fecha_creacion']
        verbose_name = 'Pista (Stem)'
        verbose_name_plural = 'Pistas (Stems)'

    def __str__(self):
        return f"{self.nombre} - {self.cancion.titulo}"


class Toma(models.Model):
    """
    Una grabación de audio subida por un integrante para una Pista/stem
    específica. Varias Tomas de la misma Pista permiten comparar versiones
    (ej: dos intentos distintos de la línea de bajo).
    """
    pista = models.ForeignKey(
        Pista, on_delete=models.CASCADE, related_name='tomas')
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tomas_grabadas')
    archivo_audio = models.FileField(upload_to='multitrack/tomas/')
    fecha_subida = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_subida']
        verbose_name = 'Toma'
        verbose_name_plural = 'Tomas'

    def __str__(self):
        return f"Toma de {self.usuario.username} - {self.pista.nombre}"


class ComentarioAudio(models.Model):
    """
    Comentario anclado a un instante preciso (en segundos) de una Toma,
    como en un DAW/plataforma de colaboración musical.
    """
    toma = models.ForeignKey(
        Toma, on_delete=models.CASCADE, related_name='comentarios')
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comentarios_audio')
    texto = models.TextField()
    momento_segundos = models.FloatField(
        verbose_name='Segundo exacto del comentario',
        help_text="Posición en segundos dentro de la forma de onda"
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['momento_segundos']
        verbose_name = 'Comentario de audio'
        verbose_name_plural = 'Comentarios de audio'

    def __str__(self):
        return f"{self.usuario.username} @ {self.momento_segundos}s: {self.texto[:30]}"
