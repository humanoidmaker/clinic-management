import { useState, useEffect, useCallback } from 'react';
import { Receipt, Plus, Loader2, X, Search, Trash2, Printer, IndianRupee } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function Billing() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [items, setItems] = useState<{ description: string; amount: string }[]>([{ description: '', amount: '' }]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [dateFilter, setDateFilter] = useState('');
  const [receiptBill, setReceiptBill] = useState<any>(null);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bills');
      let b = data.bills || [];
      if (dateFilter) {
        b = b.filter((bill: any) => bill.created_at?.startsWith(dateFilter));
      }
      setBills(b);
    } catch { toast.error('Failed to load bills'); }
    finally { setLoading(false); }
  }, [dateFilter]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      const t = setTimeout(() => {
        api.get(`/patients?q=${patientSearch}`).then(r => setPatients(r.data.patients || [])).catch(() => {});
      }, 300);
      return () => clearTimeout(t);
    } else { setPatients([]); }
  }, [patientSearch]);

  const openCreate = () => {
    setSelectedPatient(null); setPatientSearch('');
    setItems([{ description: 'Consultation Fee', amount: '' }]);
    setPaymentMethod('cash'); setShowCreate(true);
  };

  const addItem = () => setItems([...items, { description: '', amount: '' }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: string) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: val };
    setItems(updated);
  };

  const total = items.reduce((s, item) => s + (parseFloat(item.amount) || 0), 0);

  const createBill = async () => {
    if (!selectedPatient) { toast.error('Please select a patient'); return; }
    const validItems = items.filter(i => i.description && i.amount);
    if (validItems.length === 0) { toast.error('Add at least one item'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/bills', {
        patient_id: selectedPatient.id,
        items: validItems.map(i => ({ description: i.description, amount: parseFloat(i.amount) })),
        payment_method: paymentMethod,
      });
      toast.success('Bill created');
      setShowCreate(false);
      fetchBills();
      if (data.bill?.id) {
        if (confirm('Print receipt?')) {
          window.open(`/api/bills/receipt/${data.bill.id}`, '_blank');
        }
      }
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed to create bill'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Receipt className="h-6 w-6 text-accent" /> Billing</h2>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Create Bill
        </button>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-3">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} placeholder="Filter by date"
          className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
        {dateFilter && <button onClick={() => setDateFilter('')} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>}
      </div>

      {/* Bills List */}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div> : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Bill No</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{b.bill_number}</td>
                    <td className="px-4 py-3 font-medium">{b.patient_name}</td>
                    <td className="px-4 py-3">{formatDate(b.created_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{(b.items || []).length} item(s)</td>
                    <td className="px-4 py-3 font-medium text-right">{formatCurrency(b.total)}</td>
                    <td className="px-4 py-3 capitalize">{b.payment_method}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => window.open(`/api/bills/receipt/${b.id}`, '_blank')} className="text-xs text-accent hover:underline flex items-center gap-1">
                        <Printer className="h-3 w-3" /> Receipt
                      </button>
                    </td>
                  </tr>
                ))}
                {bills.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No bills found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Bill Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Create Bill</h3>
              <button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              {/* Patient search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
                {selectedPatient ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-accent/5 border border-accent/20 rounded-lg text-sm">
                    <span>{selectedPatient.name} ({selectedPatient.phone})</span>
                    <button onClick={() => { setSelectedPatient(null); setPatientSearch(''); }}><X className="h-4 w-4 text-gray-400" /></button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} placeholder="Search patient..."
                        className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                    </div>
                    {patients.length > 0 && (
                      <div className="border rounded-lg mt-1 max-h-32 overflow-y-auto">
                        {patients.map(p => (
                          <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(p.name); setPatients([]); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{p.name} ({p.phone})</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Line items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                        placeholder="Description" className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                      <input type="number" value={item.amount} onChange={e => updateItem(i, 'amount', e.target.value)}
                        placeholder="Amount" className="w-28 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={addItem} className="text-sm text-accent hover:underline flex items-center gap-1"><Plus className="h-3 w-3" /> Add Item</button>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Total</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <div className="flex gap-2">
                  {['cash', 'card', 'upi'].map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className={`px-4 py-2 rounded-lg text-sm capitalize border ${paymentMethod === m ? 'bg-primary text-white border-primary' : 'hover:bg-gray-50'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={createBill} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
