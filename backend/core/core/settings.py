"""
Django settings for core project.
"""

from datetime import timedelta
from pathlib import Path
import os
import mimetypes
import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Cargar variables de entorno local
load_dotenv(BASE_DIR / '.env')

# Le enseñamos a Django a transmitir formatos de audio modernos correctamente
mimetypes.add_type("audio/webm", ".webm", True)
mimetypes.add_type("audio/ogg", ".ogg", True)
mimetypes.add_type("audio/mp4", ".m4a", True)
mimetypes.add_type("audio/mpeg", ".mp3", True)

# --- CONFIGURACIONES DE SEGURIDAD Y ENTORNO ---
# Leemos el SECRET_KEY desde el entorno. Si no existe, usa el de desarrollo.
SECRET_KEY = os.environ.get(
    'SECRET_KEY', 'django-insecure-6e-mqj24!tc%4#g4jk3%zu2#b&$$jzzrsc7f6_t(0dcsr9v5x(')

# CAMBIO CRÍTICO: DEBUG es False por defecto en producción, a menos que el .env diga lo contrario
DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() == 'true'

# Permitimos cualquier host en producción temporalmente para que Railway no bloquee la conexión
ALLOWED_HOSTS = ['*']


# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'corsheaders',

    # --- Librerías de terceros ---
    'rest_framework',
    'rest_framework_simplejwt',

    # --- Aplicaciones de tu proyecto ---
    'usuarios',
    'bandas',
    'catalogo',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


# --- CONFIGURACIÓN DE BASE DE DATOS UNIFICADA Y BLINDADA ---
cloud_db_url = os.environ.get('DATABASE_URL')

if cloud_db_url:
    # Si la variable existe, estamos 100% seguros de que estamos en producción (Railway)
    DATABASES = {
        'default': dj_database_url.config(
            default=cloud_db_url,
            conn_max_age=600,
            ssl_require=True
        )
    }
else:
    # Si la variable no existe, estamos en local con Docker
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': 'bandadmin_db',
            'USER': 'sebastian',
            'PASSWORD': os.environ.get('LOCAL_DB_PASSWORD', 'bandadmin2030'),
            'HOST': '127.0.0.1',
            'PORT': '5432',
        }
    }


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator', },
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator', },
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator', },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Indica que nuestro modelo personalizado manejará la autenticación
AUTH_USER_MODEL = 'usuarios.Usuario'


# --- CONFIGURACIÓN DE CORS ---
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


# --- CONFIGURACIÓN DE DJANGO REST FRAMEWORK ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

# --- CONFIGURACIÓN BÁSICA DE JWT ---
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}


# --- CONFIGURACIÓN DE CORREOS SEGURA ---
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_PASSWORD')


# --- CONFIGURACIÓN DE ARCHIVOS MULTIMEDIA (MEDIA FILES) ---
if not DEBUG:
    # PRODUCCIÓN: Usamos Cloudinary como almacenamiento remoto
    INSTALLED_APPS += [
        'cloudinary_storage',
        'cloudinary',
    ]
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': os.environ.get('CLOUDINARY_CLOUD_NAME'),
        'API_KEY': os.environ.get('CLOUDINARY_API_KEY'),
        'API_SECRET': os.environ.get('CLOUDINARY_API_SECRET'),
        'RESOURCE_TYPE': 'auto'
    }
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    MEDIA_URL = '/media/'
else:
    # DESARROLLO LOCAL: Guardamos en la carpeta de la PC
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'
