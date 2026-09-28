from rest_framework.exceptions import APIException


class LimiteFreemiumAlcanzado(APIException):
    """
    Se lanza cuando una cuenta/banda gratuita choca con un límite del
    plan Free. Usa 402 Payment Required en vez de 403, para que el
    frontend pueda distinguir "necesitas pagar" de "no tienes permiso"
    y mostrar el prompt de upgrade en vez de un error genérico.
    """
    status_code = 402
    default_detail = "Alcanzaste el límite del plan gratuito. Actualiza a Pro para continuar."
    default_code = 'limite_freemium'
