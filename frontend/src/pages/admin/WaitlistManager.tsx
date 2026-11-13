import React, { useEffect, useState } from 'react';
import { doctorsApi } from '../../api/doctors';
import { waitlistApi } from '../../api/waitlist';
import { Doctor, WaitlistEntry } from '../../types';
import { Clock, Users, Stethoscope } from 'lucide-react';

export const WaitlistManager: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const docs = await doctorsApi.getAll();
        setDoctors(docs);
        if (docs.length > 0) {
          setSelectedDoctorId(docs[0].id);
        }
      } catch {
        // Handled
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (!selectedDoctorId) return;
    const fetchQueue = async () => {
      try {
        const entries = await waitlistApi.getDoctorWaitlist(Number(selectedDoctorId));
        setWaitlist(entries);
      } catch {
        // Handled
      }
    };
    fetchQueue();
  }, [selectedDoctorId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Waitlist Queues</h2>
          <p className="text-sm text-slate-500 mt-1">
            Monitor real-time patient queues prioritized by the deterministic scoring engine.
          </p>
        </div>

        {/* Doctor Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Doctor:</label>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
            className="p-2.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl shadow-xs"
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name} ({d.specialty})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading waitlist queue...</div>
      ) : waitlist.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Clock className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <h3 className="font-bold text-slate-700 text-base">Waitlist queue is empty</h3>
          <p className="text-xs text-slate-500 mt-1">No patients are currently waiting for this specialist.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Queue Position</th>
                <th className="py-3.5 px-6">Patient Name</th>
                <th className="py-3.5 px-6">Preferred Days</th>
                <th className="py-3.5 px-6">Preferred Times</th>
                <th className="py-3.5 px-6">Joined Timestamp</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {waitlist.map((entry, index) => {
                const joinedDate = new Date(entry.joined_at);
                return (
                  <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-xs text-teal-600">#{index + 1}</td>
                    <td className="py-4 px-6 font-semibold text-slate-900">{entry.patient_name}</td>
                    <td className="py-4 px-6 text-slate-600">
                      <div className="flex flex-wrap gap-1">
                        {entry.preferred_days.map((d) => (
                          <span key={d} className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <div className="flex flex-wrap gap-1">
                        {entry.preferred_time_periods.map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500">
                      {joinedDate.toLocaleDateString()} {joinedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase">
                        Waiting
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

