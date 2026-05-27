from django.contrib import admin
from .models import Cancion, Repertorio, SeccionPista, Grabacion


@admin.register(Cancion)
class CancionAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'genero', 'bpm', 'tonalidad')
    search_fields = ('titulo', 'genero')


@admin.register(Repertorio)
class RepertorioAdmin(admin.ModelAdmin):
    list_display = ('cancion', 'banda', 'estado')
    list_filter = ('estado', 'banda')


@admin.register(SeccionPista)
class SeccionPistaAdmin(admin.ModelAdmin):
    list_display = ('cancion', 'nombre_instrumento')
    list_filter = ('cancion',)


@admin.register(Grabacion)
class GrabacionAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'seccion', 'fecha_subida')
    list_filter = ('usuario', 'fecha_subida')
