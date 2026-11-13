import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, LogOut, User as UserIcon, Shield } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="px-6 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg tracking-tight leading-tight">CareFlow AI</h1>
            <p className="text-xs text-slate-500 font-medium">Hospital Scheduling Platform</p>
          </div>
        </div>

        {/* User Identity & Actions */}
        {user && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full">
              <div className="p-1 bg-white rounded-full text-slate-600 shadow-xs">
                {user.role === 'admin' ? (
                  <Shield className="h-4 w-4 text-indigo-600" />
                ) : (
                  <UserIcon className="h-4 w-4 text-teal-600" />
                )}
              </div>
              <div className="text-left">
                <span className="text-xs font-semibold text-slate-800 block leading-tight">{user.full_name}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

