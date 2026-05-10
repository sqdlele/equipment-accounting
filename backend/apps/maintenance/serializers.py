from rest_framework import serializers
from .models import RepairTicket, RepairWork


class RepairWorkSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source='performed_by.full_name', read_only=True)

    class Meta:
        model = RepairWork
        fields = ['id', 'ticket', 'performed_by', 'performed_by_name', 'work_description', 'parts_used', 'performed_at']


class RepairTicketSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    asset_inventory = serializers.CharField(source='asset.inventory_number', read_only=True)
    reported_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    downtime_hours = serializers.FloatField(read_only=True)
    works = RepairWorkSerializer(many=True, read_only=True)

    class Meta:
        model = RepairTicket
        fields = [
            'id', 'asset', 'asset_name', 'asset_inventory',
            'reported_by', 'reported_by_name', 'assigned_to', 'assigned_to_name',
            'status', 'status_display', 'priority', 'priority_display',
            'description', 'defect_type', 'downtime_hours',
            'created_at', 'updated_at', 'resolved_at', 'works',
        ]

    def get_reported_by_name(self, obj):
        if obj.reported_by:
            return obj.reported_by.get_full_name() or obj.reported_by.username
        return None
