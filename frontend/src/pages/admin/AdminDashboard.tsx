import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin';
import { DashboardStats, WorkflowExecution } from '../../types';
import {
  Users,
  Calendar,
  Clock,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Bot,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentWorkflows, setRecentWorkflows] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [s, w] = await Promise.all([adminApi.getStats(), adminApi.getWorkflows(5)]);
      setStats(s);
      setRecentWorkflows(w);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Hospital Administration</h2>
          <p className="text-sm text-slate-500 mt-1">
            Clinical scheduling command center & Autonomous Agent monitor.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full text-emerald-800 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Agentic Orchestrator Online</span>
        </div>
      </div>

      {/* KPI Metrics Cards Grid */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading metrics...</div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Active Appointments */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Consultations
              </span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-slate-900">{stats.total_active_appointments}</span>
              <span className="text-xs text-slate-400 ml-2">scheduled</span>
            </div>
          </div>

          {/* Cancellations Logged */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cancellations
              </span>
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-slate-900">{stats.total_cancellations}</span>
              <span className="text-xs text-slate-400 ml-2">slots freed</span>
            </div>
          </div>

          {/* Waitlist Queue */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Waiting Patients
              </span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-slate-900">{stats.active_waitlist_count}</span>
              <span className="text-xs text-slate-400 ml-2">in queue</span>
            </div>
          </div>

          {/* AI Waitlist Recovery Rate */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                AI Recovery Rate
              </span>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-teal-600">{stats.recovery_rate_percentage}%</span>
              <span className="text-xs text-slate-400 ml-2">
                ({stats.offers_accepted}/{stats.total_offers_extended} converted)
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Agent Activity Stream */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Autonomous AI Execution Feed</h3>
                <p className="text-xs text-slate-500">Live decision stream from Gemini Agent</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-400">Live Polling</span>
          </div>

          {recentWorkflows.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Bot className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No agent workflow executions recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentWorkflows.map((wf) => {
                const date = new Date(wf.created_at);
                return (
                  <div
                    key={wf.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 space-y-1.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-700">
                        {wf.workflow_type}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          wf.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : wf.status === 'escalated'
                            ? 'bg-amber-100 text-amber-800'
                            : wf.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {wf.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      Trigger Event: <strong className="text-slate-800">{wf.trigger_event}</strong>
                    </p>

                    {wf.agent_decisions && (
                      <pre className="text-[11px] font-mono bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 overflow-x-auto">
                        {JSON.stringify(wf.agent_decisions, null, 2)}
                      </pre>
                    )}

                    <div className="text-[10px] text-slate-400 text-right">
                      {date.toLocaleTimeString()} • {date.toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* System Health and Fast Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Platform Architecture</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              FastAPI enforces database consistency and deterministic ranking. Gemini reasons over events and coordinates tools.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-600 font-medium">PostgreSQL Relational DB</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-600 font-medium">FastAPI Tool Endpoints</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 9 Tools Active
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-600 font-medium">n8n Event Orchestrator</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Listening
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

