import re

from django.db import transaction

from .models import Asset, AssetHistory

_FIELD_LABELS = {
    'status': 'Статус',
    'location_id': 'Локация',
    'responsible_employee_id': 'Ответственный',
    'name': 'Наименование',
    'description': 'Описание',
}


def generate_inventory_numbers(base: str, count: int) -> list[str]:
    """Список уникальных инв. номеров: продолжение суффикса с цифрами или -001, -002…"""
    base = (base or '').strip()
    if count <= 1:
        return [base]
    match = re.match(r'^(.*?)(\d+)$', base)
    if match:
        prefix, num_str = match.group(1), match.group(2)
        start = int(num_str)
        width = len(num_str)
        return [f'{prefix}{start + i:0{width}d}' for i in range(count)]
    return [f'{base}-{i:03d}' for i in range(1, count + 1)]


@transaction.atomic
def create_assets_bulk(validated_data: dict, quantity: int) -> list[Asset]:
    base_inv = validated_data['inventory_number'].strip()
    numbers = generate_inventory_numbers(base_inv, quantity)
    existing = set(
        Asset.objects.filter(inventory_number__in=numbers).values_list('inventory_number', flat=True)
    )
    if existing:
        raise ValueError(f'Инвентарные номера уже заняты: {", ".join(sorted(existing))}')

    base_serial = (validated_data.get('serial_number') or '').strip()
    created = []
    for index, inv in enumerate(numbers):
        row = {**validated_data, 'inventory_number': inv}
        if index > 0:
            row.pop('photo', None)
        if quantity > 1 and base_serial:
            row['serial_number'] = f'{base_serial}-{index + 1:03d}'
        elif index > 0:
            row['serial_number'] = ''
        created.append(Asset.objects.create(**row))
    return created


def record_asset_creation(asset, user):
    AssetHistory.objects.create(
        asset=asset,
        changed_by=user,
        field_changed='Создан',
        old_value='',
        new_value=asset.inventory_number,
        note='Единица техники зарегистрирована в системе',
    )


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
