import React, { useEffect, useState } from 'react';
import { appointmentsApi } from '../../api/appointments';
import { Appointment } from '../../types';
import { Calendar, Filter } from 'lucide-react';

export const AppointmentsManager: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const data = await appointmentsApi.getAll();
        setAppointments(data);
      } catch {
        // Handled
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filteredAppointments = appointments.filter((a) => {
    if (filterStatus === 'all') return true;
    return a.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'booked':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase">
            {status}
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 uppercase">
            Cancelled
          </span>
        );
      case 'offered':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase">
            Offered to Waitlist
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 uppercase">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Master Appointments Grid</h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time schedule allocations, cancellations, and autonomous AI offer states.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="booked">Booked (Converted)</option>
            <option value="offered">Offered to Waitlist</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading appointments...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">ID</th>
                <th className="py-3.5 px-6">Patient</th>
                <th className="py-3.5 px-6">Doctor & Specialty</th>
                <th className="py-3.5 px-6">Slot Time</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Clinical Note / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredAppointments.map((appt) => {
                const date = new Date(appt.start_time);
                return (
                  <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-bold text-slate-400">#{appt.id}</td>
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {appt.patient_name || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
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
                        <span className="text-red-600 font-medium">Cancelled: {appt.cancellation_reason}</span>
                      ) : (
                        appt.reason || '—'
                      )}
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

