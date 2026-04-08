export interface User {
  id: number;
  phone: string;
  email?: string;
  full_name: string;
  role: 'super_admin' | 'company_admin' | 'branch_admin' | 'waiter' | 'chef';
  is_active: boolean;
  company_id?: number;
  branch_id?: number;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  phone: string;
  is_active: boolean;
  logo_url?: string;
  created_at: string;
  owner_id?: number;
}

export interface Plan {
  id: number;
  name: string;
  price: number;
  max_branches: number;
  max_tables: number;
  max_menu_items: number;
  features: string[];
  is_active: boolean;
}

export interface Subscription {
  id: number;
  company_id: number;
  plan_id: number;
  plan?: Plan;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface Branch {
  id: number;
  company_id: number;
  name: string;
  address: string;
  phone?: string;
  is_active: boolean;
}

export interface Category {
  id: number;
  company_id: number;
  parent_id?: number | null;
  name_uz: string;
  name_ru?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
  menu_items_count?: number;
}

export interface MenuItem {
  id: number;
  company_id: number;
  category_id: number;
  category?: Category;
  name_uz: string;
  name_ru?: string;
  description_uz?: string;
  description_ru?: string;
  sell_type: 'portion' | 'weight';
  price: number;
  min_weight?: number;
  weight_step?: number;
  image?: string;
  cooking_time?: number;
  is_available: boolean;
  is_popular: boolean;
  sort_order: number;
  allergens?: string[];
  modifiers?: Modifier[];
  addons?: Addon[];
}

export interface Modifier {
  id: number;
  company_id: number;
  name_uz: string;
  name_ru?: string;
  is_active: boolean;
}

export interface Addon {
  id: number;
  company_id: number;
  name_uz: string;
  name_ru?: string;
  price: number;
  is_active: boolean;
}

export interface Table {
  id: number;
  company_id: number;
  branch_id: number;
  number: number;
  seats: number;
  zone?: string;
  status: 'free' | 'occupied' | 'reserved' | 'cleaning' | 'merged';
  assigned_waiter_id?: number;
  assigned_waiter?: User;
  merged_with_table_id?: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  menu_item?: MenuItem;
  quantity: number;
  weight_kg?: number;
  unit_price: number;
  total_price: number;
  note?: string;
}

export interface Order {
  id: number;
  company_id: number;
  branch_id: number;
  table_id?: number;
  user_id?: number;
  table?: Table;
  user?: User;
  type: 'dine_in' | 'takeaway' | 'delivery';
  status: 'preparing' | 'ready' | 'served' | 'paid' | 'closed' | 'cancelled';
  subtotal: number;
  service_charge_pct: number;
  service_charge_amount: number;
  total: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  discount_amount?: number;
  note?: string;
  order_items?: OrderItem[];
  payments?: Payment[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  company_id: number;
  order_id: number;
  cash_shift_id?: number;
  method: 'cash' | 'card' | 'click' | 'payme';
  amount: number;
  change_amount: number;
  status: string;
  paid_at: string;
  order?: Order;
}

export interface CashShift {
  id: number;
  company_id: number;
  branch_id: number;
  user_id: number;
  user?: User;
  branch?: Branch;
  opening_amount: number;
  closing_amount?: number;
  expected_amount?: number;
  difference?: number;
  difference_reason?: string;
  opened_at: string;
  closed_at?: string;
  status: 'open' | 'closed';
}

export interface DashboardStats {
  total_companies: number;
  total_users: number;
  total_orders: number;
  total_revenue: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}
