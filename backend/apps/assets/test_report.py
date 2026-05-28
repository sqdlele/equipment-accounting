"""Форматированный вывод результатов тестов для вставки в диплом (скрин консоли)."""
import sys


def _out(text: str = '') -> None:
    sys.__stdout__.write(text + '\n')
    sys.__stdout__.flush()


def report_banner() -> None:
    _out('')
    _out('=' * 72)
    _out('  ИРЗ: Мониторинг и учёт — автоматизированная проверка сценариев (API)')
    _out('  Команда: python manage.py test apps.assets')
    _out('=' * 72)


def report_scenario(
    number: int,
    title: str,
    *,
    figure: str = '',
    steps: list[str] | None = None,
    expected: str = '',
    actual: list[str] | None = None,
    ok: bool = True,
) -> None:
    status = 'ПРОЙДЕН' if ok else 'ОШИБКА'
    _out('')
    _out('-' * 72)
    _out(f'  Сценарий {number}. {title}')
    if figure:
        _out(f'  (для диплома: {figure})')
    _out('-' * 72)
    if steps:
        _out('  Порядок проверки (API):')
        for i, step in enumerate(steps, 1):
            _out(f'    {i}. {step}')
    if expected:
        _out(f'  Ожидаемый результат: {expected}')
    _out(f'  Фактический результат: [{status}]')
    for line in actual or []:
        _out(f'    • {line}')
    _out('-' * 72)


def report_summary(passed: int, total: int) -> None:
    _out('')
    _out('=' * 72)
    _out(f'  Итого сценариев: {passed}/{total} — автоматическая проверка завершена')
    _out('  Примечание: сценарий 13 (Docker) дополнительно подтверждается вручную в терминале.')
    _out('=' * 72)
    _out('')
