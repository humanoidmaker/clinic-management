import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Loader2, X, ChevronLeft, Phone, Droplets, AlertCircle, Clock, FileText } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other'];

const emptyForm = { name: '', age: '', gender: '', phone: '', blood_group: '', allergies: '', emergency_contact: { name: '', phone: '', relation: '' }, medical_history: '', address: '' };

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchPatients = useCallback(async (q = '') => {
    try {
      const { data } = await api.get(`/patients?q=${q}`);
      setPatients(data.patients || []);
    } catch { toast.error('Failed to load patients'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  useEffect(() => {
    const t = setTimeout(() => fetchPatients(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchPatients]);

  const openAdd = () => { setForm({ ...emptyForm }); setEditId(null); setShowModal(true); };
  const openEdit = (p: any) => {
    setForm({
      name: p.name || '', age: p.age || '', gender: p.gender || '', phone: p.phone || '',
      blood_group: p.blood_group || '', allergies: (p.allergies || []).join(', '),
      emergency_contact: p.emergency_contact || { name: '', phone: '', relation: '' },
      medical_history: p.medical_history || '', address: p.address || '',
    });
    setEditId(p.id); setShowModal(true);
  };

  const save = async () => {
    if (!form.name || !form.phone) { toast.error('Name and phone are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, age: Number(form.age) || 0, allergies: form.allergies ? form.allergies.split(',').map((s: string) => s.trim()).filter(Boolean) : [] };
      if (editId) {
        await api.put(`/patients/${editId}`, payload);
        toast.success('Patient updated');
      } else {
        await api.post('/patients', payload);
        toast.success('Patient added');
      }
      setShowModal(false); fetchPatients(search);
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const deletePatient = async (id: string) => {
    if (!confirm('Delete this patient?')) return;
    try { await api.delete(`/patients/${id}`); toast.success('Patient deleted'); fetchPatients(search); setSelectedPatient(null); }
    catch { toast.error('Failed to delete'); }
  };

  const viewPatient = async (id: string) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/patients/${id}`);
      setSelectedPatient(data.patient);
    } catch { toast.error('Failed to load patient details'); }
    finally { setDetailLoading(false); }
  };

  if (selectedPatient) {
    const p = selectedPatient;
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedPatient(null)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
          <ChevronLeft className="h-4 w-4" /> Back to Patients
        </button>
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{p.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>{p.age} yrs, {p.gender}</span>
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {p.phone}</span>
                {p.blood_group && <span className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-red-500" /> {p.blood_group}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(p)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Edit</button>
              <button onClick={() => deletePatient(p.id)} className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Address:</span> <span className="text-gray-900">{p.address || 'N/A'}</span></div>
            <div><span className="text-gray-500">Medical History:</span> <span className="text-gray-900">{p.medical_history || 'N/A'}</span></div>
            {p.allergies?.length > 0 && (
              <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-500" /><span className="text-gray-500">Allergies:</span>
                <div className="flex gap-1">{p.allergies.map((a: string) => <span key={a} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">{a}</span>)}</div>
              </div>
            )}
            {p.emergency_contact?.name && (
              <div><span className="text-gray-500">Emergency:</span> <span className="text-gray-900">{p.emergency_contact.name} ({p.emergency_contact.relation}) - {p.emergency_contact.phone}</span></div>
            )}
          </div>
        </div>

        {/* Consultation History */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-accent" /> Consultation History</h3>
          {(p.consultations || []).length > 0 ? (
            <div className="space-y-4">
              {p.consultations.map((c: any) => (
                <div key={c.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-primary">{formatDate(c.created_at)}</span>
                    <span className="text-xs text-gray-500">Dr. {c.doctor_name}</span>
                  </div>
                  <p className="text-sm"><span className="text-gray-500">Diagnosis:</span> <span className="font-medium">{c.diagnosis}</span></p>
                  {c.symptoms?.length > 0 && <p className="text-sm mt-1"><span className="text-gray-500">Symptoms:</span> {c.symptoms.join(', ')}</p>}
                  {c.vitals && (
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      {c.vitals.bp && <span>BP: {c.vitals.bp}</span>}
                      {c.vitals.temperature && <span>Temp: {c.vitals.temperature}F</span>}
                      {c.vitals.pulse && <span>Pulse: {c.vitals.pulse}</span>}
                      {c.vitals.spo2 && <span>SpO2: {c.vitals.spo2}%</span>}
                    </div>
                  )}
                  {c.prescriptions?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Prescriptions:</p>
                      <div className="flex flex-wrap gap-1">
                        {c.prescriptions.map((rx: any, i: number) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{rx.medicine}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No consultations found.</p>}
        </div>

        {/* Bills */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-accent" /> Bills</h3>
          {(p.bills || []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Bill No</th><th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Amount</th><th className="pb-2 font-medium">Payment</th>
                </tr></thead>
                <tbody>
                  {p.bills.map((b: any) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{b.bill_number}</td>
                      <td className="py-2">{formatDate(b.created_at)}</td>
                      <td className="py-2 font-medium">{formatCurrency(b.total)}</td>
                      <td className="py-2 capitalize">{b.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-gray-400">No bills found.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="h-6 w-6 text-accent" /> Patients</h2>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90"><Plus className="h-4 w-4" /> Add Patient</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none" />
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div> : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Age</th>
                <th className="px-4 py-3 font-medium">Gender</th>
                <th className="px-4 py-3 font-medium">Blood Group</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => viewPatient(p.id)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3">{p.age}</td>
                    <td className="px-4 py-3">{p.gender}</td>
                    <td className="px-4 py-3">{p.blood_group && <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-medium">{p.blood_group}</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.phone}</td>
                    <td className="px-4 py-3">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="text-xs text-accent hover:underline mr-3">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); deletePatient(p.id); }} className="text-xs text-red-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No patients found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editId ? 'Edit Patient' : 'Add Patient'}</h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30">
                    <option value="">Select</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                  <select value={form.blood_group} onChange={e => setForm({ ...form, blood_group: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30">
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergies (comma-separated)</label>
                <input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Penicillin, Dust" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medical History</label>
                <textarea value={form.medical_history} onChange={e => setForm({ ...form, medical_history: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
                <div className="grid grid-cols-3 gap-2">
                  <input placeholder="Name" value={form.emergency_contact.name} onChange={e => setForm({ ...form, emergency_contact: { ...form.emergency_contact, name: e.target.value } })} className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                  <input placeholder="Phone" value={form.emergency_contact.phone} onChange={e => setForm({ ...form, emergency_contact: { ...form.emergency_contact, phone: e.target.value } })} className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                  <input placeholder="Relation" value={form.emergency_contact.relation} onChange={e => setForm({ ...form, emergency_contact: { ...form.emergency_contact, relation: e.target.value } })} className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {editId ? 'Update' : 'Add Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
