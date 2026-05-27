from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """
    Modelo de usuario personalizado. 
    Hereda de AbstractUser para mantener la autenticación base de Django,
    pero permite agregar campos específicos del dominio musical.
    """
    # Opciones predefinidas para mantener consistencia en la base de datos
    INSTRUMENTOS_CHOICES = [
        ('VOZ', 'Voz'),
        ('GUITARRA', 'Guitarra'),
        ('BAJO', 'Bajo'),
        ('BATERIA', 'Batería'),
        ('PIANO', 'Piano / Teclado'),
        ('GUITARRA_VOZ', 'Guitarra & Voz'),
        ('OTRO', 'Otro'),
    ]

    # Sobrescribimos el email para que sea único, lo cual es ideal para el login
    email = models.EmailField(unique=True, verbose_name='Correo Electrónico')

    # Atributos personalizados
    instrumento_principal = models.CharField(
        max_length=20,
        choices=INSTRUMENTOS_CHOICES,
        blank=True,
        null=True,
        verbose_name='Instrumento Principal'
    )

    # NUEVO CAMPO: Biografía o descripción del músico
    biografia = models.TextField(
        blank=True,
        null=True,
        verbose_name='Biografía / Descripción',
        help_text='Breve descripción del músico, influencias o experiencia.'
    )

    def __str__(self):
        # Esto define cómo se mostrará el usuario en la terminal y en el panel de admin
        # Agregamos una validación por si el instrumento aún no ha sido seleccionado
        instrumento = self.get_instrumento_principal_display() or "Sin Instrumento"
        return f"{self.username} - {instrumento}"
