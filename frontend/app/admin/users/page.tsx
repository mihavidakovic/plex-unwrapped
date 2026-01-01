'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';

interface User {
  id: number;
  plex_user_id: number;
  username: string;
  email: string;
  friendly_name?: string;
  preferred_language?: string;
  hasStats?: boolean;
  statsYear?: number;
  wrappedUrl?: string;
  updated_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.username?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.friendly_name?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      const data: any = await api.getUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
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
      setSuccessMessage(
        `Successfully synced ${result.usersCreated + result.usersUpdated} users (${result.usersCreated} new, ${result.usersUpdated} updated)`
      );
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to sync users');
    } finally {
      setSyncing(false);
    }
  };

  const handlePreview = async (userId: number) => {
    // Find the user to get their stats year
    const user = users.find(u => u.id === userId);
    const year = user?.statsYear || new Date().getFullYear();

    try {
      const preview: any = await api.previewUser(userId, year);
      if (preview.previewUrl) {
        window.open(preview.previewUrl, '_blank');
      } else {
        alert('No stats available for this user yet. Please generate wrapped stats first.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load preview');
    }
  };

  const handleSendEmail = async (userId: number) => {
    setError('');
    setSuccessMessage('');

    const confirmSend = window.confirm('Are you sure you want to send the unwrapped email to this user?');
    if (!confirmSend) return;

    try {
      await api.sendUserEmail(userId);
      setSuccessMessage('Email sent successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    }
  };

  const handleLanguageChange = async (userId: number, language: string) => {
    setError('');
    setSuccessMessage('');
    try {
      await api.updateUserLanguage(userId, language);
      setSuccessMessage(`Language preference updated to ${language}`);
      // Update local state
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, preferred_language: language } : u));
      setFilteredUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, preferred_language: language } : u));
    } catch (err: any) {
      setError(err.message || 'Failed to update language preference');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Users</h1>
          <p className="text-gray-400 mt-1">
            Manage Plex users and preview their wrapped stats
          </p>
        </div>
        <Button onClick={handleSyncUsers} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync from Tautulli'}
        </Button>
      </div>

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

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
          <CardDescription>Filter by username, email, or friendly name</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Preview each user's wrapped page or view their stats status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">
                {searchQuery
                  ? 'No users found matching your search'
                  : 'No users found. Sync from Tautulli to get started.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Friendly Name</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Stats Status</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email || <span className="text-gray-500">-</span>}</TableCell>
                    <TableCell>
                      {user.friendly_name || <span className="text-gray-500">-</span>}
                    </TableCell>
                    <TableCell>
                      <select
                        value={user.preferred_language || 'en'}
                        onChange={(e) => handleLanguageChange(user.id, e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-plex-500"
                      >
                        <option value="en">🇬🇧 English</option>
                        <option value="es">🇪🇸 Español</option>
                        <option value="fr">🇫🇷 Français</option>
                        <option value="de">🇩🇪 Deutsch</option>
                        <option value="sl">🇸🇮 Slovenščina</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      {user.hasStats ? (
                        <Badge variant="default">
                          {user.statsYear} Generated
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Stats</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-400">
                      {new Date(user.updated_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePreview(user.id)}
                          disabled={!user.hasStats}
                        >
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleSendEmail(user.id)}
                          disabled={!user.hasStats || !user.email}
                        >
                          Send Email
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-dark-700 bg-dark-800/50">
        <CardHeader>
          <CardTitle className="text-sm">How to Preview Users</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400 space-y-2">
          <p>
            1. First, generate wrapped stats from the Dashboard or Generations page
          </p>
          <p>
            2. Once generated, click "Preview" to view each user's wrapped page
          </p>
          <p>
            3. In TEST MODE, you can preview all users before sending any emails
          </p>
          <p>
            4. When ready, send emails from the Emails page
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
