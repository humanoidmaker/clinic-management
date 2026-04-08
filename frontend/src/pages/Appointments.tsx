import { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Loader2, X, Clock, Search } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
  no_show: 'bg-gray-100 text-gray-600',
};

const TIME_SLOTS = Array.from({ length: 36 }, (_, i) => {
  const h = Math.floor(i / 4) + 9;
  const m = (i % 4) * 15;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}).filter(t => t < '18:01');

export default function Appointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', date: '', time_slot: '', notes: '' });

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/appointments?date=${selectedDate}`);
      setAppointments(data.appointments || []);
    } catch { toast.error('Failed to load appointments'); }
    finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);
  useEffect(() => {
    api.get('/doctors').then(r => setDoctors(r.data.doctors || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      const t = setTimeout(() => {
        api.get(`/patients?q=${patientSearch}`).then(r => setPatients(r.data.patients || [])).catch(() => {});
      }, 300);
      return () => clearTimeout(t);
    } else { setPatients([]); }
  }, [patientSearch]);

  const openBook = () => {
    setForm({ patient_id: '', doctor_id: '', date: selectedDate, time_slot: '', notes: '' });
    setPatientSearch(''); setShowModal(true);
  };

  const book = async () => {
    if (!form.patient_id || !form.doctor_id || !form.date || !form.time_slot) {
      toast.error('Please fill all required fields'); return;
    }
    setSaving(true);
    try {
      await api.post('/appointments', form);
      toast.success('Appointment booked'); setShowModal(false); fetchAppointments();
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed to book'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/appointments/${id}/status`, { status });
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
      fetchAppointments();
    } catch { toast.error('Failed to update status'); }
  };

  const deleteAppt = async (id: string) => {
    if (!confirm('Delete this appointment?')) return;
    try { await api.delete(`/appointments/${id}`); toast.success('Deleted'); fetchAppointments(); }
    catch { toast.error('Failed to delete'); }
  };

  // Group by doctor
  const grouped: Record<string, any[]> = {};
  appointments.forEach(a => {
    const key = a.doctor_name || 'Unassigned';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Calendar className="h-6 w-6 text-accent" /> Appointments</h2>
        <div className="flex items-center gap-3">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
          <button onClick={openBook} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> Book Appointment
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-500">
        Showing appointments for <span className="font-medium text-gray-900">{formatDate(selectedDate)}</span>
        <span className="ml-2">({appointments.length} total)</span>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div> : (
        Object.keys(grouped).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(grouped).map(([doctorName, appts]) => (
              <div key={doctorName} className="bg-white rounded-xl border">
                <div className="px-4 py-3 border-b bg-gray-50 rounded-t-xl">
                  <h3 className="font-semibold text-primary">Dr. {doctorName}
                    {appts[0]?.doctor_specialization && <span className="text-xs text-gray-500 font-normal ml-2">({appts[0].doctor_specialization})</span>}
                  </h3>
                </div>
                <div className="divide-y">
                  {appts.sort((a, b) => a.time_slot.localeCompare(b.time_slot)).map(a => (
                    <div key={a.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-sm font-mono text-gray-600 min-w-[60px]">
                          <Clock className="h-3.5 w-3.5" /> {a.time_slot}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{a.patient_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{a.patient_phone || ''} {a.notes ? `- ${a.notes}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[a.status] || STATUS_BADGE.scheduled}`}>
                          {a.status?.replace('_', ' ')}
                        </span>
                        <div className="flex gap-1">
                          {a.status === 'scheduled' && (
                            <button onClick={() => updateStatus(a.id, 'in_progress')} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100">Start</button>
                          )}
                          {a.status === 'in_progress' && (
                            <button onClick={() => updateStatus(a.id, 'completed')} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100">Complete</button>
                          )}
                          {(a.status === 'scheduled' || a.status === 'in_progress') && (
                            <>
                              <button onClick={() => updateStatus(a.id, 'cancelled')} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Cancel</button>
                              <button onClick={() => updateStatus(a.id, 'no_show')} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">No Show</button>
                            </>
                          )}
                          <button onClick={() => deleteAppt(a.id)} className="text-xs px-2 py-1 text-red-400 hover:text-red-600">Del</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No appointments for this date.</p>
            <button onClick={openBook} className="mt-3 text-sm text-accent hover:underline">Book an appointment</button>
          </div>
        )
      )}

      {/* Book Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Book Appointment</h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              {/* Patient search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Patient *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} placeholder="Type name or phone..."
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                {patients.length > 0 && (
                  <div className="border rounded-lg mt-1 max-h-32 overflow-y-auto">
                    {patients.map(p => (
                      <button key={p.id} onClick={() => { setForm({ ...form, patient_id: p.id }); setPatientSearch(p.name); setPatients([]); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${form.patient_id === p.id ? 'bg-accent/10' : ''}`}>
                        {p.name} <span className="text-gray-400">({p.phone})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor *</label>
                <select value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30">
                  <option value="">Select Doctor</option>
                  {doctors.filter(d => d.is_active !== false).map(d => (
                    <option key={d.id} value={d.id}>Dr. {d.name} - {d.specialization}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot *</label>
                <select value={form.time_slot} onChange={e => setForm({ ...form, time_slot: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30">
                  <option value="">Select Time</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={book} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
