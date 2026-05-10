from rest_framework import serializers
from .models import Department, Location


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class LocationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Location
        fields = [
            'id', 'name', 'room_code', 'type', 'type_display',
            'department', 'department_name', 'description',
        ]
