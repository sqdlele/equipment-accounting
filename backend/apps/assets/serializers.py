from django.db import transaction
from rest_framework import serializers
from apps.employees.models import Employee
from apps.locations.models import Location
from .models import Asset, Category, Manufacturer, AssetHistory, AssetMovement
from .services import create_assets_bulk, generate_inventory_numbers, record_asset_changes


class CategorySerializer(serializers.ModelSerializer):
    asset_count = serializers.IntegerField(source='assets.count', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'asset_count']


class ManufacturerSerializer(serializers.ModelSerializer):
    asset_count = serializers.IntegerField(source='assets.count', read_only=True)

    class Meta:
        model = Manufacturer
        fields = ['id', 'name', 'asset_count']


class AssetHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AssetHistory
        fields = ['id', 'field_changed', 'old_value', 'new_value', 'changed_by', 'changed_by_name', 'changed_at', 'note']

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.username
        return None


class AssetListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    manufacturer_name = serializers.CharField(source='manufacturer.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    responsible_employee_name = serializers.CharField(source='responsible_employee.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Asset
        fields = [
            'id', 'inventory_number', 'serial_number', 'name', 'model',
            'category', 'category_name', 'manufacturer', 'manufacturer_name',
            'status', 'status_display', 'location', 'location_name',
            'manufacture_year',
            'responsible_employee', 'responsible_employee_name',
            'purchase_date', 'price',
            'photo', 'qr_code', 'created_at', 'updated_at',
        ]


class AssetDetailSerializer(AssetListSerializer):
    history = AssetHistorySerializer(many=True, read_only=True)
    description = serializers.CharField()

    class Meta(AssetListSerializer.Meta):
        fields = AssetListSerializer.Meta.fields + ['description', 'history']


class AssetWriteSerializer(serializers.ModelSerializer):
    quantity = serializers.IntegerField(
        default=1, min_value=1, max_value=50, write_only=True, required=False,
        help_text='Число одинаковых единиц техники (одна модель - несколько инв. номеров)',
    )

    class Meta:
        model = Asset
        fields = [
            'inventory_number', 'serial_number', 'name', 'model',
            'category', 'manufacturer', 'status', 'location',
            'manufacture_year',
            'responsible_employee', 'purchase_date',
            'price', 'description', 'photo', 'quantity',
        ]

    def validate(self, attrs):
        quantity = int(attrs.get('quantity') or 1)
        attrs['quantity'] = quantity
        if self.instance is not None:
            inv = (attrs.get('inventory_number') or self.instance.inventory_number or '').strip()
        else:
            inv = (attrs.get('inventory_number') or '').strip()
        if not inv:
            raise serializers.ValidationError({'inventory_number': 'Укажите инвентарный номер.'})
        if 'inventory_number' in attrs or self.instance is None:
            attrs['inventory_number'] = inv
        if self.instance is not None:
            return attrs
        if quantity > 1:
            numbers = generate_inventory_numbers(inv, quantity)
            taken = Asset.objects.filter(inventory_number__in=numbers).values_list(
                'inventory_number', flat=True,
            )
            if taken:
                raise serializers.ValidationError({
                    'inventory_number': (
                        f'Не хватает свободных номеров в серии (нужно {quantity}). '
                        f'Уже есть: {", ".join(sorted(taken))}. '
                        f'Пример серии: {numbers[0]} … {numbers[-1]}'
                    ),
                })
        return attrs

    def create(self, validated_data):
        quantity = validated_data.pop('quantity', 1)
        if quantity <= 1:
            return Asset.objects.create(**validated_data)
        try:
            return create_assets_bulk(validated_data, quantity)
        except ValueError as exc:
            raise serializers.ValidationError({'inventory_number': str(exc)}) from exc


class AssetMovementReadSerializer(serializers.ModelSerializer):
    asset_inventory_number = serializers.CharField(source='asset.inventory_number', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    from_location_name = serializers.CharField(source='from_location.name', read_only=True, allow_null=True)
    to_location_name = serializers.CharField(source='to_location.name', read_only=True, allow_null=True)
    from_responsible_name = serializers.CharField(
        source='from_responsible_employee.full_name', read_only=True, allow_null=True
    )
    to_responsible_name = serializers.CharField(
        source='to_responsible_employee.full_name', read_only=True, allow_null=True
    )
    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AssetMovement
        fields = [
            'id', 'asset', 'asset_inventory_number', 'asset_name',
            'from_location', 'from_location_name', 'to_location', 'to_location_name',
            'from_responsible_employee', 'from_responsible_name',
            'to_responsible_employee', 'to_responsible_name',
            'document_number', 'note', 'performed_by', 'performed_by_name', 'created_at',
        ]

    def get_performed_by_name(self, obj):
        if obj.performed_by:
            return obj.performed_by.get_full_name() or obj.performed_by.username
        return None


class AssetMovementWriteSerializer(serializers.Serializer):
    asset = serializers.PrimaryKeyRelatedField(queryset=Asset.objects.all())
    to_location = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(), allow_null=True, required=True,
    )
    to_responsible_employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), allow_null=True, required=True,
    )
    document_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    note = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        asset = attrs['asset']
        to_loc = attrs['to_location']
        to_emp = attrs['to_responsible_employee']
        new_loc_id = to_loc.pk if to_loc else None
        new_emp_id = to_emp.pk if to_emp else None
        if asset.location_id == new_loc_id and asset.responsible_employee_id == new_emp_id:
            raise serializers.ValidationError(
                'Выберите другую локацию или другого ответственного - иначе нет изменения для журнала.'
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context['request']
        asset = validated_data['asset']
        to_loc = validated_data['to_location']
        to_emp = validated_data['to_responsible_employee']
        document_number = validated_data.get('document_number') or ''
        note_text = validated_data.get('note') or ''

        movement = AssetMovement.objects.create(
            asset=asset,
            from_location=asset.location,
            from_responsible_employee=asset.responsible_employee,
            to_location=to_loc,
            to_responsible_employee=to_emp,
            document_number=document_number.strip(),
            note=note_text.strip(),
            performed_by=request.user if request.user.is_authenticated else None,
        )

        old_data = {
            'status': asset.status,
            'location_id': asset.location_id,
            'responsible_employee_id': asset.responsible_employee_id,
            'name': asset.name,
            'description': asset.description,
        }
        asset.location = to_loc
        asset.responsible_employee = to_emp
        asset.save(update_fields=['location', 'responsible_employee', 'updated_at'])
        record_asset_changes(asset, old_data, request.user if request.user.is_authenticated else None)

        return movement
