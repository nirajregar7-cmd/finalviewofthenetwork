import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, UserReport, Post, Community } from '../types';
import {
  ShieldCheck, Users, AlertTriangle, Trash2,
  ShieldAlert, X, Search, GraduationCap,
  TrendingUp, UserX, FileText, ChevronDown, ChevronUp,
  Calendar, Mail, BookOpen, KeyRound, Eye, EyeOff,
  Upload, Download, CheckCircle2, AlertCircle, Send, Crown, Building2,
  BarChart2, GitMerge, ArrowRight, History, LockKeyhole, Inbox, RefreshCw,
  MessageCircle, Loader2
} from 'lucide-react';
import Avatar from './Avatar';
import { api } from '../api';
import AdminAnalytics from './AdminAnalytics';
import { getEducationDisplay } from '../utils/education';

interface AdminSectionProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  reports: UserReport[];
  posts: Post[];
  communities: Community[];
  onToggleUserSuspension: (userId: string) => void;
  onResolveReport: (reportId: string, status: 'suspended' | 'dismissed') => void;
  onDeletePost: (postId: string) => void;
  onAllUsersChange: (users: UserProfile[]) => void;
  onCommunitiesChange: (communities: Community[]) => void;
  darkMode: boolean;
}

type AdminTab = 'analytics' | 'users' | 'reports' | 'posts' | 'import' | 'email' | 'email_inbox' | 'college_admins' | 'community_merge';

type EmailInboxMessage = {
  id: string;
  threadId: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  isUnread: boolean;
};

type EmailInboxThread = {
  id: string;
  subject: string;
  latestDate: string;
  latestSender: string;
  latestSnippet: string;
  isUnread: boolean;
  messages: EmailInboxMessage[];
};

export default function AdminSection({
  currentUser,
  allUsers,
  reports,
  posts,
  communities,
  onToggleUserSuspension,
  onResolveReport,
  onDeletePost,
  onAllUsersChange,
  onCommunitiesChange,
  darkMode
}: AdminSectionProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'college'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetShowPw, setResetShowPw] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const [csvRaw, setCsvRaw] = useState('');
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvError, setCsvError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailMode, setEmailMode] = useState<'all' | 'custom'>('all');
  const [emailCustomTo, setEmailCustomTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);
  const [emailError, setEmailError] = useState('');
  const [emailInboxThreads, setEmailInboxThreads] = useState<EmailInboxThread[]>([]);
  const [emailInboxAccount, setEmailInboxAccount] = useState('');
  const [selectedEmailThread, setSelectedEmailThread] = useState<EmailInboxThread | null>(null);
  const [loadingEmailInbox, setLoadingEmailInbox] = useState(false);
  const [emailInboxError, setEmailInboxError] = useState('');
  const [emailReplyBody, setEmailReplyBody] = useState('');
  const [sendingEmailReply, setSendingEmailReply] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeDestinationId, setMergeDestinationId] = useState('');
  const [mergePreview, setMergePreview] = useState<any | null>(null);
  const [mergePreviewLoading, setMergePreviewLoading] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [mergeConfirmText, setMergeConfirmText] = useState('');
  const [mergeAudit, setMergeAudit] = useState<any | null>(null);
  const [mergeAudits, setMergeAudits] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab !== 'community_merge') return;
    api.communities.mergeAudits(currentUser.id)
      .then(setMergeAudits)
      .catch(() => setMergeAudits([]));
  }, [activeTab, currentUser.id]);

  const handleLoadEmailInbox = async () => {
    setLoadingEmailInbox(true);
    setEmailInboxError('');
    try {
      const result = await api.email.inbox(currentUser.id);
      setEmailInboxAccount(result.accountEmail || '');
      setEmailInboxThreads(result.threads || []);
      setSelectedEmailThread(previous => {
        if (!previous) return null;
        return (result.threads || []).find((thread: EmailInboxThread) => thread.id === previous.id) || previous;
      });
    } catch (err: any) {
      setEmailInboxError(err.message || 'Unable to load the reply inbox.');
    } finally {
      setLoadingEmailInbox(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'email_inbox') return;
    void handleLoadEmailInbox();
  }, [activeTab, currentUser.id]);

  const handleOpenEmailThread = async (threadId: string) => {
    setEmailInboxError('');
    try {
      const thread = await api.email.thread(currentUser.id, threadId);
      setSelectedEmailThread(thread);
      setEmailReplyBody('');
    } catch (err: any) {
      setEmailInboxError(err.message || 'Unable to open this email thread.');
    }
  };

  const handleSendEmailReply = async () => {
    if (!selectedEmailThread || !emailReplyBody.trim()) return;
    setSendingEmailReply(true);
    setEmailInboxError('');
    try {
      await api.email.reply(currentUser.id, selectedEmailThread.id, emailReplyBody.trim());
      const refreshedThread = await api.email.thread(currentUser.id, selectedEmailThread.id);
      setSelectedEmailThread(refreshedThread);
      setEmailReplyBody('');
      await handleLoadEmailInbox();
    } catch (err: any) {
      setEmailInboxError(err.message || 'Unable to send this reply.');
    } finally {
      setSendingEmailReply(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      setEmailError('Subject and message body are required.');
      return;
    }
    setSendingEmail(true);
    setEmailError('');
    setEmailResult(null);
    try {
      const to = emailMode === 'custom'
        ? emailCustomTo.split(/[\n,]+/).map(e => e.trim()).filter(Boolean)
        : undefined;
      const result = await api.email.send(emailSubject, emailBody, to, emailMode === 'all');
      setEmailResult(result);
      if (result.sent > 0) { setEmailSubject(''); setEmailBody(''); setEmailCustomTo(''); }
    } catch (err: any) {
      setEmailError('Failed to send: ' + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!resetPassword.trim() || resetPassword.length < 8) return;
    setResetLoading(true);
    try {
      await api.users.resetPassword(userId, resetPassword);
      setResetSuccess(userId);
      setResetUserId(null);
      setResetPassword('');
      setTimeout(() => setResetSuccess(null), 3000);
    } catch (err: any) {
      alert('Failed to reset password: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const parseCSV = (text: string) => {
    setCsvError('');
    setImportResult(null);
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) { setCsvError('CSV must have a header row and at least one data row.'); setCsvRows([]); return; }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/['"]/g, ''));
    const required = ['full_name', 'email'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) { setCsvError(`Missing required columns: ${missing.join(', ')}`); setCsvRows([]); return; }
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return {
        fullName: obj['full_name'] || obj['name'] || '',
        email: obj['email'] || '',
        password: obj['password'] || obj['roll_no'] || obj['roll_number'] || '',
        college: obj['college'] || obj['university'] || obj['institution'] || '',
        branch: obj['branch'] || obj['department'] || obj['course'] || '',
        year: obj['year'] || obj['yr'] || '1',
        role: obj['role'] || 'student',
      };
    }).filter(r => r.email && r.fullName);
    if (rows.length === 0) { setCsvError('No valid rows found. Make sure full_name and email columns have data.'); setCsvRows([]); return; }
    setCsvRows(rows);
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.csv')) { setCsvError('Please upload a .csv file.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvRaw(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (csvRows.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await api.users.bulkImport(csvRows);
      setImportResult(result);
      setCsvRows([]);
      setCsvRaw('');
    } catch (err: any) {
      setCsvError('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'full_name,email,password,college,branch,year\nRaj Kumar,107124001@nitt.edu,pass123,NIT Tiruchirappalli,Computer Science,2\nPriya Singh,107124002@nitt.edu,pass123,NIT Tiruchirappalli,Mechanical,3\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'students_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className={`p-8 rounded-2xl border border-neutral-200 dark:border-white/10 text-center ${darkMode ? 'bg-[#121217]' : 'bg-neutral-50/50'}`}>
        <AlertTriangle className="mx-auto text-amber-500 mb-2" size={32} />
        <h3 className="font-bold uppercase tracking-wider text-xs mb-1">Administrative Access Denied</h3>
        <p className="text-xs max-w-md mx-auto opacity-75">
          This view is restricted to verified campus coordinators and administrative investigators.
        </p>
      </div>
    );
  }

  const activeUsers = allUsers.filter(u => !u.isSuspended);
  const suspendedUsers = allUsers.filter(u => u.isSuspended);
  const pendingReports = reports.filter(r => r.status === 'pending');

  const stats = [
    { label: 'Total Users', value: allUsers.length, icon: Users, color: 'indigo' },
    { label: 'Active', value: activeUsers.length, icon: TrendingUp, color: 'emerald' },
    { label: 'Suspended', value: suspendedUsers.length, icon: UserX, color: 'rose' },
    { label: 'Pending Reports', value: pendingReports.length, icon: AlertTriangle, color: 'amber' },
    { label: 'Total Posts', value: posts.length, icon: FileText, color: 'purple' },
    { label: 'Communities', value: communities.length, icon: BookOpen, color: 'sky' },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    sky: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  };

  const filteredUsers = useMemo(() => {
    let list = [...allUsers];

    if (userFilter === 'active') list = list.filter(u => !u.isSuspended);
    if (userFilter === 'suspended') list = list.filter(u => u.isSuspended);

    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      list = list.filter(u =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.college?.toLowerCase().includes(q) ||
        u.branch?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.fullName.localeCompare(b.fullName);
      if (sortBy === 'date') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'college') cmp = (a.college || '').localeCompare(b.college || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [allUsers, userSearch, userFilter, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return <ChevronDown size={11} className="opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  };

  const collegeAdmins = allUsers.filter(u => u.role === 'college_admin');
  const [caSearch, setCaSearch] = useState('');
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');

  const handleAssignCollegeAdmin = async (userId: string, college: string | null) => {
    setAssignLoading(true);
    try {
      const updated = await api.collegeAdmin.assign(userId, college);
      onAllUsersChange(allUsers.map(u => u.id === userId ? updated : u));
      setAssigningUserId(null);
      setAssignSuccess(college ? `${updated.fullName} is now admin of ${college}` : 'Role revoked');
      setTimeout(() => setAssignSuccess(''), 4000);
    } catch (err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleMergePreview = async () => {
    if (!mergeSourceId || !mergeDestinationId || mergeSourceId === mergeDestinationId) {
      setMergeError('Choose two different communities.');
      return;
    }
    setMergePreviewLoading(true);
    setMergeError('');
    setMergeAudit(null);
    setMergeConfirmText('');
    try {
      const preview = await api.communities.mergePreview(currentUser.id, mergeSourceId, mergeDestinationId);
      setMergePreview(preview);
    } catch (err: any) {
      setMergePreview(null);
      setMergeError(err.message || 'Could not load the merge preview.');
    } finally {
      setMergePreviewLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!mergePreview || mergeConfirmText.trim() !== mergePreview.destination.name) return;
    setMergeLoading(true);
    setMergeError('');
    try {
      const result = await api.communities.merge({
        actorId: currentUser.id,
        sourceId: mergePreview.source.id,
        destinationId: mergePreview.destination.id,
        sourceName: mergePreview.source.name,
        destinationName: mergePreview.destination.name,
        confirmText: mergeConfirmText.trim(),
      });
      setMergeAudit(result.audit);
      setMergeAudits(previous => [result.audit, ...previous].slice(0, 20));
      setMergePreview(null);
      setMergeConfirmText('');
      setMergeSourceId('');
      setMergeDestinationId('');
      const refreshedCommunities = await api.communities.getAll();
      onCommunitiesChange(refreshedCommunities);
    } catch (err: any) {
      setMergeError(err.message || 'The merge was not completed.');
    } finally {
      setMergeLoading(false);
    }
  };

  const tabs: { id: AdminTab; label: string; count?: number }[] = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'users', label: 'All Users', count: allUsers.length },
    { id: 'college_admins', label: 'College Admins', count: collegeAdmins.length },
    { id: 'reports', label: 'Reports', count: pendingReports.length },
    { id: 'posts', label: 'Post Moderation', count: posts.length },
    { id: 'community_merge', label: 'Merge Communities', count: communities.length },
    { id: 'import', label: 'CSV Import' },
    { id: 'email_inbox', label: 'Reply Inbox', count: emailInboxThreads.filter(thread => thread.isUnread).length },
    { id: 'email', label: 'Send Email' },
  ];

  return (
    <div className="space-y-6">

      {/* Header banner */}
      <div className={`p-5 rounded-2xl border border-rose-500/20 ${darkMode ? 'bg-rose-950/10' : 'bg-rose-500/[0.03]'}`}>
        <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1 text-rose-500">
          <ShieldAlert size={14} /> Admin Control Center
        </h2>
        <p className="text-xs opacity-75">
          Full database access — manage users, moderate content, and resolve incident reports.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map(s => (
          <div
            key={s.label}
            className={`p-4 rounded-2xl border ${colorMap[s.color]} flex flex-col gap-2`}
          >
            <s.icon size={16} />
            <p className="text-xl font-black leading-none">{s.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className={`rounded-2xl border border-neutral-200 dark:border-white/10 overflow-hidden ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
        <div className={`flex border-b border-neutral-200 dark:border-white/10 overflow-x-auto ${darkMode ? 'bg-[#09090C]' : 'bg-neutral-50'}`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-500'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-neutral-200 dark:bg-white/10 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <AdminAnalytics darkMode={darkMode} />
        )}

        {/* COMMUNITY MERGE TAB */}
        {activeTab === 'community_merge' && (
          <div className="p-4 space-y-5">
            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-amber-950/20 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-start gap-3">
                <LockKeyhole size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-black text-amber-700 dark:text-amber-300">Guarded duplicate cleanup</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-800/75 dark:text-amber-200/70">
                    Choose a source community to remove and a destination community to keep. Memberships, admins,
                    blocked members, posts, comments, discussions, resources, polls, saved links, chat messages,
                    and notification routes are preserved or retargeted in one transaction.
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border border-neutral-200 dark:border-white/10 ${darkMode ? 'bg-[#09090C]' : 'bg-neutral-50/50'}`}>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
                <label className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">Source · will be removed</span>
                  <select
                    value={mergeSourceId}
                    onChange={e => { setMergeSourceId(e.target.value); setMergePreview(null); setMergeError(''); }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-[#121217] border-white/10 text-slate-200' : 'bg-white border-neutral-200 text-slate-700'}`}
                  >
                    <option value="">Select source community</option>
                    {communities.slice().sort((a, b) => a.name.localeCompare(b.name)).map(community => (
                      <option key={community.id} value={community.id}>{community.name}</option>
                    ))}
                  </select>
                </label>
                <ArrowRight size={18} className="hidden md:block text-slate-400 mb-2" />
                <label className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Destination · will remain</span>
                  <select
                    value={mergeDestinationId}
                    onChange={e => { setMergeDestinationId(e.target.value); setMergePreview(null); setMergeError(''); }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-[#121217] border-white/10 text-slate-200' : 'bg-white border-neutral-200 text-slate-700'}`}
                  >
                    <option value="">Select destination community</option>
                    {communities.slice().sort((a, b) => a.name.localeCompare(b.name)).map(community => (
                      <option key={community.id} value={community.id}>{community.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                onClick={handleMergePreview}
                disabled={mergePreviewLoading || !mergeSourceId || !mergeDestinationId}
                className="mt-4 w-full md:w-auto py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <GitMerge size={14} />
                {mergePreviewLoading ? 'Loading review…' : 'Review merge'}
              </button>
              {mergeError && (
                <p className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-500">{mergeError}</p>
              )}
            </div>

            {mergePreview && (
              <div className={`rounded-2xl border border-indigo-500/20 overflow-hidden ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
                <div className={`p-4 border-b border-indigo-500/15 ${darkMode ? 'bg-indigo-500/5' : 'bg-indigo-50/60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Confirmation summary</p>
                      <h3 className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">
                        {mergePreview.source.name} <span className="text-indigo-500">→</span> {mergePreview.destination.name}
                      </h3>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Source content will move into the destination. Only the source community row will be removed.
                      </p>
                    </div>
                    <GitMerge size={22} className="text-indigo-500 shrink-0" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                  {[mergePreview.source, mergePreview.destination].map((community: any, index: number) => (
                    <div key={community.id} className={`p-3 rounded-xl border ${darkMode ? 'border-white/10 bg-[#09090C]' : 'border-neutral-200 bg-neutral-50/70'}`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className={`text-xs font-black truncate ${index === 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{community.name}</p>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{index === 0 ? 'Source' : 'Destination'}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mb-2">
                        Owner: <strong className="text-slate-700 dark:text-slate-300">{community.owner?.name || 'No assigned owner'}</strong>
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-500">
                        <span>Members <strong className="text-slate-700 dark:text-slate-300">{community.memberCount}</strong></span>
                        <span>Admins <strong className="text-slate-700 dark:text-slate-300">{community.adminCount}</strong></span>
                        <span>Blocked <strong className="text-slate-700 dark:text-slate-300">{community.blockedMemberCount}</strong></span>
                        <span>Posts <strong className="text-slate-700 dark:text-slate-300">{community.counts.posts}</strong></span>
                        <span>Comments <strong className="text-slate-700 dark:text-slate-300">{community.counts.comments}</strong></span>
                        <span>Chat messages <strong className="text-slate-700 dark:text-slate-300">{community.counts.chatMessages}</strong></span>
                        <span>Threads <strong className="text-slate-700 dark:text-slate-300">{community.threadCount}</strong></span>
                        <span>Resources <strong className="text-slate-700 dark:text-slate-300">{community.resourceCount}</strong></span>
                        <span>Polls <strong className="text-slate-700 dark:text-slate-300">{community.pollCount}</strong></span>
                        <span>Saved links <strong className="text-slate-700 dark:text-slate-300">{community.counts.savedCommunityLinks}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`mx-4 mb-4 p-3 rounded-xl border border-amber-500/20 ${darkMode ? 'bg-amber-500/5' : 'bg-amber-50/70'}`}>
                  <p className="text-[10px] leading-relaxed text-amber-800/80 dark:text-amber-200/75">
                    <strong>Audit:</strong> {mergePreview.auditPlan.message} It will include both owners, all reviewed counts,
                    the actor, and the final result.
                  </p>
                </div>

                <div className="p-4 border-t border-neutral-200 dark:border-white/10">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Type the destination name to authorize
                    <input
                      value={mergeConfirmText}
                      onChange={e => setMergeConfirmText(e.target.value)}
                      placeholder={mergePreview.destination.name}
                      className={`mt-1.5 w-full px-3 py-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-[#09090C] border-white/10 text-slate-200' : 'bg-white border-neutral-200 text-slate-700'}`}
                    />
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <button
                      onClick={handleMerge}
                      disabled={mergeLoading || mergeConfirmText.trim() !== mergePreview.destination.name}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      <LockKeyhole size={13} />
                      {mergeLoading ? 'Merging atomically…' : 'Confirm permanent merge'}
                    </button>
                    <button
                      onClick={() => { setMergePreview(null); setMergeConfirmText(''); }}
                      disabled={mergeLoading}
                      className="py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-white/10 text-[10px] font-bold uppercase cursor-pointer hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mergeAudit && (
              <div className={`p-4 rounded-2xl border border-emerald-500/25 ${darkMode ? 'bg-emerald-950/20' : 'bg-emerald-50'}`}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">Merge completed and audited</p>
                    <p className="mt-1 text-[10px] text-emerald-800/75 dark:text-emerald-200/70">
                      Audit record <code className="font-mono">{mergeAudit.id}</code> confirms that {mergeAudit.sourceName} was merged into {mergeAudit.destinationName}.
                    </p>
                    <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-black/10 dark:bg-black/20 p-3 text-[9px] leading-relaxed text-emerald-900 dark:text-emerald-100">{JSON.stringify(mergeAudit.summary, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}

            <div className={`rounded-2xl border border-neutral-200 dark:border-white/10 overflow-hidden ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
              <div className={`p-4 border-b border-neutral-200 dark:border-white/10 flex items-center gap-2 ${darkMode ? 'bg-[#09090C]' : 'bg-neutral-50'}`}>
                <History size={15} className="text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent merge audit records</h3>
              </div>
              {mergeAudits.length === 0 ? (
                <p className="p-5 text-center text-[10px] font-mono text-slate-400">No community merges have been recorded.</p>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-white/5">
                  {mergeAudits.map(audit => (
                    <div key={audit.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px]">
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300">{audit.sourceName} <span className="text-indigo-500">→</span> {audit.destinationName}</p>
                        <p className="mt-0.5 text-slate-400 font-mono">{audit.id} · {audit.createdAt ? new Date(audit.createdAt).toLocaleString() : '—'}</p>
                      </div>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Atomic merge</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="p-4 space-y-4">
            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border text-xs ${darkMode ? 'bg-[#09090C] border-white/10' : 'bg-neutral-50 border-neutral-200'}`}>
                <Search size={13} className="opacity-40 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by name, email, college, branch..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="bg-transparent outline-none w-full placeholder:text-slate-400 text-xs"
                />
                {userSearch && (
                  <button onClick={() => setUserSearch('')} className="opacity-40 hover:opacity-80 cursor-pointer">
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5">
                {(['all', 'active', 'suspended'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setUserFilter(f)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                      userFilter === f
                        ? f === 'suspended' ? 'bg-rose-500 text-white border-transparent' : 'bg-indigo-500 text-white border-transparent'
                        : 'border-neutral-200 dark:border-white/10 text-slate-500 hover:border-indigo-400 hover:text-indigo-500'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] font-mono text-slate-400">
              Showing {filteredUsers.length} of {allUsers.length} users
            </p>

            {/* Users table */}
            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-white/10">
              <table className="w-full text-left border-collapse text-xs min-w-[640px]">
                <thead>
                  <tr className={`border-b border-neutral-200 dark:border-white/10 text-[9px] font-bold uppercase tracking-widest ${darkMode ? 'bg-[#09090C] text-slate-500' : 'bg-neutral-50 text-slate-400'}`}>
                    <th className="p-3">
                      <button onClick={() => toggleSort('name')} className="flex items-center gap-1 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                        User <SortIcon col="name" />
                      </button>
                    </th>
                    <th className="p-3">
                      <button onClick={() => toggleSort('college')} className="flex items-center gap-1 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                        College / Branch <SortIcon col="college" />
                      </button>
                    </th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Year</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">
                      <button onClick={() => toggleSort('date')} className="flex items-center gap-1 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                        Joined <SortIcon col="date" />
                      </button>
                    </th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-neutral-100 dark:divide-white/5`}>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-slate-400 font-mono">
                        No users match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr
                        key={user.id}
                        className={`transition-colors ${user.isSuspended
                          ? darkMode ? 'bg-rose-500/[0.03]' : 'bg-rose-50/50'
                          : darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-neutral-50/70'
                        } ${user.id === currentUser.id ? 'opacity-50' : ''}`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border ${darkMode ? 'bg-zinc-900 text-white border-white/10' : 'bg-slate-100 text-slate-800 border-neutral-200'}`}>
                              <Avatar avatar={user.avatar} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                                {user.fullName}
                                {user.id === currentUser.id && (
                                  <span className="text-[8px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded-full font-bold uppercase">You</span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">{user.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">{user.college || '—'}</p>
                          <p className="text-[10px] text-slate-400">{user.branch || '—'}</p>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                            <Mail size={10} className="opacity-50" /> {user.email}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-[11px] text-slate-500">
                            {getEducationDisplay(user).compact}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[9px] font-bold uppercase border ${
                            user.role === 'admin'
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                          }`}>
                            {user.role === 'admin' ? <ShieldCheck size={9} /> : <GraduationCap size={9} />}
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Calendar size={10} className="opacity-50" />
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                          </span>
                        </td>
                        <td className="p-3">
                          {user.isSuspended ? (
                            <span className="inline-block py-0.5 px-2 rounded-full border border-rose-500/20 text-[9px] font-bold uppercase text-rose-500 bg-rose-500/5">
                              Suspended
                            </span>
                          ) : (
                            <span className="inline-block py-0.5 px-2 rounded-full border border-emerald-500/20 text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1.5 items-end">
                            {resetSuccess === user.id && (
                              <span className="text-[9px] font-bold text-emerald-500 uppercase">✓ Password Updated</span>
                            )}

                            {resetUserId === user.id ? (
                              <div className={`flex items-center gap-1.5 p-2 rounded-xl border ${darkMode ? 'bg-[#09090C] border-white/10' : 'bg-neutral-50 border-neutral-200'}`}>
                                <div className="relative">
                                  <input
                                    type={resetShowPw ? 'text' : 'password'}
                                    placeholder="New password"
                                    value={resetPassword}
                                    onChange={e => setResetPassword(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleResetPassword(user.id)}
                                    className="bg-transparent outline-none text-xs w-28 pr-5"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => setResetShowPw(p => !p)}
                                    className="absolute right-0 top-0 opacity-40 hover:opacity-80 cursor-pointer"
                                  >
                                    {resetShowPw ? <EyeOff size={11} /> : <Eye size={11} />}
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleResetPassword(user.id)}
                                  disabled={resetLoading || resetPassword.length < 8}
                                  className="py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold uppercase cursor-pointer disabled:opacity-40 transition-colors"
                                >
                                  {resetLoading ? '...' : 'Set'}
                                </button>
                                <button
                                  onClick={() => { setResetUserId(null); setResetPassword(''); }}
                                  className="opacity-40 hover:opacity-80 cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => { setResetUserId(user.id); setResetPassword(''); setResetShowPw(false); }}
                                  className="py-1 px-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10 transition-all cursor-pointer flex items-center gap-1"
                                  title="Reset Password"
                                >
                                  <KeyRound size={10} /> Reset PW
                                </button>
                                {user.id !== currentUser.id && user.role !== 'admin' && (
                                  <button
                                    onClick={() => onToggleUserSuspension(user.id)}
                                    className={`py-1 px-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                      user.isSuspended
                                        ? 'bg-emerald-600 border-transparent text-white hover:bg-emerald-700'
                                        : 'bg-transparent border-rose-500/30 text-rose-500 hover:bg-rose-500/10'
                                    }`}
                                  >
                                    {user.isSuspended ? 'Restore' : 'Suspend'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COLLEGE ADMINS TAB */}
        {activeTab === 'college_admins' && (
          <div className="p-4 space-y-4">
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Crown size={13} />
                Assign a student from any college as the College Admin. They will get a dedicated panel to manage announcements, clubs and members for their college.
              </p>
            </div>

            {assignSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold">
                <CheckCircle2 size={13} /> {assignSuccess}
              </div>
            )}

            {/* Current college admins */}
            {collegeAdmins.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Current College Admins</p>
                {collegeAdmins.map(u => (
                  <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border ${darkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                    <Avatar avatar={u.avatar} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{u.fullName}</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                        <Crown size={9} /> Admin of: {u.collegeAdminOf}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAssignCollegeAdmin(u.id, null)}
                      disabled={assignLoading}
                      className="py-1 px-2.5 rounded-xl text-[10px] font-bold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Assign new */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assign New College Admin</p>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${darkMode ? 'bg-[#09090C] border-white/10' : 'bg-neutral-50 border-neutral-200'}`}>
                <Search size={13} className="opacity-40 shrink-0" />
                <input
                  type="text"
                  placeholder="Search students by name, college..."
                  value={caSearch}
                  onChange={e => setCaSearch(e.target.value)}
                  className="bg-transparent outline-none w-full placeholder:text-slate-400 text-xs"
                />
              </div>

              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {allUsers
                  .filter(u => u.role !== 'admin' && u.role !== 'college_admin' && !u.isSuspended)
                  .filter(u => {
                    if (!caSearch.trim()) return true;
                    const q = caSearch.toLowerCase();
                    return u.fullName.toLowerCase().includes(q) || u.college.toLowerCase().includes(q);
                  })
                  .map(u => (
                    <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-neutral-50 border-neutral-200 hover:bg-white'}`}>
                      <Avatar avatar={u.avatar} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{u.fullName}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Building2 size={9} /> {u.college}
                        </p>
                      </div>
                      {assigningUserId === u.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500">Assign for:</span>
                          <button
                            onClick={() => handleAssignCollegeAdmin(u.id, u.college)}
                            disabled={assignLoading}
                            className="py-1 px-2.5 rounded-xl text-[10px] font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {assignLoading ? '...' : u.college}
                          </button>
                          <button
                            onClick={() => setAssigningUserId(null)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningUserId(u.id)}
                          className="py-1 px-2.5 rounded-xl text-[10px] font-bold border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Crown size={10} /> Make Admin
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="p-4 space-y-4">
            {reports.length === 0 ? (
              <div className="p-10 text-center text-xs font-mono text-slate-400">
                <ShieldCheck size={28} className="mx-auto mb-3 text-emerald-500 opacity-60" />
                No incident reports filed.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map(report => {
                  const reporter = allUsers.find(u => u.id === report.reporterId);
                  const reported = allUsers.find(u => u.id === report.reportedUserId);
                  if (!reported) return null;
                  return (
                    <div
                      key={report.id}
                      className={`p-5 rounded-2xl border border-neutral-200 dark:border-white/10 space-y-3 text-xs ${darkMode ? 'bg-[#09090C]' : 'bg-neutral-50/50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="py-0.5 px-2 rounded-full font-bold text-[8.5px] uppercase tracking-wide border border-rose-500/20 text-rose-500 bg-rose-500/5">
                          {report.reason}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          report.status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                          report.status === 'suspended' ? 'bg-rose-500/10 text-rose-500' :
                          'bg-neutral-200 dark:bg-white/10 text-slate-400'
                        }`}>
                          {report.status}
                        </span>
                      </div>

                      <p className={`text-[11px] leading-snug p-3 rounded-xl border italic ${darkMode ? 'bg-[#121217] border-white/5 text-zinc-300' : 'bg-white border-neutral-100 text-neutral-700'}`}>
                        "{report.description}"
                      </p>

                      <div className="space-y-1 text-[10px] text-slate-400">
                        <p>Filed by: <strong className="text-slate-700 dark:text-slate-300">{reporter?.fullName || 'Unknown'}</strong></p>
                        <p>Against: <strong className="text-rose-500">{reported.fullName}</strong> — {reported.college}</p>
                        <p className="font-mono">{new Date(report.createdAt).toLocaleString()}</p>
                      </div>

                      {report.status === 'pending' && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => onResolveReport(report.id, 'dismissed')}
                            className="flex-1 py-1.5 px-3 rounded-xl border border-neutral-200 dark:border-white/10 font-bold text-[10px] uppercase cursor-pointer hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => { onToggleUserSuspension(reported.id); onResolveReport(report.id, 'suspended'); }}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase cursor-pointer transition-colors"
                          >
                            Suspend User
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* POSTS TAB */}
        {activeTab === 'posts' && (
          <div className="p-4 space-y-4">
            {posts.length === 0 ? (
              <div className="p-10 text-center text-xs font-mono text-slate-400">
                No posts to moderate.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts.map(post => {
                  const author = allUsers.find(u => u.id === post.authorId);
                  if (!author) return null;
                  return (
                    <div
                      key={post.id}
                      className={`p-4 rounded-2xl border border-neutral-200 dark:border-white/10 flex flex-col justify-between gap-3 text-xs ${darkMode ? 'bg-[#09090C]' : 'bg-neutral-50/50'}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-dashed border-neutral-200 dark:border-white/5">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0 ${darkMode ? 'bg-zinc-800 text-white' : 'bg-slate-100 text-slate-800'}`}>
                              <Avatar avatar={author.avatar} />
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{author.fullName}</span>
                          </div>
                          <span className="font-mono text-[9px] text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className={`italic text-[11px] leading-relaxed line-clamp-3 ${darkMode ? 'text-zinc-300' : 'text-neutral-600'}`}>
                          "{post.content}"
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-dashed border-neutral-200 dark:border-white/5 pt-2.5">
                        <span className="font-mono text-[9px] text-indigo-500 font-bold uppercase">{post.academicTag}</span>
                        <button
                          onClick={() => onDeletePost(post.id)}
                          className="py-1 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 size={10} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {/* EMAIL INBOX TAB */}
        {activeTab === 'email_inbox' && (
          <div className="p-4 space-y-4">
            <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl border ${darkMode ? 'bg-[#09090C] border-white/10' : 'bg-indigo-50 border-indigo-100'}`}>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                  <Inbox size={13} /> Reply Inbox
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Incoming replies from your Gmail mailbox appear here. Replies stay in the original email thread.
                </p>
                {emailInboxAccount && (
                  <p className="text-[10px] font-mono text-slate-400 mt-2">{emailInboxAccount}</p>
                )}
              </div>
              <button
                onClick={() => void handleLoadEmailInbox()}
                disabled={loadingEmailInbox}
                className="self-start sm:self-auto shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/10 disabled:opacity-50 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              >
                <RefreshCw size={12} className={loadingEmailInbox ? 'animate-spin' : ''} />
                Refresh inbox
              </button>
            </div>

            {emailInboxError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>{emailInboxError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)] gap-4 min-h-[560px]">
              <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-[#09090C] border-white/10' : 'bg-white border-neutral-200'}`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-white/10">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Incoming threads</p>
                    <p className="text-xs font-bold mt-1">{emailInboxThreads.length} recent conversations</p>
                  </div>
                  {emailInboxThreads.some(thread => thread.isUnread) && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">
                      {emailInboxThreads.filter(thread => thread.isUnread).length} unread
                    </span>
                  )}
                </div>
                <div className="max-h-[620px] overflow-y-auto divide-y divide-neutral-100 dark:divide-white/5">
                  {loadingEmailInbox && emailInboxThreads.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Loader2 size={20} className="mx-auto animate-spin mb-2" />
                      <p className="text-xs">Loading inbox…</p>
                    </div>
                  ) : emailInboxThreads.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <MessageCircle size={22} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No recent incoming replies.</p>
                    </div>
                  ) : (
                    emailInboxThreads.map(thread => (
                      <button
                        key={thread.id}
                        onClick={() => void handleOpenEmailThread(thread.id)}
                        className={`w-full text-left p-4 transition-colors cursor-pointer ${
                          selectedEmailThread?.id === thread.id
                            ? darkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'
                            : darkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${thread.isUnread ? 'bg-indigo-500' : 'bg-transparent'}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-xs truncate ${thread.isUnread ? 'font-black' : 'font-semibold'}`}>
                                {thread.latestSender || 'Unknown sender'}
                              </p>
                              <span className="text-[9px] text-slate-400 whitespace-nowrap">
                                {new Date(thread.latestDate).toLocaleDateString()}
                              </span>
                            </div>
                            <p className={`text-[11px] truncate mt-1 ${thread.isUnread ? 'font-bold' : 'font-medium'} text-slate-700 dark:text-slate-300`}>
                              {thread.subject}
                            </p>
                            <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                              {thread.latestSnippet || 'No preview available'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className={`rounded-2xl border overflow-hidden flex flex-col ${darkMode ? 'bg-[#09090C] border-white/10' : 'bg-white border-neutral-200'}`}>
                {!selectedEmailThread ? (
                  <div className="flex-1 min-h-[420px] flex flex-col items-center justify-center text-center text-slate-400 p-8">
                    <Inbox size={34} className="mb-3 opacity-30" />
                    <p className="text-sm font-bold">Select a conversation</p>
                    <p className="text-xs mt-1">Read a student reply and respond from the same thread.</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b border-neutral-200 dark:border-white/10">
                      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Conversation</p>
                      <h4 className="text-sm font-black mt-1">{selectedEmailThread.subject}</h4>
                    </div>
                    <div className="flex-1 max-h-[470px] overflow-y-auto p-4 space-y-3">
                      {selectedEmailThread.messages.map(message => (
                        <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[92%] rounded-2xl px-4 py-3 border ${
                            message.direction === 'outbound'
                              ? darkMode ? 'bg-indigo-500/15 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'
                              : darkMode ? 'bg-white/[0.03] border-white/10' : 'bg-neutral-50 border-neutral-200'
                          }`}>
                            <div className="flex items-center justify-between gap-4 mb-2">
                              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">{message.from || 'The Network'}</p>
                              <span className="text-[9px] text-slate-400 whitespace-nowrap">{new Date(message.date).toLocaleString()}</span>
                            </div>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                              {message.body || message.snippet || 'No message body available.'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-neutral-200 dark:border-white/10 p-4">
                      <textarea
                        value={emailReplyBody}
                        onChange={e => setEmailReplyBody(e.target.value)}
                        placeholder="Write a reply to this student…"
                        rows={4}
                        className={`w-full rounded-xl border px-3 py-2.5 text-xs outline-none resize-y leading-relaxed ${darkMode ? 'bg-[#121217] border-white/10 text-slate-200 placeholder:text-slate-600' : 'bg-white border-neutral-200 text-slate-800 placeholder:text-slate-300'}`}
                      />
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={() => void handleSendEmailReply()}
                          disabled={sendingEmailReply || !emailReplyBody.trim()}
                          className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-2"
                        >
                          {sendingEmailReply ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                          {sendingEmailReply ? 'Sending…' : 'Send reply'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* EMAIL TAB */}
        {activeTab === 'email' && (
          <div className="p-5 space-y-5">

            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#09090C] border-white/10' : 'bg-indigo-50 border-indigo-100'}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1 flex items-center gap-1.5">
                <Mail size={13} /> Send Email to Students
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Send a formatted email from your Gmail account directly to student college IDs.
              </p>
            </div>

            {/* Mode selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setEmailMode('all')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${emailMode === 'all' ? 'bg-indigo-600 text-white border-transparent' : 'border-neutral-200 dark:border-white/10 text-slate-500 hover:border-indigo-400 hover:text-indigo-500'}`}
              >
                All Students ({allUsers.length})
              </button>
              <button
                onClick={() => setEmailMode('custom')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${emailMode === 'custom' ? 'bg-indigo-600 text-white border-transparent' : 'border-neutral-200 dark:border-white/10 text-slate-500 hover:border-indigo-400 hover:text-indigo-500'}`}
              >
                Specific Emails
              </button>
            </div>

            {/* Custom recipient box */}
            {emailMode === 'custom' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Addresses (one per line or comma-separated)
                </label>
                <textarea
                  value={emailCustomTo}
                  onChange={e => setEmailCustomTo(e.target.value)}
                  placeholder="107124072@nitt.edu&#10;107124073@nitt.edu&#10;107124074@nitt.edu"
                  rows={4}
                  className={`w-full rounded-xl border px-3 py-2.5 text-xs font-mono outline-none resize-none ${darkMode ? 'bg-[#09090C] border-white/10 text-slate-200 placeholder:text-slate-600' : 'bg-white border-neutral-200 text-slate-800 placeholder:text-slate-300'}`}
                />
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder="Welcome to The Network — NIT Tiruchirappalli"
                className={`w-full rounded-xl border px-3 py-2.5 text-xs outline-none ${darkMode ? 'bg-[#09090C] border-white/10 text-slate-200 placeholder:text-slate-600' : 'bg-white border-neutral-200 text-slate-800 placeholder:text-slate-300'}`}
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Message Body</label>
              <textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                placeholder={`Hi,\n\nYou are invited to join The Network — the campus co-founder and collaboration platform for NIT Tiruchirappalli students.\n\nSign up at: https://your-app.replit.app\n\nYour login email is your college email ID.\n\nRegards,\nThe Network Team`}
                rows={10}
                className={`w-full rounded-xl border px-3 py-2.5 text-xs outline-none resize-y font-mono leading-relaxed ${darkMode ? 'bg-[#09090C] border-white/10 text-slate-200 placeholder:text-slate-600' : 'bg-white border-neutral-200 text-slate-800 placeholder:text-slate-300'}`}
              />
            </div>

            {/* Error */}
            {emailError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>{emailError}</p>
              </div>
            )}

            {/* Result */}
            {emailResult && (
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">Emails Sent!</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-100/60'}`}>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{emailResult.sent}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-500 mt-0.5">Delivered</p>
                  </div>
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-rose-900/20' : 'bg-rose-50'}`}>
                    <p className="text-2xl font-black text-rose-500">{emailResult.failed}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-rose-600 mt-0.5">Failed</p>
                  </div>
                </div>
                {emailResult.errors.length > 0 && (
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    {emailResult.errors.slice(0, 5).map((e, i) => (
                      <p key={i} className="text-[10px] font-mono text-rose-400">{e}</p>
                    ))}
                  </div>
                )}
                <button onClick={() => setEmailResult(null)} className="mt-3 text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer">
                  Send another email
                </button>
              </div>
            )}

            {!emailResult && (
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim()}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending emails...
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    {emailMode === 'all' ? `Send to All ${allUsers.length} Students` : 'Send to Selected Emails'}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* CSV IMPORT TAB */}
        {activeTab === 'import' && (
          <div className="p-5 space-y-5">

            {/* Instructions + template download */}
            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#09090C] border-white/10' : 'bg-indigo-50 border-indigo-100'}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-2 flex items-center gap-1.5">
                <Upload size={13} /> Bulk Student Import via CSV
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                Upload a CSV file with your student data. Required columns: <code className="bg-indigo-500/10 text-indigo-500 px-1 rounded">full_name</code>, <code className="bg-indigo-500/10 text-indigo-500 px-1 rounded">email</code>. Optional: <code className="bg-neutral-200 dark:bg-white/10 px-1 rounded">password</code>, <code className="bg-neutral-200 dark:bg-white/10 px-1 rounded">college</code>, <code className="bg-neutral-200 dark:bg-white/10 px-1 rounded">branch</code>, <code className="bg-neutral-200 dark:bg-white/10 px-1 rounded">year</code>.
              </p>
              <p className="text-[10px] text-slate-400 mb-3">
                If no password column is provided, the part before <code>@</code> in their email is used as the default password (e.g. <code>107124072@nitt.edu</code> → password is <code>107124072</code>).
              </p>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
              >
                <Download size={11} /> Download Template CSV
              </button>
            </div>

            {/* Drop zone */}
            {!csvRows.length && !importResult && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-500/5'
                    : darkMode ? 'border-white/10 hover:border-white/20' : 'border-neutral-300 hover:border-indigo-400'
                }`}
              >
                <Upload size={28} className={`mx-auto mb-3 ${dragOver ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'}`} />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Drag & drop your CSV file here
                </p>
                <p className="text-xs text-slate-400 mb-4">or</p>
                <label className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors">
                  Browse File
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                  />
                </label>
              </div>
            )}

            {/* Error */}
            {csvError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>{csvError}</p>
              </div>
            )}

            {/* Preview table */}
            {csvRows.length > 0 && !importResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Preview — <span className="text-indigo-500">{csvRows.length} students</span> ready to import
                  </p>
                  <button
                    onClick={() => { setCsvRows([]); setCsvRaw(''); setCsvError(''); }}
                    className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer flex items-center gap-1"
                  >
                    <X size={11} /> Clear
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-white/10 max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className={`sticky top-0 border-b border-neutral-200 dark:border-white/10 text-[9px] font-bold uppercase tracking-widest ${darkMode ? 'bg-[#09090C] text-slate-500' : 'bg-neutral-50 text-slate-400'}`}>
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Full Name</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">Password</th>
                        <th className="p-2.5">College</th>
                        <th className="p-2.5">Branch</th>
                        <th className="p-2.5">Year</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                      {csvRows.slice(0, 100).map((r, i) => (
                        <tr key={i} className={darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-neutral-50'}>
                          <td className="p-2.5 font-mono text-slate-400">{i + 1}</td>
                          <td className="p-2.5 font-semibold">{r.fullName}</td>
                          <td className="p-2.5 font-mono text-slate-500">{r.email}</td>
                          <td className="p-2.5 font-mono text-slate-400">
                            {r.password ? <span className="text-emerald-500">✓ set</span> : <span className="text-amber-500">→ {r.email.split('@')[0]}</span>}
                          </td>
                          <td className="p-2.5 text-slate-500">{r.college || '—'}</td>
                          <td className="p-2.5 text-slate-500">{r.branch || '—'}</td>
                          <td className="p-2.5 text-slate-500">{r.year || '1'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvRows.length > 100 && (
                    <p className="text-center text-[10px] text-slate-400 p-3 border-t border-neutral-100 dark:border-white/5">
                      + {csvRows.length - 100} more rows (all will be imported)
                    </p>
                  )}
                </div>

                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing {csvRows.length} students...
                    </>
                  ) : (
                    <>
                      <Upload size={14} /> Import {csvRows.length} Students into Database
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Success result */}
            {importResult && (
              <div className="space-y-3">
                <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <h3 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">Import Complete</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-100/60'}`}>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{importResult.inserted}</p>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-500 uppercase text-[10px] tracking-wide mt-0.5">Students Added</p>
                    </div>
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
                      <p className="text-2xl font-black text-amber-500">{importResult.skipped}</p>
                      <p className="font-semibold text-amber-600 uppercase text-[10px] tracking-wide mt-0.5">Skipped / Duplicates</p>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <p className="text-[10px] font-bold text-rose-500 uppercase mb-1">Errors ({importResult.errors.length})</p>
                      {importResult.errors.slice(0, 5).map((e, i) => (
                        <p key={i} className="text-[10px] font-mono text-rose-400">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setImportResult(null); setCsvRows([]); setCsvRaw(''); setCsvError(''); }}
                  className="py-2 px-4 rounded-xl border border-neutral-200 dark:border-white/10 text-xs font-bold cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
                >
                  Import Another File
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
