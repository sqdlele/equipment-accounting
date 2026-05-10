import type { AssetStatus, RepairStatus, RepairPriority } from '../types';

const assetStatusConfig: Record<AssetStatus, { label: string; className: string }> = {
  warehouse: { label: 'На складе', className: 'bg-green-100 text-green-800' },
  in_use: { label: 'В эксплуатации', className: 'bg-blue-100 text-blue-800' },
  repair: { label: 'В ремонте', className: 'bg-yellow-100 text-yellow-800' },
  written_off: { label: 'Списан', className: 'bg-red-100 text-red-800' },
};

const repairStatusConfig: Record<RepairStatus, { label: string; className: string }> = {
  open: { label: 'Открыт', className: 'bg-red-100 text-red-800' },
  in_progress: { label: 'В работе', className: 'bg-yellow-100 text-yellow-800' },
  waiting_parts: { label: 'Ожид. запчастей', className: 'bg-purple-100 text-purple-800' },
  resolved: { label: 'Решён', className: 'bg-green-100 text-green-800' },
  closed: { label: 'Закрыт', className: 'bg-gray-100 text-gray-700' },
};

const repairPriorityConfig: Record<RepairPriority, { label: string; className: string }> = {
  low: { label: 'Низкий', className: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Средний', className: 'bg-blue-100 text-blue-800' },
  high: { label: 'Высокий', className: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Критический', className: 'bg-red-100 text-red-800' },
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const cfg = assetStatusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}

export function RepairStatusBadge({ status }: { status: RepairStatus }) {
  const cfg = repairStatusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}

export function RepairPriorityBadge({ priority }: { priority: RepairPriority }) {
  const cfg = repairPriorityConfig[priority] ?? { label: priority, className: 'bg-gray-100 text-gray-700' };
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}

