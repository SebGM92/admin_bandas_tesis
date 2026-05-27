from django.contrib import admin
from .models import Banda, Membresia, Ensayo


@admin.register(Banda)
class BandaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'genero_musical', 'fecha_creacion')
    search_fields = ('nombre', 'genero_musical')


@admin.register(Membresia)
class MembresiaAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'banda', 'rol', 'fecha_ingreso')
    list_filter = ('banda', 'rol')


@admin.register(Ensayo)
class EnsayoAdmin(admin.ModelAdmin):
    list_display = ('banda', 'fecha_hora_inicio',
                    'fecha_hora_fin', 'ubicacion')
    list_filter = ('banda', 'fecha_hora_inicio')
