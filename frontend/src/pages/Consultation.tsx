import { useState, useEffect } from 'react';
import { Stethoscope, Loader2, X, Plus, Trash2, Printer, Save } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function Consultation() {
  const [todayAppts, setTodayAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [vitals, setVitals] = useState({ bp: '', temperature: '', pulse: '', weight: '', spo2: '' });
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomInput, setSymptomInput] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api.get('/appointments/today').then(r => {
      const appts = (r.data.appointments || []).filter((a: any) => a.status === 'scheduled' || a.status === 'in_progress');
      setTodayAppts(appts);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const selectAppt = (appt: any) => {
    setSelectedAppt(appt);
    setVitals({ bp: '', temperature: '', pulse: '', weight: '', spo2: '' });
    setSymptoms([]);
    setSymptomInput('');
    setDiagnosis('');
    setPrescriptions([]);
    setNotes('');
  };

  const addSymptom = () => {
    if (symptomInput.trim() && !symptoms.includes(symptomInput.trim())) {
      setSymptoms([...symptoms, symptomInput.trim()]);
      setSymptomInput('');
    }
  };

  const removeSymptom = (s: string) => setSymptoms(symptoms.filter(x => x !== s));

  const addPrescription = () => {
    setPrescriptions([...prescriptions, { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const updatePrescription = (index: number, field: string, value: string) => {
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptions(updated);
  };

  const removePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const saveConsultation = async () => {
    if (!selectedAppt) return;
    if (!diagnosis) { toast.error('Please enter a diagnosis'); return; }
    setSaving(true);
    try {
      const res = await api.post('/consultations', {
        appointment_id: selectedAppt.id,
        patient_id: selectedAppt.patient_id,
        doctor_id: selectedAppt.doctor_id,
        symptoms,
        diagnosis,
        vitals,
        prescriptions: prescriptions.filter(p => p.medicine),
        notes,
      });
      toast.success('Consultation saved and appointment marked as completed');
      // Remove from today's list
      setTodayAppts(todayAppts.filter(a => a.id !== selectedAppt.id));
      // Offer print
      if (res.data.consultation?.id) {
        if (confirm('Consultation saved! Print prescription?')) {
          window.open(`/api/consultations/prescription/${res.data.consultation.id}`, '_blank');
        }
      }
      setSelectedAppt(null);
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed to save consultation'); }
    finally { setSaving(false); }
  };

  const printPrescription = async (consultationId: string) => {
    window.open(`/api/consultations/prescription/${consultationId}`, '_blank');
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Stethoscope className="h-6 w-6 text-accent" /> Consultation
      </h2>

      {!selectedAppt ? (
        <div>
          <p className="text-sm text-gray-500 mb-4">Select a today's appointment to start consultation:</p>
          {todayAppts.length > 0 ? (
            <div className="grid gap-3">
              {todayAppts.map(a => (
                <button key={a.id} onClick={() => selectAppt(a)}
                  className="bg-white rounded-xl border p-4 text-left hover:border-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{a.patient_name || 'Unknown Patient'}</p>
                      <p className="text-sm text-gray-500">Dr. {a.doctor_name} | {a.time_slot}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.status === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                      {a.status?.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-12 text-center">
              <Stethoscope className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">No pending appointments for today.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="bg-white rounded-xl border p-4 flex-1 mr-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{selectedAppt.patient_name}</p>
                  <p className="text-sm text-gray-500">Dr. {selectedAppt.doctor_name} | {selectedAppt.time_slot}</p>
                </div>
                <button onClick={() => setSelectedAppt(null)} className="text-sm text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Vitals */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Vitals</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Blood Pressure</label>
                <input placeholder="120/80" value={vitals.bp} onChange={e => setVitals({ ...vitals, bp: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Temperature (F)</label>
                <input placeholder="98.6" value={vitals.temperature} onChange={e => setVitals({ ...vitals, temperature: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pulse (bpm)</label>
                <input placeholder="72" value={vitals.pulse} onChange={e => setVitals({ ...vitals, pulse: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Weight (kg)</label>
                <input placeholder="70" value={vitals.weight} onChange={e => setVitals({ ...vitals, weight: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">SpO2 (%)</label>
                <input placeholder="98" value={vitals.spo2} onChange={e => setVitals({ ...vitals, spo2: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
            </div>
          </div>

          {/* Symptoms */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Symptoms</h3>
            <div className="flex gap-2 mb-2">
              <input value={symptomInput} onChange={e => setSymptomInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSymptom(); } }}
                placeholder="Type symptom and press Enter" className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              <button onClick={addSymptom} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {symptoms.map(s => (
                <span key={s} className="flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded text-sm">
                  {s} <button onClick={() => removeSymptom(s)}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>

          {/* Diagnosis */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Diagnosis *</h3>
            <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} placeholder="Enter diagnosis..."
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
          </div>

          {/* Prescriptions */}
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Prescriptions</h3>
              <button onClick={addPrescription} className="flex items-center gap-1 text-sm text-accent hover:underline"><Plus className="h-4 w-4" /> Add Medicine</button>
            </div>
            {prescriptions.length > 0 ? (
              <div className="space-y-3">
                {prescriptions.map((rx, i) => (
                  <div key={i} className="grid grid-cols-6 gap-2 items-end border p-3 rounded-lg">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Medicine</label>
                      <input value={rx.medicine} onChange={e => updatePrescription(i, 'medicine', e.target.value)}
                        placeholder="Paracetamol 500mg" className="w-full px-2 py-1.5 border rounded text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Dosage</label>
                      <input value={rx.dosage} onChange={e => updatePrescription(i, 'dosage', e.target.value)}
                        placeholder="1 tablet" className="w-full px-2 py-1.5 border rounded text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                      <input value={rx.frequency} onChange={e => updatePrescription(i, 'frequency', e.target.value)}
                        placeholder="Twice daily" className="w-full px-2 py-1.5 border rounded text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Duration</label>
                      <input value={rx.duration} onChange={e => updatePrescription(i, 'duration', e.target.value)}
                        placeholder="5 days" className="w-full px-2 py-1.5 border rounded text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Instructions</label>
                      <input value={rx.instructions} onChange={e => updatePrescription(i, 'instructions', e.target.value)}
                        placeholder="After meals" className="w-full px-2 py-1.5 border rounded text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                    </div>
                    <button onClick={() => removePrescription(i)} className="p-1.5 text-red-400 hover:text-red-600 self-end mb-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No prescriptions added. Click "Add Medicine" to start.</p>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional notes..."
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={saveConsultation} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Consultation
            </button>
            <button onClick={() => setSelectedAppt(null)} className="px-4 py-2.5 border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
