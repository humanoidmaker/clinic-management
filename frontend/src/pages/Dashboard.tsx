import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Users, Calendar, Stethoscope, IndianRupee, Clock, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#10b981',
  cancelled: '#ef4444',
  no_show: '#6b7280',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data.stats)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  if (!stats) return <div className="text-center text-gray-500 py-12">Failed to load dashboard data.</div>;

  const statusData = stats.appointment_status
    ? Object.entries(stats.appointment_status).filter(([, v]) => (v as number) > 0).map(([name, value]) => ({ name, value }))
    : [];

  const cards = [
    { label: "Today's Appointments", value: stats.today_appointments || 0, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Patients', value: stats.total_patients || 0, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: "Today's Revenue", value: formatCurrency(stats.today_revenue || 0), icon: IndianRupee, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Consultations', value: stats.total_consultations || 0, icon: Stethoscope, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const quickActions = [
    { label: 'New Patient', path: '/patients', icon: Users },
    { label: 'Book Appointment', path: '/appointments', icon: Calendar },
    { label: 'Start Consultation', path: '/consultation', icon: Stethoscope },
    { label: 'Create Bill', path: '/billing', icon: IndianRupee },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${c.bg}`}><c.icon className={`h-5 w-5 ${c.color}`} /></div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointment Status Chart */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Appointment Status</h3>
          {statusData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                    {statusData.map((entry: any) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => val} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map((entry: any) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS[entry.name] || '#6b7280' }} />
                    <span className="capitalize text-gray-600">{entry.name.replace('_', ' ')}</span>
                    <span className="font-medium text-gray-900">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No appointments yet.</p>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl border p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Today's Appointments</h3>
            <button onClick={() => navigate('/appointments')} className="text-sm text-accent hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {(stats.upcoming_appointments || []).length > 0 ? (
            <div className="space-y-2">
              {stats.upcoming_appointments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-mono">{a.time_slot}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.patient_name || 'Unknown Patient'}</p>
                      <p className="text-xs text-gray-500">Dr. {a.doctor_name || 'Unknown'}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    a.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                    a.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                    a.status === 'in_progress' ? 'bg-amber-50 text-amber-700' :
                    a.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                    'bg-gray-50 text-gray-700'
                  }`}>
                    {a.status?.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No appointments today.</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(qa => (
            <button key={qa.label} onClick={() => navigate(qa.path)}
              className="flex items-center gap-3 p-4 rounded-lg border hover:border-accent/50 hover:bg-accent/5 transition-colors text-left">
              <div className="p-2 bg-primary/10 rounded-lg"><qa.icon className="h-4 w-4 text-primary" /></div>
              <span className="text-sm font-medium text-gray-700">{qa.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Revenue */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 mb-2">Revenue Overview</h3>
        <div className="flex gap-8">
          <div>
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(stats.today_revenue || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.total_revenue || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Doctors</p>
            <p className="text-xl font-bold text-gray-900">{stats.total_doctors || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
