from django.contrib import admin
from .models import Department, Location


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name']


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ['name', 'room_code', 'type', 'department']
    list_filter = ['type', 'department']
    search_fields = ['name']
