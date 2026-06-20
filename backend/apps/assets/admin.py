from django.contrib import admin
from .models import Asset, Category, Manufacturer, AssetHistory, AssetMovement


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name']


@admin.register(Manufacturer)
class ManufacturerAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = [
        'inventory_number', 'name', 'category', 'status', 'location', 'responsible_employee',
    ]
    list_filter = ['status', 'category', 'manufacturer']
    search_fields = ['inventory_number', 'serial_number', 'name']
    readonly_fields = ['qr_code', 'created_at', 'updated_at']


@admin.register(AssetHistory)
class AssetHistoryAdmin(admin.ModelAdmin):
    list_display = ['asset', 'field_changed', 'old_value', 'new_value', 'changed_by', 'changed_at']
    list_filter = ['field_changed']
    readonly_fields = ['changed_at']


@admin.register(AssetMovement)
class AssetMovementAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'asset', 'from_location', 'to_location', 'performed_by', 'document_number']
    list_filter = ['created_at']
    search_fields = ['asset__inventory_number', 'document_number', 'note']
    raw_id_fields = [
        'asset', 'from_location', 'to_location',
        'from_responsible_employee', 'to_responsible_employee', 'performed_by',
    ]
    readonly_fields = ['created_at']
