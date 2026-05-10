from django.urls import path
from .views import (
    DashboardStatsView,
    ExportAssetsExcelView,
    ExportAssetsPdfView,
    ExportRepairsExcelView,
)

urlpatterns = [
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('reports/export/assets/excel/', ExportAssetsExcelView.as_view(), name='export-assets-excel'),
    path('reports/export/assets/pdf/', ExportAssetsPdfView.as_view(), name='export-assets-pdf'),
    path('reports/export/repairs/excel/', ExportRepairsExcelView.as_view(), name='export-repairs-excel'),
]
