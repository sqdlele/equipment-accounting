from rest_framework import viewsets
from .models import Department, Location
from .serializers import DepartmentSerializer, LocationSerializer
from apps.accounts.permissions import CanWrite


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [CanWrite]
    search_fields = ['name']


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.select_related('department').all()
    serializer_class = LocationSerializer
    permission_classes = [CanWrite]
    filterset_fields = ['type', 'department']
    search_fields = ['name']
