import React, { useEffect, useState } from 'react';
import { AppointmentOffer } from '../../types';
import { offersApi } from '../../api/offers';
import { Clock, CheckCircle, XCircle, AlertTriangle, Sparkles } from 'lucide-react';

interface ActiveOfferBannerProps {
  onOfferAction?: () => void;
}

export const ActiveOfferBanner: React.FC<ActiveOfferBannerProps> = ({ onOfferAction }) => {
  const [offer, setOffer] = useState<AppointmentOffer | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchActiveOffer = async () => {
    try {
      const active = await offersApi.getMyActiveOffer();
      setOffer(active);
    } catch (e) {
      // Quiet fail if network glitch
    }
  };

  // Poll for active offer every 3 seconds
  useEffect(() => {
    fetchActiveOffer();
    const interval = setInterval(fetchActiveOffer, 3000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer calculations
  useEffect(() => {
    if (!offer) {
      setTimeLeft(null);
      return;
    }

    const calculateTime = () => {
      const diff = new Date(offer.expires_at).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0 });
        setOffer(null); // expired
        return;
      }

      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ minutes, seconds });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [offer]);

  const handleAccept = async () => {
    if (!offer) return;
    setProcessing(true);
    try {
      const res = await offersApi.accept(offer.id);
      setMessage({ text: res.message, type: 'success' });
      setOffer(null);
      if (onOfferAction) onOfferAction();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to accept offer', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!offer) return;
    setProcessing(true);
    try {
      const res = await offersApi.decline(offer.id);
      setMessage({ text: res.message, type: 'success' });
      setOffer(null);
      if (onOfferAction) onOfferAction();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to decline offer', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  if (message) {
    return (
      <div
        className={`mb-6 p-4 rounded-2xl flex items-center justify-between border ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}
      >
        <div className="flex items-center space-x-3 text-sm font-medium">
          {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <span>{message.text}</span>
        </div>
        <button
          onClick={() => setMessage(null)}
          className="text-xs font-semibold px-3 py-1 rounded-lg bg-white/60 hover:bg-white"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (!offer) return null;

  const slotDate = offer.slot_start_time ? new Date(offer.slot_start_time) : null;

  return (
    <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-1 shadow-lg shadow-orange-500/10 animate-fade-in">
      <div className="bg-white rounded-[14px] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Offer details */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                Urgent Appointment Offer
              </span>
              <span className="text-xs text-slate-500">Waitlist Matched by AI Agent</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Open Slot with {offer.doctor_name} ({offer.doctor_specialty})
            </h3>
            <p className="text-sm text-slate-600">
              📅 {slotDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at{' '}
              {slotDate?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Countdown & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {timeLeft && (
              <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-amber-900">
                <Clock className="h-4 w-4 text-amber-600 animate-spin" />
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">Offer Expires In</span>
                  <span className="font-mono font-bold text-base text-amber-900">
                    {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={handleAccept}
                disabled={processing}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Accept Slot</span>
              </button>
              <button
                onClick={handleDecline}
                disabled={processing}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                <XCircle className="h-4 w-4 text-slate-500" />
                <span>Decline</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

