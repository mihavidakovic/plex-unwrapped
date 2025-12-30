'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  totalUsers: number;
  totalGenerations: number;
  latestGeneration?: {
    id: number;
    year: number;
    status: string;
    total_users: number;
    created_at: string;
  };
  emailStats: {
    totalSent: number;
    totalPending: number;
    totalFailed: number;
  };
  testMode: boolean;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats() as DashboardStats;
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncUsers = async () => {
    setSyncing(true);
    setError('');
    setSuccessMessage('');
    try {
      const result: any = await api.syncUsers();
      setSuccessMessage(`Successfully synced ${result.usersCreated + result.usersUpdated} users`);
      await loadStats();
    } catch (err: any) {
      setError(err.message || 'Failed to sync users');
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateWrapped = async () => {
    const year = new Date().getFullYear();
    const confirmMessage = stats?.testMode
      ? `Generate Wrapped ${year} stats in TEST MODE?\n\nStats will be generated but NO emails will be sent. You can preview all users afterward.`
      : `Generate Wrapped ${year} stats and send emails?\n\nThis will calculate stats for all users and send email notifications. This cannot be undone.`;

    if (!confirm(confirmMessage)) return;

    setGenerating(true);
    setError('');
    setSuccessMessage('');
    try {
      const result: any = await api.generateWrapped(year);
      setSuccessMessage(
        stats?.testMode
          ? `Generation started in TEST MODE (ID: ${result.generationId}). Check the Generations page for progress.`
          : `Generation started (ID: ${result.generationId}). Check the Generations page for progress.`
      );
      await loadStats();
    } catch (err: any) {
      setError(err.message || 'Failed to start generation');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-plex-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gradient">Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your Unwrapped for Plex system</p>
      </div>

      {/* Test Mode Warning */}
      {stats?.testMode && (
        <Card className="border-plex-500 bg-plex-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-plex-500">
              <span className="text-2xl">⚠️</span>
              TEST MODE ENABLED
            </CardTitle>
            <CardDescription>
              Stats will be generated but NO emails will be sent. Perfect for testing before going live.
              You can preview all users' wrapped pages from the Users section.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Messages */}
      {error && (
        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md p-3">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-md p-3">
          {successMessage}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <span className="text-2xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-gray-400 mt-1">Synced from Tautulli</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generations</CardTitle>
            <span className="text-2xl">⚙️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalGenerations || 0}</div>
            <p className="text-xs text-gray-400 mt-1">Total runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <span className="text-2xl">📧</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.emailStats.totalSent || 0}</div>
            <p className="text-xs text-gray-400 mt-1">
              {stats?.emailStats.totalFailed || 0} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <span className="text-2xl">📊</span>
          </CardHeader>
          <CardContent>
            <Badge variant={stats?.testMode ? 'outline' : 'default'}>
              {stats?.testMode ? 'Test Mode' : 'Live'}
            </Badge>
            <p className="text-xs text-gray-400 mt-1">System mode</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Generation */}
      {stats?.latestGeneration && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Generation</CardTitle>
            <CardDescription>Most recent wrapped stats generation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Year</span>
                <span className="font-medium">{stats.latestGeneration.year}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Status</span>
                <Badge
                  variant={
                    stats.latestGeneration.status === 'completed'
                      ? 'default'
                      : stats.latestGeneration.status === 'failed'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {stats.latestGeneration.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Users</span>
                <span className="font-medium">{stats.latestGeneration.total_users}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Created</span>
                <span className="font-medium">
                  {new Date(stats.latestGeneration.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your Unwrapped for Plex system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">1. Sync Users from Tautulli</h3>
            <p className="text-sm text-gray-400 mb-3">
              Import or update users from your Tautulli instance
            </p>
            <Button onClick={handleSyncUsers} disabled={syncing}>
              {syncing ? 'Syncing...' : 'Sync Users'}
            </Button>
          </div>

          <div className="border-t border-dark-700 pt-4">
            <h3 className="text-sm font-medium mb-2">
              2. Generate Wrapped {new Date().getFullYear()}
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              {stats?.testMode
                ? 'Generate stats in TEST MODE (no emails will be sent)'
                : 'Calculate stats and send emails to all users'}
            </p>
            <Button onClick={handleGenerateWrapped} disabled={generating} variant="default">
              {generating ? 'Generating...' : `Generate Wrapped ${new Date().getFullYear()}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
