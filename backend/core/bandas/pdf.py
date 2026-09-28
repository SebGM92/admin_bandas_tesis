"""
Generación del PDF de Tech Rider / Stage Plot para una banda.

Se mantiene separado de views.py para que la lógica de maquetación del
documento no ensucie los ViewSets, y para poder reutilizarla a futuro
(por ejemplo, desde el EPK).
"""
import io

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
)

# Paleta reutilizada del branding del frontend (--ba-brand y grises neutros)
COLOR_BRAND = colors.HexColor("#7C3AED")
COLOR_BRAND_OSCURO = colors.HexColor("#4C1D95")
COLOR_TEXT_MUTED = colors.HexColor("#6B7280")
COLOR_TEXT = colors.HexColor("#111827")
COLOR_BORDER = colors.HexColor("#E5E7EB")


def _construir_estilos():
    estilos = getSampleStyleSheet()
    estilos.add(ParagraphStyle(
        name="BATitulo", parent=estilos["Title"], fontSize=22,
        textColor=COLOR_BRAND, alignment=0, spaceAfter=2,
    ))
    estilos.add(ParagraphStyle(
        name="BASubtitulo", parent=estilos["Normal"], fontSize=10.5,
        textColor=COLOR_TEXT_MUTED,
    ))
    estilos.add(ParagraphStyle(
        name="BASeccion", parent=estilos["Heading2"], fontSize=13,
        textColor=COLOR_TEXT, spaceBefore=14, spaceAfter=6,
    ))
    estilos.add(ParagraphStyle(
        name="BACelda", parent=estilos["Normal"], fontSize=8.5, leading=11,
    ))
    estilos.add(ParagraphStyle(
        name="BACeldaEncabezado", parent=estilos["Normal"], fontSize=9,
        textColor=colors.white, fontName="Helvetica-Bold",
    ))
    return estilos


def generar_tech_rider_pdf(banda, equipos):
    """
    Construye el PDF del Tech Rider / Stage Plot de una banda a partir
    de su equipamiento registrado (ya ordenado por tipo/nombre gracias
    al Meta.ordering del modelo Equipamiento).

    Devuelve un buffer BytesIO con el PDF, listo para escribir en una
    respuesta HTTP.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=2 * cm, bottomMargin=2 * cm,
        leftMargin=1.8 * cm, rightMargin=1.8 * cm,
        title=f"Tech Rider - {banda.nombre}",
    )
    estilos = _construir_estilos()
    elementos = []

    # --- ENCABEZADO ---
    elementos.append(Paragraph(banda.nombre, estilos["BATitulo"]))
    subtitulo = banda.genero_musical or "Género no especificado"
    elementos.append(Paragraph(f"Tech Rider &amp; Stage Plot · {subtitulo}", estilos["BASubtitulo"]))
    elementos.append(Spacer(1, 8))
    elementos.append(HRFlowable(width="100%", color=COLOR_BORDER, thickness=1))
    elementos.append(Spacer(1, 10))

    # --- CONTACTO DE PRODUCCIÓN (líder/es de la banda) ---
    lideres = banda.membresias.filter(rol="Líder").select_related("usuario")
    if lideres.exists():
        elementos.append(Paragraph("Contacto de producción", estilos["BASeccion"]))
        for membresia in lideres:
            correo = membresia.usuario.email or "Sin correo registrado"
            elementos.append(Paragraph(
                f"{membresia.usuario.username} — {correo}", estilos["BACelda"]
            ))
        elementos.append(Spacer(1, 4))

    # --- TABLA DE EQUIPAMIENTO ---
    elementos.append(Paragraph("Equipamiento e inputs", estilos["BASeccion"]))

    if not equipos:
        elementos.append(Paragraph(
            "Esta banda aún no tiene equipamiento registrado.", estilos["BACelda"]
        ))
    else:
        encabezados = ["Equipo", "Marca / Modelo", "Cant.", "Origen", "220V", "+48V", "Notas técnicas"]
        filas = [[Paragraph(h, estilos["BACeldaEncabezado"]) for h in encabezados]]
        estilos_tabla = [
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_BRAND),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (2, 0), (5, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]

        fila = 1
        tipo_actual = None
        for equipo in equipos:
            if equipo.tipo != tipo_actual:
                tipo_actual = equipo.tipo
                filas.append([Paragraph(equipo.get_tipo_display(), estilos["BACeldaEncabezado"]), "", "", "", "", "", ""])
                estilos_tabla.append(("BACKGROUND", (0, fila), (-1, fila), COLOR_BRAND_OSCURO))
                estilos_tabla.append(("SPAN", (0, fila), (-1, fila)))
                fila += 1

            filas.append([
                Paragraph(equipo.nombre, estilos["BACelda"]),
                Paragraph(equipo.marca_modelo or "-", estilos["BACelda"]),
                str(equipo.cantidad),
                "Propio" if equipo.propio else "Local",
                "Sí" if equipo.requiere_corriente else "-",
                "Sí" if equipo.requiere_phantom_power else "-",
                Paragraph(equipo.notas_tecnicas or "-", estilos["BACelda"]),
            ])
            fila += 1

        tabla = Table(
            filas,
            colWidths=[3.3 * cm, 3.3 * cm, 1.2 * cm, 1.6 * cm, 1.2 * cm, 1.2 * cm, 4.8 * cm],
            repeatRows=1,
        )
        tabla.setStyle(TableStyle(estilos_tabla))
        elementos.append(tabla)

    elementos.append(Spacer(1, 18))
    elementos.append(HRFlowable(width="100%", color=COLOR_BORDER, thickness=1))
    elementos.append(Spacer(1, 6))
    generado = timezone.localtime().strftime("%d/%m/%Y %H:%M")
    elementos.append(Paragraph(
        f"Documento generado automáticamente por BandAdmin el {generado}.",
        estilos["BASubtitulo"]
    ))

    doc.build(elementos)
    buffer.seek(0)
    return buffer
