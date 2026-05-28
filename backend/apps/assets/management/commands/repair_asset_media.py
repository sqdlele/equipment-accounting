import os

from django.core.management.base import BaseCommand

from apps.assets.models import Asset


class Command(BaseCommand):
    help = 'Пересоздаёт QR-коды, если в БД есть запись, а файла на диске нет.'

    def handle(self, *args, **options):
        fixed = 0
        for asset in Asset.objects.exclude(qr_code='').iterator():
            if not asset.qr_code:
                continue
            try:
                path = asset.qr_code.path
            except ValueError:
                continue
            if os.path.isfile(path):
                continue
            asset.generate_qr_code()
            asset.save(update_fields=['qr_code'])
            fixed += 1
            self.stdout.write(f'QR восстановлен: {asset.inventory_number}')

        self.stdout.write(self.style.SUCCESS(f'Готово. Восстановлено QR: {fixed}'))
