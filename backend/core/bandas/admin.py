from django.contrib import admin
from .models import Banda, Membresia, Ensayo, InstrumentoProxy


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


# Registra el modelo proxy
@admin.register(InstrumentoProxy)
class InstrumentoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'familia')
    readonly_fields = ('id',)
