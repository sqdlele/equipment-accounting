from io import BytesIO



from collections import defaultdict

from django.db.models import Count
from django.http import HttpResponse

from openpyxl import load_workbook

from rest_framework import mixins, status, viewsets

from rest_framework.decorators import action

from rest_framework.exceptions import ValidationError as DRFValidationError

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from rest_framework.response import Response



from apps.accounts.permissions import CanWrite



from .import_excel import build_import_template_workbook, import_assets_workbook

from .models import Asset, Category, Manufacturer, AssetMovement

from .serializers import (

    AssetListSerializer,

    AssetDetailSerializer,

    AssetWriteSerializer,

    CategorySerializer,

    ManufacturerSerializer,

    AssetMovementReadSerializer,

    AssetMovementWriteSerializer,

)

from .services import record_asset_changes, record_asset_creation





class CategoryViewSet(viewsets.ModelViewSet):

    queryset = Category.objects.all()

    serializer_class = CategorySerializer

    permission_classes = [CanWrite]

    search_fields = ['name']





class ManufacturerViewSet(viewsets.ModelViewSet):

    queryset = Manufacturer.objects.all()

    serializer_class = ManufacturerSerializer

    permission_classes = [CanWrite]

    search_fields = ['name']





class AssetViewSet(viewsets.ModelViewSet):

    permission_classes = [CanWrite]

    filterset_fields = [

        'status', 'category', 'manufacturer', 'location', 'responsible_employee',

    ]

    search_fields = ['inventory_number', 'serial_number', 'name', 'model']

    ordering_fields = ['inventory_number', 'name', 'status', 'created_at']

    parser_classes = [MultiPartParser, FormParser, JSONParser]



    def get_queryset(self):

        return Asset.objects.select_related(

            'category', 'manufacturer', 'location', 'responsible_employee'

        ).all()



    def get_serializer_class(self):

        if self.action == 'retrieve':

            return AssetDetailSerializer

        if self.action in ('create', 'update', 'partial_update'):

            return AssetWriteSerializer

        return AssetListSerializer



    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        user = request.user if request.user.is_authenticated else None
        if isinstance(result, list):
            for asset in result:
                record_asset_creation(asset, user)
            data = AssetListSerializer(result, many=True).data
            return Response(
                {'quantity': len(result), 'assets': data, 'id': result[0].id},
                status=status.HTTP_201_CREATED,
            )
        record_asset_creation(result, user)
        out = AssetListSerializer(result)
        return Response(out.data, status=status.HTTP_201_CREATED)



    def perform_update(self, serializer):

        asset = serializer.instance

        old_data = {

            'status': asset.status,

            'location_id': asset.location_id,

            'responsible_employee_id': asset.responsible_employee_id,

            'name': asset.name,

            'description': asset.description,

        }

        updated = serializer.save()

        record_asset_changes(updated, old_data, self.request.user)



    @action(detail=False, methods=['get'], url_path='export/excel')

    def export_excel(self, request):

        from apps.reports.excel import generate_asset_excel

        assets = self.get_queryset()

        wb = generate_asset_excel(assets)

        buffer = BytesIO()

        wb.save(buffer)

        buffer.seek(0)

        response = HttpResponse(

            buffer.read(),

            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

        )

        response['Content-Disposition'] = 'attachment; filename="assets.xlsx"'

        return response



    @action(detail=False, methods=['get'], url_path='import-template')

    def import_template(self, request):

        wb = build_import_template_workbook()

        buffer = BytesIO()

        wb.save(buffer)

        buffer.seek(0)

        response = HttpResponse(

            buffer.read(),

            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

        )

        response['Content-Disposition'] = 'attachment; filename="import_assets_template.xlsx"'

        return response



    @action(

        detail=False,

        methods=['post'],

        url_path='import-excel',

        parser_classes=[MultiPartParser],

    )

    def import_excel_action(self, request):

        uploaded = request.FILES.get('file')

        if not uploaded:

            raise DRFValidationError({'file': 'Прикрепите файл .xlsx'})

        try:

            wb = load_workbook(uploaded)

        except Exception as exc:

            raise DRFValidationError({'file': f'Не удалось прочитать файл: {exc}'}) from exc

        result = import_assets_workbook(wb)

        return Response(result)



    @action(detail=False, methods=['get'], url_path='warehouse-summary')

    def warehouse_summary(self, request):

        qs = Asset.objects.filter(status=Asset.STATUS_WAREHOUSE)

        total = qs.count()

        rows = (

            qs.values('category_id', 'category__name', 'model')

            .annotate(unit_count=Count('id'))

            .order_by('category__name', 'model')

        )

        cat_models = defaultdict(lambda: defaultdict(int))

        cat_names = {}

        for row in rows:

            cid = row['category_id']

            cname = row['category__name'] or 'Без категории'

            cat_names[cid] = cname

            model_label = (row['model'] or '').strip() or '-'

            cat_models[cid][model_label] += row['unit_count']

        categories_out = []

        for cid in sorted(cat_models.keys(), key=lambda x: (cat_names.get(x, '') or '', x is None)):

            models_list = [

                {'model': m, 'count': cat_models[cid][m]}

                for m in sorted(cat_models[cid].keys(), key=lambda s: (s == '-', s.lower()))

            ]

            categories_out.append({

                'category_id': cid,

                'category_name': cat_names[cid],

                'models': models_list,

            })

        return Response({'total_on_warehouse': total, 'categories': categories_out})



    @action(detail=True, methods=['get'], url_path='qr')

    def qr_code_view(self, request, pk=None):

        asset = self.get_object()

        if asset.qr_code:

            return Response({'qr_url': request.build_absolute_uri(asset.qr_code.url)})

        asset.generate_qr_code()

        asset.save(update_fields=['qr_code'])

        return Response({'qr_url': request.build_absolute_uri(asset.qr_code.url)})





class AssetMovementViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):

    permission_classes = [CanWrite]

    filterset_fields = ['asset']

    ordering_fields = ['created_at', 'id']

    ordering = ['-created_at']



    def get_queryset(self):

        return AssetMovement.objects.select_related(

            'asset',

            'from_location',

            'to_location',

            'from_responsible_employee',

            'to_responsible_employee',

            'performed_by',

        ).all()



    def get_serializer_class(self):

        if self.action == 'create':

            return AssetMovementWriteSerializer

        return AssetMovementReadSerializer



    def create(self, request, *args, **kwargs):

        serializer = AssetMovementWriteSerializer(data=request.data, context={'request': request})

        serializer.is_valid(raise_exception=True)

        movement = serializer.save()

        out = AssetMovementReadSerializer(movement)

        return Response(out.data, status=201)


