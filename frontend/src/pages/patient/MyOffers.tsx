import React, { useEffect, useState } from 'react';
import { offersApi } from '../../api/offers';
import { AppointmentOffer } from '../../types';
import { Tag, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export const MyOffers: React.FC = () => {
  const [offers, setOffers] = useState<AppointmentOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const data = await offersApi.getMyHistory();
        setOffers(data);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  const getStatusBadge = (status: string, isExpired: boolean) => {
    if (isExpired || status === 'expired') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase">
          <Clock className="h-3 w-3" /> Expired
        </span>
      );
    }
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase">
            <CheckCircle2 className="h-3 w-3" /> Accepted
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 uppercase">
            <XCircle className="h-3 w-3" /> Declined
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase animate-pulse">
            <AlertCircle className="h-3 w-3" /> Pending Action
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Appointment Offers History</h2>
        <p className="text-sm text-slate-500 mt-1">
          Historical record of autonomous waitlist appointment offers extended to your account.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading offer history...</div>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Tag className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <h3 className="font-bold text-slate-700 text-base">No appointment offers received yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            When a patient cancels and your preferences match, an offer will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Offer ID</th>
                <th className="py-3.5 px-6">Doctor & Specialty</th>
                <th className="py-3.5 px-6">Offered Slot Time</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Offered At</th>
                <th className="py-3.5 px-6">Response Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {offers.map((offer) => {
                const slotDate = offer.slot_start_time ? new Date(offer.slot_start_time) : null;
                const offeredDate = new Date(offer.offered_at);
                const respondedDate = offer.responded_at ? new Date(offer.responded_at) : null;

                return (
                  <tr key={offer.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-bold text-slate-500">#{offer.id}</td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 block">{offer.doctor_name}</span>
                      <span className="text-xs text-slate-500">{offer.doctor_specialty}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      {slotDate ? (
                        <>
                          <span className="font-medium block">
                            {slotDate.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="text-xs text-slate-500">
                            {slotDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(offer.status, offer.is_expired)}</td>
                    <td className="py-4 px-6 text-xs text-slate-500">
                      {offeredDate.toLocaleDateString()} {offeredDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500">
                      {respondedDate
                        ? `${respondedDate.toLocaleDateString()} ${respondedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : '—'}
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

