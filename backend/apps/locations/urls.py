from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepartmentViewSet, LocationViewSet

router = DefaultRouter()
router.register('departments', DepartmentViewSet)
router.register('locations', LocationViewSet)

urlpatterns = [path('', include(router.urls))]
