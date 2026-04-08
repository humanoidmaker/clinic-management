import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart3, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const COLORS = ['#1e40af', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/appointments').then(r => r.data.appointments || []),
      api.get('/bills').then(r => r.data.bills || []),
      api.get('/doctors').then(r => r.data.doctors || []),
    ]).then(([appts, b, docs]) => {
      setAppointments(appts);
      setBills(b);
      setDoctors(docs);
      // Extract consultations from appointment-related data
      const diags: any[] = [];
      appts.filter((a: any) => a.status === 'completed').forEach(() => diags.push(null));
    }).catch(() => {}).finally(() => setLoading(false));

    // Also fetch some consultations for diagnoses
    api.get('/appointments?status=completed').then(async r => {
      // We'll gather diagnosis data from consultations
      try {
        const patientsRes = await api.get('/patients');
        const patients = patientsRes.data.patients || [];
        const allConsultations: any[] = [];
        for (const p of patients.slice(0, 20)) {
          try {
            const cRes = await api.get(`/consultations/patient/${p.id}`);
            allConsultations.push(...(cRes.data.consultations || []));
          } catch {}
        }
        setConsultations(allConsultations);
      } catch {}
    }).catch(() => {});
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  // Patient visits per day (last 7 days)
  const visitsByDay: Record<string, number> = {};
  appointments.forEach(a => {
    if (a.date) {
      visitsByDay[a.date] = (visitsByDay[a.date] || 0) + 1;
    }
  });
  const visitData = Object.entries(visitsByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, count]) => ({ date: date.slice(5), visits: count }));

  // Revenue per day
  const revByDay: Record<string, number> = {};
  bills.forEach(b => {
    const day = (b.created_at || '').slice(0, 10);
    if (day) revByDay[day] = (revByDay[day] || 0) + (b.total || 0);
  });
  const revData = Object.entries(revByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, amount]) => ({ date: date.slice(5), revenue: amount }));

  // Doctor-wise appointment count
  const doctorAppts: Record<string, number> = {};
  appointments.forEach(a => {
    const name = a.doctor_name || 'Unknown';
    doctorAppts[name] = (doctorAppts[name] || 0) + 1;
  });
  const doctorData = Object.entries(doctorAppts).map(([name, count]) => ({ name: `Dr. ${name}`, count }));

  // Top diagnoses
  const diagCount: Record<string, number> = {};
  consultations.forEach(c => {
    if (c.diagnosis) {
      diagCount[c.diagnosis] = (diagCount[c.diagnosis] || 0) + 1;
    }
  });
  const topDiagnoses = Object.entries(diagCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const totalRevenue = bills.reduce((s, b) => s + (b.total || 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BarChart3 className="h-6 w-6 text-accent" /> Reports</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Visits Line Chart */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Patient Visits</h3>
          {visitData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={visitData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="visits" stroke="#1e40af" strokeWidth={2} dot={{ fill: '#1e40af' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">No visit data available.</p>}
        </div>

        {/* Revenue Bar Chart */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-2">Revenue</h3>
          <p className="text-sm text-gray-500 mb-4">Total: {formatCurrency(totalRevenue)}</p>
          {revData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Bar dataKey="revenue" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">No revenue data available.</p>}
        </div>

        {/* Doctor-wise Appointments */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Doctor-wise Appointments</h3>
          {doctorData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={doctorData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" paddingAngle={3}>
                    {doctorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {doctorData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600">{d.name}</span>
                    <span className="font-medium">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">No data available.</p>}
        </div>

        {/* Top Diagnoses */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top Diagnoses</h3>
          {topDiagnoses.length > 0 ? (
            <div className="space-y-3">
              {topDiagnoses.map((d, i) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400 w-5">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{d.name}</span>
                      <span className="text-sm font-medium">{d.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(d.count / topDiagnoses[0].count) * 100}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">No diagnosis data available.</p>}
        </div>
      </div>
    </div>
  );
}
