import React, { useEffect, useState } from 'react';
import { doctorsApi } from '../../api/doctors';
import { waitlistApi } from '../../api/waitlist';
import { Doctor, WaitlistEntry } from '../../types';
import { Clock, CheckCircle2, AlertCircle, Trash2, Calendar, Stethoscope } from 'lucide-react';

export const JoinWaitlist: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [myEntries, setMyEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Any']);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>(['Any']);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const daysList = ['Any', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periodsList = ['Any', 'Morning', 'Afternoon', 'Evening'];

  const loadData = async () => {
    try {
      const [docs, entries] = await Promise.all([doctorsApi.getAll(), waitlistApi.getMyWaitlist()]);
      setDoctors(docs);
      setMyEntries(entries);
      if (docs.length > 0 && selectedDoctorId === '') {
        setSelectedDoctorId(docs[0].id);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleDay = (day: string) => {
    if (day === 'Any') {
      setSelectedDays(['Any']);
      return;
    }
    const filtered = selectedDays.filter((d) => d !== 'Any');
    if (filtered.includes(day)) {
      const next = filtered.filter((d) => d !== day);
      setSelectedDays(next.length === 0 ? ['Any'] : next);
    } else {
      setSelectedDays([...filtered, day]);
    }
  };

  const togglePeriod = (period: string) => {
    if (period === 'Any') {
      setSelectedPeriods(['Any']);
      return;
    }
    const filtered = selectedPeriods.filter((p) => p !== 'Any');
    if (filtered.includes(period)) {
      const next = filtered.filter((p) => p !== period);
      setSelectedPeriods(next.length === 0 ? ['Any'] : next);
    } else {
      setSelectedPeriods([...filtered, period]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      await waitlistApi.join({
        doctor_id: Number(selectedDoctorId),
        preferred_days: selectedDays,
        preferred_time_periods: selectedPeriods,
        notes,
      });
      setFeedback({
        type: 'success',
        message: 'Successfully registered on waitlist! The AI agent will score and notify you when a matching slot opens.',
      });
      setNotes('');
      loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to join waitlist',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async (waitlistId: number) => {
    try {
      await waitlistApi.leave(waitlistId);
      loadData();
    } catch {
      // Error
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Waitlist Registration</h2>
        <p className="text-sm text-slate-500 mt-1">
          Specify your availability preferences. When a cancellation occurs, the AI Agent scores your preferences and prioritizes your offer.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center space-x-3 text-sm font-medium">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold px-2 py-1 bg-white rounded-lg"
          >
            Close
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 mb-6">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">New Waitlist Request</h3>
              <p className="text-xs text-slate-500">Tailor your scheduling criteria</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Select Doctor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Select Medical Specialist *
              </label>
              <select
                required
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} — {d.specialty} (${d.consultation_fee})
                  </option>
                ))}
              </select>
            </div>

            {/* Preferred Days */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Preferred Days (Higher score for exact day match)
              </label>
              <div className="flex flex-wrap gap-2">
                {daysList.map((day) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        isSelected
                          ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preferred Time Periods */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Preferred Time Periods
              </label>
              <div className="flex flex-wrap gap-2">
                {periodsList.map((period) => {
                  const isSelected = selectedPeriods.includes(period);
                  return (
                    <button
                      key={period}
                      type="button"
                      onClick={() => togglePeriod(period)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        isSelected
                          ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {period} {period === 'Morning' && '(8AM - 12PM)'}
                      {period === 'Afternoon' && '(12PM - 4PM)'}
                      {period === 'Evening' && '(4PM - 8PM)'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Clinical or Availability Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Prefers afternoon slots due to work commute"
                className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Registering on Waitlist...' : 'Join Waitlist Queue'}
            </button>
          </form>
        </div>

        {/* Current Waitlist Entries */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Your Waitlist Entries</h3>
            <p className="text-xs text-slate-500 mb-4">Live registrations in matching queues</p>

            <div className="space-y-3">
              {loading ? (
                <div className="text-xs text-slate-400 py-6 text-center">Loading entries...</div>
              ) : myEntries.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No active waitlist registrations.
                </div>
              ) : (
                myEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{entry.doctor_name}</span>
                      <button
                        onClick={() => handleLeave(entry.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Leave waitlist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Days: <span className="font-medium">{entry.preferred_days.join(', ')}</span>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Times: <span className="font-medium">{entry.preferred_time_periods.join(', ')}</span>
                    </p>
                    <span
                      className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        entry.status === 'waiting'
                          ? 'bg-amber-100 text-amber-800'
                          : entry.status === 'booked'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

