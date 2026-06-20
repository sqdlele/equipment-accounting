from io import BytesIO
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from apps.assets.models import Asset
from apps.maintenance.models import RepairTicket
from .excel import generate_asset_excel, generate_repair_excel
from .pdf import generate_asset_pdf


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total_assets = Asset.objects.count()

        status_distribution = list(
            Asset.objects.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )
        for item in status_distribution:
            item['label'] = dict(Asset.STATUS_CHOICES).get(item['status'], item['status'])

        category_distribution = list(
            Asset.objects.values('category__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )

        assets_by_location = list(
            Asset.objects.exclude(location_id__isnull=True)
            .values('location__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )

        warehouse_on_stock = Asset.objects.filter(status=Asset.STATUS_WAREHOUSE).count()

        active_repairs = RepairTicket.objects.filter(
            status__in=[RepairTicket.STATUS_OPEN, RepairTicket.STATUS_IN_PROGRESS, RepairTicket.STATUS_WAITING_PARTS]
        ).count()

        recent_repairs = RepairTicket.objects.select_related('asset').order_by('-created_at')[:5]
        recent_repairs_data = [
            {
                'id': t.id,
                'asset_name': t.asset.name,
                'asset_inventory': t.asset.inventory_number,
                'status': t.status,
                'status_display': t.get_status_display(),
                'priority': t.priority,
                'priority_display': t.get_priority_display(),
                'created_at': t.created_at,
            }
            for t in recent_repairs
        ]

        return Response({
            'total_assets': total_assets,
            'status_distribution': status_distribution,
            'category_distribution': category_distribution,
            'assets_by_location': assets_by_location,
            'warehouse_on_stock': warehouse_on_stock,
            'active_repairs': active_repairs,
            'recent_repairs': recent_repairs_data,
        })


class ExportAssetsExcelView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assets = Asset.objects.select_related(
            'category', 'manufacturer', 'location', 'responsible_employee'
        ).all()
        wb = generate_asset_excel(assets)
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        response = HttpResponse(
            buffer.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="inventory.xlsx"'
        return response


class ExportAssetsPdfView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assets = list(Asset.objects.select_related(
            'category', 'location', 'responsible_employee'
        ).all())
        buffer = generate_asset_pdf(assets)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="inventory.pdf"'
        return response


class ExportRepairsExcelView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tickets = RepairTicket.objects.select_related('asset', 'assigned_to').all()
        wb = generate_repair_excel(tickets)
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        response = HttpResponse(
            buffer.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="repairs.xlsx"'
        return response
