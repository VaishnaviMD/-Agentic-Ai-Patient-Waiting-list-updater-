import React, { useEffect, useState } from 'react';
import { appointmentsApi } from '../../api/appointments';
import { Appointment } from '../../types';
import { Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export const MyAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      const data = await appointmentsApi.getAll();
      setAppointments(data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingAppt || !cancelReason) return;
    setCancelLoading(true);

    try {
      await appointmentsApi.cancel(cancellingAppt.id, cancelReason);
      setNotice(
        `Appointment #${cancellingAppt.id} cancelled. The AI Agent is now reallocating the slot to waitlist patients.`
      );
      setCancellingAppt(null);
      setCancelReason('');
      fetchAppointments();
    } catch {
      // Error handling
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'booked':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
            Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 uppercase tracking-wider">
            Cancelled
          </span>
        );
      case 'offered':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
            Offered to Waitlist
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Appointments</h2>
        <p className="text-sm text-slate-500 mt-1">
          Review your scheduled, completed, and cancelled consultation bookings.
        </p>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-sm font-medium">
            <CheckCircle2 className="h-5 w-5 text-teal-600 flex-shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-xs font-semibold px-2 py-1 bg-white rounded-lg text-teal-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Calendar className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <h3 className="font-bold text-slate-700 text-base">No appointment records found</h3>
          <p className="text-xs text-slate-500 mt-1">Book a consultation through the doctor directory.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Doctor & Specialty</th>
                <th className="py-3.5 px-6">Date & Time</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Notes</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {appointments.map((appt) => {
                const date = new Date(appt.start_time);
                const canCancel = appt.status === 'scheduled' || appt.status === 'booked';
                return (
                  <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 block">{appt.doctor_name}</span>
                      <span className="text-xs text-slate-500">{appt.doctor_specialty}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      <span className="font-medium block">
                        {date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="text-xs text-slate-500">
                        {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(appt.status)}</td>
                    <td className="py-4 px-6 text-xs text-slate-500 max-w-xs">
                      {appt.cancellation_reason ? (
                        <span className="text-red-600 italic">Cancelled: {appt.cancellation_reason}</span>
                      ) : (
                        appt.reason || '—'
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {canCancel && (
                        <button
                          onClick={() => setCancellingAppt(appt)}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellingAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Cancel Appointment?</h3>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Cancelling appointment #{cancellingAppt.id} with{' '}
              <strong>{cancellingAppt.doctor_name}</strong> will trigger autonomous agent reallocation.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Cancellation *
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="State your reason for cancellation..."
                  className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingAppt(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

