import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin';
import { WorkflowExecution, AuditLog } from '../../types';
import { Bot, Shield, Activity, RefreshCw } from 'lucide-react';

export const AgentMonitor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workflows' | 'audit'>('workflows');
  const [workflows, setWorkflows] = useState<WorkflowExecution[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [w, a] = await Promise.all([adminApi.getWorkflows(50), adminApi.getAuditLogs(50)]);
      setWorkflows(w);
      setAuditLogs(a);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agent & Audit Observability</h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time inspection of n8n workflow triggers, Gemini tool executions, and immutable audit trails.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-8">
        <button
          onClick={() => setActiveTab('workflows')}
          className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'workflows'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>Workflow Executions ({workflows.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'audit'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading observability logs...</div>
      ) : activeTab === 'workflows' ? (
        <div className="space-y-4">
          {workflows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <Bot className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <h3 className="font-bold text-slate-700 text-base">No workflow executions recorded yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Cancelling an appointment will trigger the AI Agent workflow and show live decision traces here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Execution ID</th>
                    <th className="py-3.5 px-6">Workflow Type</th>
                    <th className="py-3.5 px-6">Trigger Event</th>
                    <th className="py-3.5 px-6">Appt ID</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Agent Decisions / Error</th>
                    <th className="py-3.5 px-6">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {workflows.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs font-bold text-slate-500">#{w.id}</td>
                      <td className="py-4 px-6 font-semibold text-slate-900">{w.workflow_type}</td>
                      <td className="py-4 px-6 text-slate-600">{w.trigger_event}</td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-600">
                        {w.appointment_id ? `#${w.appointment_id}` : '—'}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                            w.status === 'success'
                              ? 'bg-emerald-100 text-emerald-800'
                              : w.status === 'escalated'
                              ? 'bg-amber-100 text-amber-800'
                              : w.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 max-w-sm">
                        {w.error_message ? (
                          <span className="text-red-600 text-xs font-medium">{w.error_message}</span>
                        ) : (
                          <pre className="text-[11px] font-mono bg-slate-50 p-2 rounded border border-slate-200 max-h-24 overflow-y-auto">
                            {JSON.stringify(w.agent_decisions, null, 2)}
                          </pre>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500">
                        {new Date(w.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">ID</th>
                <th className="py-3.5 px-6">Actor Type</th>
                <th className="py-3.5 px-6">Action</th>
                <th className="py-3.5 px-6">Entity</th>
                <th className="py-3.5 px-6">Details</th>
                <th className="py-3.5 px-6">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs font-bold text-slate-400">#{log.id}</td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.actor_type === 'AGENT'
                          ? 'bg-teal-100 text-teal-800'
                          : log.actor_type === 'PATIENT'
                          ? 'bg-indigo-100 text-indigo-800'
                          : log.actor_type === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {log.actor_type}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-bold text-xs text-slate-800">{log.action}</td>
                  <td className="py-4 px-6 text-xs text-slate-600 font-mono">
                    {log.entity_name} #{log.entity_id}
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-500 max-w-sm">
                    <pre className="text-[10px] font-mono bg-slate-50 p-1.5 rounded border border-slate-100 max-h-16 overflow-y-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

