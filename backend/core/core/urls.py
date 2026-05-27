"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings  # IMPORTANTE
from django.conf.urls.static import static  # IMPORTANTE

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/usuarios/', include('usuarios.urls')),
    # Endpoints de Autenticación JWT (Login)
    path('api/v1/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Conectamos las rutas de nuestra app bandas bajo el prefijo /api/v1/
    path('api/v1/usuarios/', include('usuarios.urls')),
    path('api/v1/', include('bandas.urls')),
    # Endpoints de catálogo
    path('api/v1/catalogo/', include('catalogo.urls')),
]

# ESTO ES LO QUE SOLUCIONA EL ERROR 404 EN DESARROLLO
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)
