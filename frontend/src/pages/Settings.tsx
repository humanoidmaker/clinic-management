import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Loader2, Building2, Clock, Phone, Mail, MapPin, Globe } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const TABS = ['Clinic Info', 'Schedule', 'Fees', 'Notifications'];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('Clinic Info');
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/settings').then(r => r.data.settings || {}),
      api.get('/doctors').then(r => r.data.doctors || []).catch(() => []),
    ]).then(([s, d]) => {
      setSettings(typeof s === 'object' && !Array.isArray(s) ? s : {
        clinic_name: '', clinic_phone: '', clinic_email: '', clinic_address: '',
        clinic_city: '', clinic_state: '', clinic_gstin: '', clinic_website: '',
        opening_time: '09:00', closing_time: '18:00', slot_duration: '15',
        working_days: 'Mon,Tue,Wed,Thu,Fri,Sat',
        consultation_fee: '500', followup_fee: '300',
        sms_enabled: 'false', email_reminders: 'false', reminder_hours: '24',
      });
      setDoctors(d);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      toast.success('Settings saved successfully');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-accent" /> Settings
        </h2>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{tab}</button>
        ))}
      </div>

      {/* Clinic Info Tab */}
      {activeTab === 'Clinic Info' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Clinic Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name</label>
              <input value={settings.clinic_name || ''} onChange={e => update('clinic_name', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
              <input value={settings.clinic_gstin || ''} onChange={e => update('clinic_gstin', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</span>
              </label>
              <input value={settings.clinic_phone || ''} onChange={e => update('clinic_phone', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
              </label>
              <input type="email" value={settings.clinic_email || ''} onChange={e => update('clinic_email', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Website</span>
              </label>
              <input value={settings.clinic_website || ''} onChange={e => update('clinic_website', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Address</span>
            </label>
            <input value={settings.clinic_address || ''} onChange={e => update('clinic_address', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input value={settings.clinic_city || ''} onChange={e => update('clinic_city', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input value={settings.clinic_state || ''} onChange={e => update('clinic_state', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'Schedule' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Working Hours & Schedule</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time</label>
              <input type="time" value={settings.opening_time || '09:00'} onChange={e => update('opening_time', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time</label>
              <input type="time" value={settings.closing_time || '18:00'} onChange={e => update('closing_time', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slot Duration (min)</label>
              <select value={settings.slot_duration || '15'} onChange={e => update('slot_duration', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30">
                {['10', '15', '20', '30', '45', '60'].map(v => <option key={v} value={v}>{v} minutes</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
            <div className="flex flex-wrap gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                const days = (settings.working_days || '').split(',');
                const active = days.includes(day);
                return (
                  <button key={day} onClick={() => {
                    const newDays = active ? days.filter(d => d !== day) : [...days, day];
                    update('working_days', newDays.filter(Boolean).join(','));
                  }}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                      active ? 'bg-primary text-white border-primary' : 'hover:bg-gray-50'
                    }`}>{day}</button>
                );
              })}
            </div>
          </div>
          {/* Doctors Summary */}
          {doctors.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Registered Doctors ({doctors.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {doctors.map((d: any) => (
                  <div key={d.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm">
                    <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">
                      {(d.name || 'D')[0]}
                    </div>
                    <div>
                      <p className="font-medium">Dr. {d.name}</p>
                      <p className="text-xs text-gray-500">{d.specialization || 'General'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fees Tab */}
      {activeTab === 'Fees' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Default Fee Structure</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee (Rs.)</label>
              <input type="number" value={settings.consultation_fee || ''} onChange={e => update('consultation_fee', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Fee (Rs.)</label>
              <input type="number" value={settings.followup_fee || ''} onChange={e => update('followup_fee', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
          <p className="text-xs text-gray-400">These are default fees. Individual bills can have custom amounts.</p>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'Notifications' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Notification Preferences</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">SMS Reminders</p>
                <p className="text-xs text-gray-500">Send SMS reminders to patients before appointments</p>
              </div>
              <button onClick={() => update('sms_enabled', settings.sms_enabled === 'true' ? 'false' : 'true')}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.sms_enabled === 'true' ? 'bg-accent' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.sms_enabled === 'true' ? 'translate-x-5' : ''}`} />
              </button>
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">Email Reminders</p>
                <p className="text-xs text-gray-500">Send email reminders for upcoming appointments</p>
              </div>
              <button onClick={() => update('email_reminders', settings.email_reminders === 'true' ? 'false' : 'true')}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.email_reminders === 'true' ? 'bg-accent' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.email_reminders === 'true' ? 'translate-x-5' : ''}`} />
              </button>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Lead Time (hours)</label>
              <select value={settings.reminder_hours || '24'} onChange={e => update('reminder_hours', e.target.value)}
                className="w-full max-w-xs px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30">
                {['1', '2', '4', '12', '24', '48'].map(h => <option key={h} value={h}>{h} hours before</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
