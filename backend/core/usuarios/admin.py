from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario

# Register your models here.
# Registramos el modelo con la configuración base de UserAdmin
admin.site.register(Usuario, UserAdmin)
