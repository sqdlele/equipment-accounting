from rest_framework import viewsets
from .models import Employee
from .serializers import EmployeeSerializer
from apps.accounts.permissions import CanWrite


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('department').all()
    serializer_class = EmployeeSerializer
    permission_classes = [CanWrite]
    filterset_fields = ['department', 'is_active']
    search_fields = ['full_name', 'position', 'email']
