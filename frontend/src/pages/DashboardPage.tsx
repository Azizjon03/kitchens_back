import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import type { DashboardStats } from '../types';
import { Building2, Users, ClipboardList, DollarSign, TrendingUp } from 'lucide-react';
import Layout from '../components/Layout';

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/super/dashboard');
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Jami kompaniyalar"
          value={stats?.total_companies ?? 0}
          icon={<Building2 size={24} className="text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          title="Jami foydalanuvchilar"
          value={stats?.total_users ?? 0}
          icon={<Users size={24} className="text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          title="Jami buyurtmalar"
          value={stats?.total_orders ?? 0}
          icon={<ClipboardList size={24} className="text-amber-600" />}
          color="bg-amber-50"
        />
        <StatCard
          title="Jami daromad"
          value={`${(stats?.total_revenue ?? 0).toLocaleString()} so'm`}
          icon={<DollarSign size={24} className="text-purple-600" />}
          color="bg-purple-50"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">Tizim holati</h2>
        </div>
        <p className="text-gray-500 text-sm">
          Tizim barqaror ishlayapti. Barcha xizmatlar faol.
        </p>
      </div>
    </div>
  );
}

function CompanyDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 size={32} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Kompaniya Dashboard</h2>
        <p className="text-gray-500">
          Bu yerda kompaniya statistikasi ko'rsatiladi.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Xush kelibsiz, {user?.full_name}!
        </p>
      </div>

      {isSuperAdmin ? <SuperAdminDashboard /> : <CompanyDashboard />}
    </Layout>
  );
}
