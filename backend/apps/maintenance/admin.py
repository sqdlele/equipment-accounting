from django.contrib import admin
from .models import RepairTicket, RepairWork


class RepairWorkInline(admin.TabularInline):
    model = RepairWork
    extra = 1


@admin.register(RepairTicket)
class RepairTicketAdmin(admin.ModelAdmin):
    list_display = ['id', 'asset', 'status', 'priority', 'assigned_to', 'created_at', 'resolved_at']
    list_filter = ['status', 'priority']
    search_fields = ['asset__inventory_number', 'description']
    inlines = [RepairWorkInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(RepairWork)
class RepairWorkAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'performed_by', 'performed_at']
    list_filter = ['performed_at']
