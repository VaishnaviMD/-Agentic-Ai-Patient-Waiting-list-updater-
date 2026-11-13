import React, { useEffect, useState } from 'react';
import { doctorsApi } from '../../api/doctors';
import { Doctor } from '../../types';
import { Stethoscope, Plus, DollarSign, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export const DoctorsManager: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [fee, setFee] = useState('150.00');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchDoctors = async () => {
    try {
      const data = await doctorsApi.getAll();
      setDoctors(data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      await doctorsApi.create({
        full_name: fullName,
        specialty,
        room_number: roomNumber,
        consultation_fee: Number(fee),
        is_active: true,
      });
      setShowModal(false);
      setFullName('');
      setSpecialty('');
      setRoomNumber('');
      setFeedback('Doctor successfully added to medical directory!');
      fetchDoctors();
    } catch {
      // Error
    } finally {
      setSubmitting(false);
    }
  };

  const getDayName = (dayIndex: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayIndex] || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Physicians & Schedules</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage hospital medical staff, clinic rooms, and recurring weekly consultation hours.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition-colors shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Doctor</span>
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-teal-600" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-semibold px-2 py-1 bg-white rounded-lg">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading physicians...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Doctor</th>
                <th className="py-3.5 px-6">Specialty</th>
                <th className="py-3.5 px-6">Clinic Room</th>
                <th className="py-3.5 px-6">Fee</th>
                <th className="py-3.5 px-6">Weekly Schedule</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {doctors.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900">{doc.full_name}</td>
                  <td className="py-4 px-6 text-slate-600 font-medium">{doc.specialty}</td>
                  <td className="py-4 px-6 text-slate-600">{doc.room_number || '—'}</td>
                  <td className="py-4 px-6 text-slate-900 font-semibold">${doc.consultation_fee}</td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {doc.availabilities && doc.availabilities.length > 0 ? (
                        doc.availabilities.map((a) => (
                          <span
                            key={a.id}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700"
                          >
                            {getDayName(a.day_of_week)} ({a.start_time.slice(0, 5)}-{a.end_time.slice(0, 5)})
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">None</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Doctor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Register New Doctor</h3>

            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name (with Title) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Emily Watson"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Clinical Specialty *
                </label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. Dermatology, Pediatrics"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. Room 204"
                    className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fee ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

