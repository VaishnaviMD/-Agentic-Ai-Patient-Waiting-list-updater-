import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentsApi } from '../../api/appointments';
import { waitlistApi } from '../../api/waitlist';
import { Appointment, WaitlistEntry } from '../../types';
import { ActiveOfferBanner } from '../../components/patient/ActiveOfferBanner';
import {
  Calendar,
  Clock,
  Stethoscope,
  PlusCircle,
  AlertCircle,
  XCircle,
  CheckCircle2,
} from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Cancellation modal state
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [appts, wl] = await Promise.all([appointmentsApi.getAll(), waitlistApi.getMyWaitlist()]);
      setAppointments(appts);
      setWaitlistEntries(wl);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingAppt || !cancelReason) return;
    setCancelLoading(true);
    try {
      await appointmentsApi.cancel(cancellingAppt.id, cancelReason);
      setActionNotice(
        `Appointment #${cancellingAppt.id} cancelled. The AI Agent will automatically offer this slot to the highest-priority waitlisted patient.`
      );
      setCancellingAppt(null);
      setCancelReason('');
      loadData();
    } catch {
      // Error handling
    } finally {
      setCancelLoading(false);
    }
  };

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'scheduled' || a.status === 'booked'
  );

  return (
    <div className="space-y-8">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.full_name}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your medical appointments and track waitlist queue priority.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/patient/doctors"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition-colors shadow-xs"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Book Appointment</span>
          </Link>
          <Link
            to="/patient/waitlist"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            <Clock className="h-4 w-4 text-teal-600" />
            <span>Join Waitlist</span>
          </Link>
        </div>
      </div>

      {/* Real-time Autonomous Offer Banner */}
      <ActiveOfferBanner onOfferAction={loadData} />

      {/* Cancellation Notification Alert */}
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-sm font-medium">
            <CheckCircle2 className="h-5 w-5 text-teal-600 flex-shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-xs font-semibold px-2 py-1 bg-white rounded-lg text-teal-700 hover:bg-teal-100"
          >
            Close
          </button>
        </div>
      )}

      {/* Grid of Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card 1: Upcoming Appointments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Upcoming Appointments</h3>
                  <p className="text-xs text-slate-500">Confirmed clinic consultations</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {upcomingAppointments.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-slate-400 py-6 text-center">Loading appointments...</div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  No upcoming appointments scheduled.
                </div>
              ) : (
                upcomingAppointments.map((appt) => {
                  const date = new Date(appt.start_time);
                  return (
                    <div
                      key={appt.id}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900">{appt.doctor_name}</span>
                          <span className="text-xs text-slate-500">• {appt.doctor_specialty}</span>
                        </div>
                        <p className="text-xs text-slate-600">
                          {date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          at {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {appt.reason && <p className="text-xs text-slate-400 italic">"{appt.reason}"</p>}
                      </div>

                      <button
                        onClick={() => setCancellingAppt(appt)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-right">
            <Link to="/patient/appointments" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
              View All History →
            </Link>
          </div>
        </div>

        {/* Card 2: Active Waitlist Queues */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Active Waitlists</h3>
                  <p className="text-xs text-slate-500">Autonomous cancellation matching</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {waitlistEntries.filter((w) => w.status === 'waiting').length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-slate-400 py-6 text-center">Loading waitlists...</div>
              ) : waitlistEntries.filter((w) => w.status === 'waiting').length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  You are not currently on any doctor waitlists.
                </div>
              ) : (
                waitlistEntries
                  .filter((w) => w.status === 'waiting')
                  .map((w) => (
                    <div
                      key={w.id}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{w.doctor_name}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                          Waiting
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p>
                          <span className="font-medium text-slate-700">Preferred Days:</span>{' '}
                          {w.preferred_days.join(', ')}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">Preferred Times:</span>{' '}
                          {w.preferred_time_periods.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-right">
            <Link to="/patient/waitlist" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
              Manage Waitlist Preferences →
            </Link>
          </div>
        </div>
      </div>

      {/* Cancellation Modal Dialog */}
      {cancellingAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Cancel Appointment?</h3>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Cancelling your appointment with{' '}
              <strong className="text-slate-900">{cancellingAppt.doctor_name}</strong> will trigger the
              CareFlow AI Agent to immediately offer this slot to eligible waitlisted patients.
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
                  placeholder="e.g., Conflict in personal schedule, traveling out of town..."
                  className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingAppt(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Keep Appointment
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

