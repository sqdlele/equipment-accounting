from io import BytesIO
from datetime import date
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os


def _register_fonts():
    fonts_dir = os.path.join(os.path.dirname(__file__), 'fonts')
    regular = os.path.join(fonts_dir, 'DejaVuSans.ttf')
    bold = os.path.join(fonts_dir, 'DejaVuSans-Bold.ttf')
    if os.path.exists(regular):
        pdfmetrics.registerFont(TTFont('DejaVu', regular))
        pdfmetrics.registerFont(TTFont('DejaVu-Bold', bold))
        return 'DejaVu', 'DejaVu-Bold'
    return 'Helvetica', 'Helvetica-Bold'


def generate_asset_pdf(assets):
    buffer = BytesIO()
    font_name, font_bold = _register_fonts()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName=font_bold,
        fontSize=14,
        spaceAfter=6,
        alignment=1,
    )
    normal_style = ParagraphStyle(
        'CustomNormal',
        fontName=font_name,
        fontSize=8,
    )

    story = []
    story.append(Paragraph('ИНВЕНТАРИЗАЦИОННАЯ ВЕДОМОСТЬ ИТ-ТЕХНИКИ', title_style))
    story.append(Paragraph(f'АО «ИРЗ»  |  Дата формирования: {date.today().strftime("%d.%m.%Y")}', normal_style))
    story.append(Spacer(1, 0.4 * cm))

    headers = ['№', 'Инв. номер', 'Наименование', 'Категория', 'Статус', 'Локация', 'Ответственный', 'Год изг.']
    table_data = [headers]

    for idx, asset in enumerate(assets, 1):
        year_cell = str(asset.manufacture_year) if asset.manufacture_year else '—'
        table_data.append([
            str(idx),
            asset.inventory_number,
            asset.name[:35],
            asset.category.name if asset.category else '—',
            asset.get_status_display(),
            asset.location.name if asset.location else '—',
            asset.responsible_employee.full_name[:25] if asset.responsible_employee else '—',
            year_cell,
        ])

    col_widths = [1 * cm, 3 * cm, 7 * cm, 3.5 * cm, 3.5 * cm, 4 * cm, 5 * cm, 2 * cm]
    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    header_color = colors.HexColor('#1E40AF')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), header_color),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), font_bold),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), font_name),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))

    story.append(table)
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(f'Итого: {len(assets)} единиц оборудования', normal_style))

    doc.build(story)
    buffer.seek(0)
    return buffer
