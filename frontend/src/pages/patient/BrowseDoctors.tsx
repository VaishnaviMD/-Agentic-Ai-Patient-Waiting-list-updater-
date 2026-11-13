import React, { useEffect, useState } from 'react';
import { doctorsApi } from '../../api/doctors';
import { appointmentsApi } from '../../api/appointments';
import { Doctor } from '../../types';
import { Stethoscope, Calendar, Clock, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';

export const BrowseDoctors: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking modal
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00');
  const [reason, setReason] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
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
    fetchDoctors();
  }, []);

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !bookingDate) return;
    setBookingLoading(true);
    setFeedback(null);

    try {
      const startTime = new Date(`${bookingDate}T${bookingTime}:00Z`).toISOString();
      const endTime = new Date(new Date(startTime).getTime() + 30 * 60000).toISOString();

      await appointmentsApi.book({
        doctor_id: selectedDoctor.id,
        start_time: startTime,
        end_time: endTime,
        reason,
      });

      setFeedback({
        type: 'success',
        message: `Appointment booked with ${selectedDoctor.full_name} for ${bookingDate} at ${bookingTime}!`,
      });
      setSelectedDoctor(null);
      setReason('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to book appointment',
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const getDayName = (dayIndex: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex] || '';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Medical Directory</h2>
        <p className="text-sm text-slate-500 mt-1">
          Explore specialized physicians, check weekly availability, and book direct consultations.
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

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading doctor profiles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:border-teal-500/50 transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    <DollarSign className="h-3 w-3 mr-0.5" />
                    {doc.consultation_fee}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{doc.full_name}</h3>
                  <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mt-0.5">
                    {doc.specialty}
                  </p>
                  {doc.room_number && (
                    <p className="text-xs text-slate-500 mt-1">Location: {doc.room_number}</p>
                  )}
                </div>

                {/* Available Days */}
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Weekly Clinic Schedule
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {doc.availabilities && doc.availabilities.length > 0 ? (
                      doc.availabilities.map((avail) => (
                        <span
                          key={avail.id}
                          className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700"
                        >
                          {getDayName(avail.day_of_week)} ({avail.start_time.slice(0, 5)} - {avail.end_time.slice(0, 5)})
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Schedule not configured</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setSelectedDoctor(doc)}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors flex items-center justify-center space-x-2"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Book Consultation</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Book with {selectedDoctor.full_name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{selectedDoctor.specialty} • ${selectedDoctor.consultation_fee}</p>

            <form onSubmit={handleBookSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Consultation Date *
                </label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Slot Start Time *
                </label>
                <select
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                >
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Visit
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Follow-up consultation, symptoms review"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {bookingLoading ? 'Reserving...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

