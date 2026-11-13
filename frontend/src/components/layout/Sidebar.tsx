import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  UserCheck,
  Tag,
  Stethoscope,
  ListOrdered,
  Bot,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const patientLinks = [
    { to: '/patient/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { to: '/patient/doctors', label: 'Browse Doctors', icon: Stethoscope },
    { to: '/patient/appointments', label: 'My Appointments', icon: Calendar },
    { to: '/patient/waitlist', label: 'Join Waitlist', icon: Clock },
    { to: '/patient/offers', label: 'My Offers', icon: Tag },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/doctors', label: 'Doctors & Schedules', icon: Stethoscope },
    { to: '/admin/appointments', label: 'All Appointments', icon: Calendar },
    { to: '/admin/waitlist', label: 'Waitlist Queues', icon: ListOrdered },
    { to: '/admin/agent-monitor', label: 'AI Agent Monitor', icon: Bot },
  ];

  const links = isAdmin ? adminLinks : patientLinks;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-61px)] p-4 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {isAdmin ? 'Hospital Administration' : 'Patient Services'}
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Helpful info badge */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-500">
        <p className="font-semibold text-slate-700 mb-0.5">Autonomous Waitlist Active</p>
        <p className="text-[11px] leading-relaxed">
          Cancellations automatically trigger Gemini AI agent prioritization.
        </p>
      </div>
    </aside>
  );
};

