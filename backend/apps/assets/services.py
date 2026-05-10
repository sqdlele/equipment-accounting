from .models import AssetHistory

_FIELD_LABELS = {
    'status': 'Статус',
    'location_id': 'Локация',
    'responsible_employee_id': 'Ответственный',
    'name': 'Наименование',
    'description': 'Описание',
}


def record_asset_changes(asset, old_data: dict, user):
    for field, label in _FIELD_LABELS.items():
        old_val = str(old_data.get(field) or '')
        new_val = str(getattr(asset, field, None) or '')
        if old_val != new_val:
            AssetHistory.objects.create(
                asset=asset,
                changed_by=user,
                field_changed=label,
                old_value=old_val,
                new_value=new_val,
            )
