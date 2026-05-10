from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from .models import RepairTicket, RepairWork
from .serializers import RepairTicketSerializer, RepairWorkSerializer
from apps.accounts.permissions import CanWrite
from apps.assets.models import Asset, AssetHistory
from apps.assets.serializers import AssetListSerializer
from apps.assets.services import record_asset_changes


class RepairTicketViewSet(viewsets.ModelViewSet):
    queryset = RepairTicket.objects.select_related(
        'asset', 'reported_by', 'assigned_to'
    ).prefetch_related('works').all()
    serializer_class = RepairTicketSerializer
    permission_classes = [CanWrite]
    filterset_fields = ['status', 'priority', 'asset', 'assigned_to']
    search_fields = ['description', 'defect_type', 'asset__inventory_number', 'asset__name']
    ordering_fields = ['created_at', 'priority', 'status']

    def perform_create(self, serializer):
        ticket = serializer.save(reported_by=self.request.user)
        asset = ticket.asset
        if asset.status != Asset.STATUS_REPAIR:
            old_status = asset.get_status_display()
            asset.status = Asset.STATUS_REPAIR
            asset.save(update_fields=['status'])
            AssetHistory.objects.create(
                asset=asset,
                changed_by=self.request.user,
                field_changed='Статус',
                old_value=old_status,
                new_value='В ремонте',
                note=f'Создана заявка #{ticket.pk}',
            )

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        ticket = serializer.save()
        if old_status != ticket.status and ticket.status in (
            RepairTicket.STATUS_RESOLVED, RepairTicket.STATUS_CLOSED
        ):
            asset = ticket.asset
            # После замены со склада техника уже «В эксплуатации» — не сбрасывать на склад
            if asset.status == Asset.STATUS_REPAIR:
                asset.status = Asset.STATUS_WAREHOUSE
                asset.save(update_fields=['status', 'updated_at'])
                AssetHistory.objects.create(
                    asset=asset,
                    changed_by=self.request.user,
                    field_changed='Статус',
                    old_value='В ремонте',
                    new_value='На складе',
                    note=f'Заявка #{ticket.pk} закрыта',
                )

    @action(detail=True, methods=['post'], url_path='add-work')
    def add_work(self, request, pk=None):
        ticket = self.get_object()
        serializer = RepairWorkSerializer(data={**request.data, 'ticket': ticket.pk})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='replacement-candidates')
    def replacement_candidates(self, request, pk=None):
        ticket = self.get_object()
        qs = Asset.objects.filter(status=Asset.STATUS_WAREHOUSE).exclude(pk=ticket.asset_id).select_related(
            'category', 'location', 'manufacturer'
        )
        if request.query_params.get('all') != '1' and ticket.asset.category_id:
            qs = qs.filter(category_id=ticket.asset.category_id)
        qs = qs.order_by('inventory_number')[:80]
        return Response(AssetListSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'], url_path='replace-from-warehouse')
    @transaction.atomic
    def replace_from_warehouse(self, request, pk=None):
        ticket = self.get_object()
        if ticket.status in (RepairTicket.STATUS_CLOSED,):
            raise ValidationError('Нельзя заменить технику по закрытой заявке.')

        try:
            rid = int(request.data.get('replacement_asset_id'))
        except (TypeError, ValueError):
            raise ValidationError({'replacement_asset_id': 'Укажите целочисленный ID техники со склада.'})

        broken = ticket.asset
        try:
            replacement = Asset.objects.select_for_update().get(pk=rid)
        except Asset.DoesNotExist as exc:
            raise ValidationError({'replacement_asset_id': 'Единица не найдена.'}) from exc

        if replacement.pk == broken.pk:
            raise ValidationError('Выберите другую единицу (не ту, что в заявке).')
        if replacement.status != Asset.STATUS_WAREHOUSE:
            raise ValidationError('Можно выбрать только технику со статусом «На складе».')

        wh_location = replacement.location
        target_location = broken.location
        target_resp = broken.responsible_employee

        # Журнал: неисправная уходит на склад (учёт запаса)
        old_rep = {
            'status': replacement.status,
            'location_id': replacement.location_id,
            'responsible_employee_id': replacement.responsible_employee_id,
            'name': replacement.name,
            'description': replacement.description,
        }
        replacement.location = target_location
        replacement.responsible_employee = target_resp
        replacement.status = Asset.STATUS_IN_USE
        replacement.save(update_fields=['location', 'responsible_employee', 'status', 'updated_at'])
        record_asset_changes(replacement, old_rep, request.user)

        old_br = {
            'status': broken.status,
            'location_id': broken.location_id,
            'responsible_employee_id': broken.responsible_employee_id,
            'name': broken.name,
            'description': broken.description,
        }
        broken.location = wh_location
        broken.responsible_employee = None
        broken.status = Asset.STATUS_WAREHOUSE
        broken.save(update_fields=['location', 'responsible_employee', 'status', 'updated_at'])
        record_asset_changes(broken, old_br, request.user)

        ticket.asset = replacement
        ticket.save(update_fields=['asset', 'updated_at'])

        RepairWork.objects.create(
            ticket=ticket,
            performed_by=ticket.assigned_to,
            work_description=(
                f'Замена техники: снята {broken.inventory_number} ({broken.name}), '
                f'выдана со склада {replacement.inventory_number} ({replacement.name}).'
            ),
            parts_used=request.data.get('parts_note') or '',
        )

        ticket_refreshed = (
            RepairTicket.objects.select_related('asset', 'reported_by', 'assigned_to')
            .prefetch_related('works')
            .get(pk=ticket.pk)
        )
        return Response(RepairTicketSerializer(ticket_refreshed).data)


class RepairWorkViewSet(viewsets.ModelViewSet):
    queryset = RepairWork.objects.select_related('ticket', 'performed_by').all()
    serializer_class = RepairWorkSerializer
    permission_classes = [CanWrite]
    filterset_fields = ['ticket']
