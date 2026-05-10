import { useState, useRef } from 'react';
import { assetsApi, repairsApi } from '../api/endpoints';
import PageHeader from '../components/PageHeader';

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ExportCardProps {
  title: string;
  description: string;
  icon: string;
  buttons: { label: string; onClick: () => Promise<void>; className: string }[];
}

function ExportCard({ title, description, icon, buttons }: ExportCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleClick = async (label: string, fn: () => Promise<void>) => {
    setLoading(label);
    try { await fn(); } finally { setLoading(null); }
  };

  return (
    <div className="card flex items-start gap-4">
      <div className="text-4xl">{icon}</div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-3">{description}</p>
        <div className="flex gap-2 flex-wrap">
          {buttons.map((btn) => (
            <button
              key={btn.label}
              className={`${btn.className} text-sm`}
              disabled={loading !== null}
              onClick={() => handleClick(btn.label, btn.onClick)}
            >
              {loading === btn.label ? 'Формирование...' : btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const exportAssetsExcel = async () => {
    const { data } = await assetsApi.exportExcel();
    downloadBlob(data as Blob, 'инвентаризация.xlsx');
  };

  const downloadImportTemplate = async () => {
    const { data } = await assetsApi.importTemplate();
    downloadBlob(data as Blob, 'шаблон_импорта_техники.xlsx');
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportLoading(true);
    setImportMsg(null);
    try {
      const { data } = await assetsApi.importExcel(file);
      const errLines = data.errors?.length
        ? `\nПредупреждения:\n${data.errors.map((x) => (x.row ? `Стр. ${x.row}: ` : '') + x.message).join('\n')}`
        : '';
      setImportMsg(`Создано: ${data.created}, обновлено: ${data.updated}.${errLines}`);
    } catch {
      setImportMsg('Ошибка импорта: проверьте формат файла (.xlsx) и заголовки.');
    } finally {
      setImportLoading(false);
    }
  };

  const exportAssetsPdf = async () => {
    const { data } = await assetsApi.exportPdf();
    downloadBlob(data as Blob, 'инвентаризация.pdf');
  };

  const exportRepairsExcel = async () => {
    const { data } = await repairsApi.exportExcel();
    downloadBlob(data as Blob, 'журнал_ремонтов.xlsx');
  };

  return (
    <div>
      <PageHeader
        title="Отчёты и экспорт"
        subtitle="Формирование инвентаризационных ведомостей и журналов"
      />

      <div className="p-6 space-y-4 max-w-3xl">
        <ExportCard
          icon="📋"
          title="Инвентаризационная ведомость"
          description="Полный список техники с характеристиками, статусами, локациями и ответственными лицами."
          buttons={[
            {
              label: '⬇ Скачать Excel (.xlsx)',
              onClick: exportAssetsExcel,
              className: 'btn-primary',
            },
            {
              label: '⬇ Скачать PDF',
              onClick: exportAssetsPdf,
              className: 'btn-secondary',
            },
          ]}
        />

        <div className="card flex items-start gap-4">
          <div className="text-4xl">📥</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Импорт техники из Excel</h3>
            <p className="text-sm text-gray-500 mb-3">
              Массовое создание и обновление по инвентарному номеру. Категории и производители подставляются по
              названию (при необходимости создаются). Локация и ответственный должны совпадать со справочниками.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <button type="button" className="btn-secondary text-sm" onClick={downloadImportTemplate}>
                Скачать шаблон
              </button>
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={importLoading}
                onClick={() => fileRef.current?.click()}
              >
                {importLoading ? 'Загрузка…' : 'Загрузить .xlsx'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={onImportFile}
              />
            </div>
            {importMsg && (
              <pre className="mt-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">
                {importMsg}
              </pre>
            )}
          </div>
        </div>

        <ExportCard
          icon="🔧"
          title="Журнал ремонтов"
          description="Все заявки на ремонт: техника, дефект, исполнитель, время простоя, статус."
          buttons={[
            {
              label: '⬇ Скачать Excel (.xlsx)',
              onClick: exportRepairsExcel,
              className: 'btn-primary',
            },
          ]}
        />

        <div className="card bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Как используются отчёты</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Excel-ведомость открывается в Microsoft Excel или LibreOffice Calc</li>
            <li>PDF-ведомость подходит для печати и официального документооборота</li>
            <li>Данные актуальны на момент формирования отчёта</li>
            <li>Все отчёты содержат дату формирования и реквизит АО «ИРЗ»</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
