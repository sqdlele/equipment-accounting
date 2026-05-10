from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RepairTicketViewSet, RepairWorkViewSet

router = DefaultRouter()
router.register('repairs', RepairTicketViewSet, basename='repair')
router.register('repair-works', RepairWorkViewSet, basename='repair-work')

urlpatterns = [path('', include(router.urls))]
