import apiClient from './client';
import { DashboardStats, WorkflowExecution, AuditLog } from '../types';

export const adminApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get<DashboardStats>('/admin/dashboard-stats');
    return res.data;
  },

  getWorkflows: async (limit: number = 50): Promise<WorkflowExecution[]> => {
    const res = await apiClient.get<WorkflowExecution[]>(`/admin/workflows?limit=${limit}`);
    return res.data;
  },

  getAuditLogs: async (limit: number = 100): Promise<AuditLog[]> => {
    const res = await apiClient.get<AuditLog[]>(`/admin/audit-logs?limit=${limit}`);
    return res.data;
  },
};

