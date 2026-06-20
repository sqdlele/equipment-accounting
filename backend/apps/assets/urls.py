from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssetViewSet, CategoryViewSet, ManufacturerViewSet, AssetMovementViewSet

router = DefaultRouter()
router.register('assets', AssetViewSet, basename='asset')
router.register('movements', AssetMovementViewSet, basename='movement')
router.register('categories', CategoryViewSet)
router.register('manufacturers', ManufacturerViewSet)

urlpatterns = [path('', include(router.urls))]
