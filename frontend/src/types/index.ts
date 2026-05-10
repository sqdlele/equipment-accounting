export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'engineer' | 'warehouse' | 'readonly';
  phone: string;
  is_superuser?: boolean;
}

export interface Department {
  id: number;
  name: string;
  description: string;
}

export interface Location {
  id: number;
  name: string;
  room_code: string;
  type: string;
  type_display: string;
  department: number | null;
  department_name: string | null;
  description: string;
}

export interface Employee {
  id: number;
  full_name: string;
  position: string;
  department: number | null;
  department_name: string | null;
  email: string;
  phone: string;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  asset_count: number;
}

export interface Manufacturer {
  id: number;
  name: string;
  asset_count: number;
}

export type AssetStatus = 'warehouse' | 'in_use' | 'repair' | 'written_off';

export interface AssetListItem {
  id: number;
  inventory_number: string;
  serial_number: string;
  name: string;
  model: string;
  category: number | null;
  category_name: string | null;
  manufacturer: number | null;
  manufacturer_name: string | null;
  status: AssetStatus;
  status_display: string;
  location: number | null;
  location_name: string | null;
  manufacture_year: number | null;
  responsible_employee: number | null;
  responsible_employee_name: string | null;
  purchase_date: string | null;
  price: string | null;
  photo: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetHistory {
  id: number;
  field_changed: string;
  old_value: string;
  new_value: string;
  changed_by: number | null;
  changed_by_name: string | null;
  changed_at: string;
  note: string;
}

export interface AssetDetail extends AssetListItem {
  description: string;
  history: AssetHistory[];
}

export interface AssetMovement {
  id: number;
  asset: number;
  asset_inventory_number: string;
  asset_name: string;
  from_location: number | null;
  from_location_name: string | null;
  to_location: number | null;
  to_location_name: string | null;
  from_responsible_employee: number | null;
  from_responsible_name: string | null;
  to_responsible_employee: number | null;
  to_responsible_name: string | null;
  document_number: string;
  note: string;
  performed_by: number | null;
  performed_by_name: string | null;
  created_at: string;
}

export type RepairStatus = 'open' | 'in_progress' | 'waiting_parts' | 'resolved' | 'closed';
export type RepairPriority = 'low' | 'medium' | 'high' | 'critical';

export interface RepairWork {
  id: number;
  ticket: number;
  performed_by: number | null;
  performed_by_name: string | null;
  work_description: string;
  parts_used: string;
  performed_at: string;
}

export interface RepairTicket {
  id: number;
  asset: number;
  asset_name: string;
  asset_inventory: string;
  reported_by: number | null;
  reported_by_name: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  status: RepairStatus;
  status_display: string;
  priority: RepairPriority;
  priority_display: string;
  description: string;
  defect_type: string;
  downtime_hours: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  works: RepairWork[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DashboardStats {
  total_assets: number;
  status_distribution: { status: string; label: string; count: number }[];
  category_distribution: { category__name: string; count: number }[];
  assets_by_location: { location__name: string; count: number }[];
  warehouse_on_stock: number;
  active_repairs: number;
  recent_repairs: {
    id: number;
    asset_name: string;
    asset_inventory: string;
    status: string;
    status_display: string;
    priority: string;
    priority_display: string;
    created_at: string;
  }[];
}

export interface WarehouseCategoryGroup {
  category_id: number | null;
  category_name: string;
  models: { model: string; count: number }[];
}

export interface WarehouseSummary {
  total_on_warehouse: number;
  categories: WarehouseCategoryGroup[];
}
