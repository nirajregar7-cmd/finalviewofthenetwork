import React, { useState, useEffect, useMemo } from 'react';
import { CampusEvent, UserProfile } from '../types';
import { api } from '../api';
import {
  Calendar, Plus, X, Search, MapPin, Clock, Users, Globe,
  Rocket, BookOpen, Mic, Trophy, Music, Dumbbell, Pencil, Trash2,
  CheckCircle2, ExternalLink, ArrowRight, ChevronLeft, Zap, Award, Link,
  Ticket, Flame, Star, ChevronRight, Filter, PartyPopper, Sparkles
} from 'lucide-react';
import Avatar from './Avatar';

interface EventsSectionProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  darkMode: boolean;
  onViewUserProfile?: (userId: string) => void;
}

const EVENT_CATEGORIES = ['Hackathon', 'Study Group', 'Seminar', 'Workshop', 'Cultural', 'Sports', 'Social', 'General'];

// Poster-grade gradient per category
const CAT_GRADIENT: Record<string, string> = {
  Hackathon:    'from-orange-500 via-rose-500 to-pink-600',
  'Study Group':'from-blue-500 via-indigo-500 to-violet-600',
  Seminar:      'from-violet-500 via-purple-500 to-fuchsia-600',
  Workshop:     'from-cyan-500 via-teal-500 to-emerald-600',
  Cultural:     'from-pink-500 via-rose-500 to-orange-400',
  Sports:       'from-emerald-500 via-green-500 to-teal-600',
  Social:       'from-amber-500 via-yellow-400 to-orange-500',
  General:      'from-indigo-500 via-blue-500 to-cyan-500',
  Fest:         'from-fuchsia-500 via-pink-500 to-rose-500',
};

const CAT_SOLID: Record<string, string> = {
  Hackathon:    'bg-orange-500',
  'Study Group':'bg-indigo-500',
  Seminar:      'bg-violet-500',
  Workshop:     'bg-cyan-500',
  Cultural:     'bg-pink-500',
  Sports:       'bg-emerald-500',
  Social:       'bg-amber-500',
  General:      'bg-blue-500',
};

const CAT_PILL: Record<string, string> = {
  Hackathon:    'bg-orange-500/12 text-orange-500 border-orange-500/25',
  'Study Group':'bg-indigo-500/12 text-indigo-500 border-indigo-500/25',
  Seminar:      'bg-violet-500/12 text-violet-500 border-violet-500/25',
  Workshop:     'bg-cyan-500/12 text-cyan-500 border-cyan-500/25',
  Cultural:     'bg-pink-500/12 text-pink-500 border-pink-500/25',
  Sports:       'bg-emerald-500/12 text-emerald-500 border-emerald-500/25',
  Social:       'bg-amber-500/12 text-amber-500 border-amber-500/25',
  General:      'bg-blue-500/12 text-blue-500 border-blue-500/25',
};

const CAT_ICON: Record<string, React.ReactNode> = {
  Hackathon:    <Rocket size={12} />,
  'Study Group':<BookOpen size={12} />,
  Seminar:      <Mic size={12} />,
  Workshop:     <Zap size={12} />,
  Cultural:     <Music size={12} />,
  Sports:       <Dumbbell size={12} />,
  Social:       <Users size={12} />,
  General:      <Calendar size={12} />,
};

// Simplified tab labels shown in the filter strip
const TABS = [
  { key: 'All',         label: 'Everything',  icon: <Sparkles size={11} /> },
  { key: 'Hackathon',   label: 'Hackathons',  icon: <Rocket size={11} /> },
  { key: 'Cultural',    label: 'Fests',       icon: <PartyPopper size={11} /> },
  { key: 'Sports',      label: 'Sports',      icon: <Dumbbell size={11} /> },
  { key: 'Workshop',    label: 'Workshops',   icon: <Zap size={11} /> },
  { key: 'Study Group', label: 'Study',       icon: <BookOpen size={11} /> },
  { key: 'Seminar',     label: 'Seminars',    icon: <Mic size={11} /> },
  { key: 'Social',      label: 'Social',      icon: <Users size={11} /> },
];

interface EventFormState {
  title: string; description: string; category: string;
  date: string; time: string; venue: string; organizer: string;
  college: string; maxSeats: string; isOnline: boolean; link: string;
}
const blank: EventFormState = {
  title: '', description: '', category: 'General', date: '', time: '',
  venue: '', organizer: '', college: '', maxSeats: '', isOnline: false, link: '',
};

function catGradient(cat: string) {
  return CAT_GRADIENT[cat] || 'from-indigo-500 via-blue-500 to-purple-600';
}

// ─── Event Poster Card ────────────────────────────────────────────────────────
function EventPosterCard({
  ev, currentUser, darkMode,
  onOpen, onRegister,
}: {
  ev: CampusEvent;
  currentUser: UserProfile;
  darkMode: boolean;
  onOpen: () => void;
  onRegister: () => void;
}) {
  const isRegistered = ev.registeredIds.includes(currentUser.id);
  const isOrganizer  = ev.organizerId === currentUser.id;
  const spotsLeft    = ev.maxSeats ? ev.maxSeats - ev.registeredIds.length : null;
  const isFull       = spotsLeft !== null && spotsLeft <= 0 && !isRegistered;

  return (
    <div
      className={`group relative rounded-3xl overflow-hidden border flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] ${
        darkMode ? 'bg-[#0f0f15] border-white/10 hover:border-white/20' : 'bg-white border-neutral-200/80 hover:border-neutral-300 shadow-sm'
      }`}
      onClick={onOpen}
    >
      {/* Poster banner */}
      <div className={`relative h-32 bg-gradient-to-br ${catGradient(ev.category)} flex flex-col justify-between p-4`}>
        {/* Decorative circles */}
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/8 pointer-events-none" />
        <div className="absolute -right-2 top-10 w-16 h-16 rounded-full bg-white/6 pointer-events-none" />

        <div className="relative flex items-start justify-between">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-sm`}>
            {CAT_ICON[ev.category]}
            {ev.category}
          </span>
          {ev.isOnline && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-bold backdrop-blur-sm">
              🌐 Online
            </span>
          )}
        </div>

        <div className="relative">
          <h3 className="font-black text-white text-sm leading-snug line-clamp-2 drop-shadow-sm">
            {ev.title}
          </h3>
          {isRegistered && (
            <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-white/90">
              <CheckCircle2 size={9} />You're going
            </span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-2.5 p-4 flex-1">
        {/* Date/time/venue */}
        <div className="space-y-1">
          <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <Calendar size={10} className="text-indigo-500 shrink-0" />
            {ev.date}{ev.time && ` · ${ev.time}`}
          </div>
          {ev.venue && (
            <div className={`flex items-center gap-1.5 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <MapPin size={10} className="text-rose-500 shrink-0" />
              <span className="truncate">{ev.venue}</span>
            </div>
          )}
          {ev.college && (
            <div className={`flex items-center gap-1.5 text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Award size={10} className="text-amber-500 shrink-0" />
              <span className="truncate">{ev.college}</span>
            </div>
          )}
        </div>

        <p className={`text-[10px] leading-relaxed line-clamp-2 flex-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {ev.description}
        </p>

        {/* Footer: attendees + register */}
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-neutral-100 dark:border-white/5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="flex -space-x-1 shrink-0">
              {[...Array(Math.min(3, ev.registeredIds.length))].map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full border ${darkMode ? 'border-[#0f0f15] bg-indigo-800' : 'border-white bg-indigo-100'}`} />
              ))}
            </div>
            <span className={`text-[9px] font-mono truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {ev.registeredIds.length}{ev.maxSeats ? `/${ev.maxSeats}` : ''} going
              {isFull && <span className="text-rose-500 font-bold ml-1">· FULL</span>}
            </span>
          </div>

          {!isOrganizer ? (
            <button
              onClick={e => { e.stopPropagation(); onRegister(); }}
              disabled={isFull && !isRegistered}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all touch-manipulation ${
                isRegistered
                  ? 'bg-emerald-500/15 text-emerald-500 active:bg-rose-500/15 active:text-rose-500'
                  : isFull
                    ? 'bg-neutral-100 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                    : `bg-gradient-to-r ${catGradient(ev.category)} text-white shadow-sm active:opacity-80`
              }`}
            >
              {isRegistered ? '✓ Going' : isFull ? 'Full' : 'Register'}
            </button>
          ) : (
            <span className="text-[9px] font-bold text-amber-500 shrink-0">Your event</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Featured / Hero Event Card ───────────────────────────────────────────────
function FeaturedEventCard({
  ev, currentUser, darkMode, onOpen, onRegister,
}: {
  ev: CampusEvent; currentUser: UserProfile; darkMode: boolean;
  onOpen: () => void; onRegister: () => void;
}) {
  const isRegistered = ev.registeredIds.includes(currentUser.id);
  const isOrganizer  = ev.organizerId === currentUser.id;
  const spotsLeft    = ev.maxSeats ? ev.maxSeats - ev.registeredIds.length : null;
  const isFull       = spotsLeft !== null && spotsLeft <= 0 && !isRegistered;

  return (
    <div
      onClick={onOpen}
      className={`relative rounded-3xl overflow-hidden cursor-pointer transition-all active:scale-[0.99] bg-gradient-to-br ${catGradient(ev.category)}`}
      style={{ minHeight: 200 }}
    >
      {/* Big decorative orbs */}
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute right-4 bottom-4 w-28 h-28 rounded-full bg-black/10 pointer-events-none" />

      <div className="relative p-5 flex flex-col justify-between h-full gap-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-widest w-fit">
              <Flame size={9} />Featured Event
            </span>
            <h2 className="text-white font-black text-lg leading-tight max-w-[80%] drop-shadow-sm">{ev.title}</h2>
          </div>
          {ev.isOnline && (
            <span className="px-2 py-1 rounded-full bg-white/20 text-white text-[9px] font-bold shrink-0">🌐 Online</span>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white/90 text-[11px] font-semibold">
            <Calendar size={11} />{ev.date}{ev.time && ` · ${ev.time}`}
          </div>
          {ev.venue && (
            <div className="flex items-center gap-2 text-white/75 text-[11px]">
              <MapPin size={11} />{ev.venue}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isOrganizer ? (
            <button
              onClick={e => { e.stopPropagation(); onRegister(); }}
              disabled={isFull && !isRegistered}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs transition-all touch-manipulation ${
                isRegistered
                  ? 'bg-white/25 text-white backdrop-blur-sm'
                  : isFull
                    ? 'bg-white/15 text-white/60 cursor-not-allowed'
                    : 'bg-white text-slate-900 shadow-lg active:scale-95'
              }`}
            >
              {isRegistered ? <><CheckCircle2 size={13} />Registered!</> : isFull ? 'Event Full' : <><Ticket size={13} />Register Now</>}
            </button>
          ) : (
            <span className="text-[10px] font-bold text-white/80 bg-white/15 px-3 py-1.5 rounded-full">Your Event</span>
          )}
          <span className="text-white/70 text-[10px] font-mono">
            {ev.registeredIds.length}{ev.maxSeats ? `/${ev.maxSeats}` : ''} going
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main EventsSection ───────────────────────────────────────────────────────
export default function EventsSection({ currentUser, allUsers, darkMode, onViewUserProfile }: EventsSectionProps) {
  const [events,       setEvents]       = useState<CampusEvent[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [activeTab,    setActiveTab]    = useState('All');
  const [showForm,     setShowForm]     = useState(false);
  const [editingEvent, setEditingEvent] = useState<CampusEvent | null>(null);
  const [form,         setForm]         = useState<EventFormState>(blank);
  const [saving,       setSaving]       = useState(false);
  const [selectedEvent,setSelectedEvent]= useState<CampusEvent | null>(null);

  useEffect(() => {
    api.events.getAll()
      .then((data: CampusEvent[]) => setEvents(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return events.filter(e => {
      const matchSearch = search === '' ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.organizer.toLowerCase().includes(search.toLowerCase());
      const matchTab = activeTab === 'All' || e.category === activeTab;
      return matchSearch && matchTab;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [events, search, activeTab]);

  const featuredEvent = filtered.find(e => !e.registeredIds.includes(currentUser.id) && e.organizerId !== currentUser.id) || filtered[0];
  const gridEvents    = filtered.filter(e => e.id !== featuredEvent?.id);

  const myEvents = events.filter(e =>
    e.registeredIds.includes(currentUser.id) || e.organizerId === currentUser.id
  );

  const dm = darkMode;

  const resetForm = () => { setForm(blank); setShowForm(false); setEditingEvent(null); };

  const startEdit = (ev: CampusEvent) => {
    setForm({
      title: ev.title, description: ev.description, category: ev.category,
      date: ev.date, time: ev.time, venue: ev.venue, organizer: ev.organizer,
      college: ev.college, maxSeats: ev.maxSeats?.toString() || '',
      isOnline: ev.isOnline, link: ev.link,
    });
    setEditingEvent(ev);
    setShowForm(true);
    setSelectedEvent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.date.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(), description: form.description.trim(),
        category: form.category, date: form.date.trim(), time: form.time.trim(),
        venue: form.venue.trim(), organizer: form.organizer.trim() || currentUser.fullName,
        organizerId: currentUser.id, college: form.college.trim() || currentUser.college,
        maxSeats: form.maxSeats ? parseInt(form.maxSeats) : null,
        isOnline: form.isOnline, link: form.link.trim(),
      };
      if (editingEvent) {
        const updated = await api.events.update(editingEvent.id, payload);
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? updated : e));
        if (selectedEvent?.id === editingEvent.id) setSelectedEvent(updated);
      } else {
        const created = await api.events.create(payload);
        setEvents(prev => [created, ...prev]);
      }
      resetForm();
    } catch {}
    setSaving(false);
  };

  const handleRegister = async (ev: CampusEvent) => {
    const isRegistered = ev.registeredIds.includes(currentUser.id);
    const optimisticIds = isRegistered
      ? ev.registeredIds.filter(id => id !== currentUser.id)
      : [...ev.registeredIds, currentUser.id];
    // Optimistic update — both lists and detail view
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, registeredIds: optimisticIds } : e));
    setSelectedEvent(s => s?.id === ev.id ? { ...s, registeredIds: optimisticIds } : s);
    try {
      const updated = isRegistered
        ? await api.events.unregister(ev.id, currentUser.id)
        : await api.events.register(ev.id, currentUser.id);
      // Reconcile with server truth
      setEvents(prev => prev.map(e => e.id === ev.id ? updated : e));
      setSelectedEvent(s => s?.id === ev.id ? updated : s);
    } catch {
      // Roll back both to original snapshot
      setEvents(prev => prev.map(e => e.id === ev.id ? ev : e));
      setSelectedEvent(s => s?.id === ev.id ? ev : s);
    }
  };

  const handleDelete = async (ev: CampusEvent) => {
    if (!confirm(`Delete "${ev.title}"?`)) return;
    try {
      await api.events.delete(ev.id);
      setEvents(prev => prev.filter(e => e.id !== ev.id));
      if (selectedEvent?.id === ev.id) setSelectedEvent(null);
    } catch {}
  };

  const inp = `w-full px-3 py-2.5 rounded-2xl border text-xs outline-none transition-colors ${dm ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/60' : 'bg-white border-neutral-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-300'}`;

  // ── Detail View ─────────────────────────────────────────────────────────────
  if (selectedEvent) {
    const ev = selectedEvent;
    const isRegistered = ev.registeredIds.includes(currentUser.id);
    const isOrganizer  = ev.organizerId === currentUser.id;
    const spotsLeft    = ev.maxSeats ? ev.maxSeats - ev.registeredIds.length : null;
    const isFull       = spotsLeft !== null && spotsLeft <= 0 && !isRegistered;
    const registeredUsers = ev.registeredIds
      .map(id => allUsers.find(u => u.id === id))
      .filter(Boolean) as UserProfile[];

    return (
      <div className="flex-1 min-w-0 space-y-4 pb-16">
        <button
          onClick={() => setSelectedEvent(null)}
          className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer hover:opacity-70 transition-opacity touch-manipulation ${dm ? 'text-slate-400' : 'text-slate-500'}`}
        >
          <ChevronLeft size={14} />Back to Event Hub
        </button>

        {/* Full detail poster */}
        <div className={`rounded-3xl overflow-hidden border ${dm ? 'bg-[#0f0f15] border-white/10' : 'bg-white border-neutral-200'}`}>
          {/* Hero */}
          <div className={`relative h-44 bg-gradient-to-br ${catGradient(ev.category)} flex flex-col justify-end p-5`}>
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute right-6 bottom-6 w-24 h-24 rounded-full bg-black/10 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-[9px] font-black uppercase tracking-wider">
                  {CAT_ICON[ev.category]}{ev.category}
                </span>
                {ev.isOnline && <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-bold">🌐 Online</span>}
              </div>
              <h2 className="text-white font-black text-xl leading-tight drop-shadow-sm">{ev.title}</h2>
            </div>
            {isOrganizer && (
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => startEdit(ev)} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 cursor-pointer transition-all"><Pencil size={12} /></button>
                <button onClick={() => handleDelete(ev)} className="p-2 rounded-xl bg-white/20 text-white hover:bg-rose-500/80 cursor-pointer transition-all"><Trash2 size={12} /></button>
              </div>
            )}
          </div>

          <div className="p-5 space-y-5">
            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Calendar size={13} />, text: ev.date, color: 'text-indigo-500' },
                ev.time ? { icon: <Clock size={13} />, text: ev.time, color: 'text-indigo-500' } : null,
                ev.venue ? { icon: <MapPin size={13} />, text: ev.venue, color: 'text-rose-500' } : null,
                ev.college ? { icon: <Award size={13} />, text: ev.college, color: 'text-amber-500' } : null,
              ].filter(Boolean).map((item: any, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
                  <span className={item.color}>{item.icon}</span>
                  <span className="truncate">{item.text}</span>
                </div>
              ))}
            </div>

            <p className={`text-sm leading-relaxed ${dm ? 'text-slate-300' : 'text-slate-600'}`}>{ev.description}</p>

            {/* Organizer row */}
            <div className={`flex items-center gap-3 p-3 rounded-2xl ${dm ? 'bg-white/5' : 'bg-neutral-50'}`}>
              {(() => {
                const org = allUsers.find(u => u.id === ev.organizerId);
                return org ? (
                  <>
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 font-bold text-xs">
                      <Avatar avatar={org.avatar} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${dm ? 'text-white' : 'text-slate-900'}`}>{org.fullName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{org.branch} · {org.college}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedEvent(null); onViewUserProfile?.(org.id); }}
                      className="shrink-0 text-[10px] text-indigo-500 font-bold cursor-pointer hover:underline touch-manipulation"
                    >
                      View Profile
                    </button>
                  </>
                ) : <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>By {ev.organizer}</p>;
              })()}
            </div>

            {/* Seat status + link */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={`text-[9px] font-mono uppercase tracking-wider mb-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Seats</p>
                <p className={`text-sm font-black ${isFull ? 'text-rose-500' : dm ? 'text-white' : 'text-slate-900'}`}>
                  {ev.registeredIds.length} registered{ev.maxSeats ? ` / ${ev.maxSeats} max` : ''}
                  {isFull && ' · FULL'}
                </p>
              </div>
              {ev.link && (
                <a
                  href={ev.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-indigo-500 border border-indigo-500/25 hover:bg-indigo-500/10 cursor-pointer transition-all"
                >
                  <Globe size={12} />Event Link <ExternalLink size={10} />
                </a>
              )}
            </div>

            {/* BIG register button */}
            {!isOrganizer && (
              <button
                onClick={() => handleRegister(ev)}
                disabled={isFull && !isRegistered}
                className={`w-full py-3.5 rounded-2xl font-black text-sm cursor-pointer transition-all touch-manipulation ${
                  isRegistered
                    ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20'
                    : isFull
                      ? 'bg-neutral-100 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                      : `bg-gradient-to-r ${catGradient(ev.category)} text-white shadow-lg active:opacity-80`
                }`}
              >
                {isRegistered ? '✓ Registered — Tap to cancel' : isFull ? 'Event Full' : '🎟 Register · Done in one tap'}
              </button>
            )}

            {/* Attendees */}
            {registeredUsers.length > 0 && (
              <div>
                <p className={`text-[9px] font-black uppercase tracking-wider mb-3 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                  Who's going ({registeredUsers.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {registeredUsers.slice(0, 16).map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setSelectedEvent(null); onViewUserProfile?.(u.id); }}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] cursor-pointer hover:opacity-80 transition-all touch-manipulation ${dm ? 'border-white/10 bg-white/5 text-slate-300' : 'border-neutral-200 bg-neutral-50 text-slate-700'}`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0"><Avatar avatar={u.avatar} /></div>
                      {u.fullName.split(' ')[0]}
                    </button>
                  ))}
                  {registeredUsers.length > 16 && (
                    <span className={`text-[10px] self-center ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                      +{registeredUsers.length - 16} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── List View ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-w-0 pb-16">

      {/* ── Hero header ── */}
      <div className={`relative rounded-3xl overflow-hidden mb-5 ${dm ? 'bg-[#0a0a10]' : 'bg-slate-900'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-violet-600/20 to-rose-600/20 pointer-events-none" />
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/4 pointer-events-none" />
        <div className="absolute right-12 bottom-0 w-32 h-32 rounded-full bg-violet-500/10 pointer-events-none" />

        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">✦ The Network</p>
              <h1 className="text-2xl font-black text-white leading-none tracking-tight">Event Hub</h1>
              <p className="text-xs text-slate-400 mt-1.5">No more posters — everything in one place.</p>

              <div className="flex items-center gap-3 mt-3">
                <span className="text-[10px] font-bold text-white/60">
                  {events.length} events live
                </span>
                <span className="text-white/20">·</span>
                <span className="text-[10px] font-bold text-emerald-400">
                  {events.filter(e => e.registeredIds.includes(currentUser.id)).length} you're attending
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowForm(true);
                setEditingEvent(null);
                setForm({ ...blank, college: currentUser.college, organizer: currentUser.fullName });
              }}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white text-slate-900 text-xs font-black hover:bg-slate-100 active:scale-95 transition-all cursor-pointer touch-manipulation shadow-lg"
            >
              <Plus size={13} />Post Event
            </button>
          </div>
        </div>
      </div>

      {/* ── Your upcoming events strip ── */}
      {myEvents.length > 0 && (
        <div className="mb-5">
          <p className={`text-[9px] font-black uppercase tracking-widest mb-2.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
            Your Events
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{touchAction: 'pan-x'}}>
            {myEvents.map(ev => {
              const isOrg = ev.organizerId === currentUser.id;
              return (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border cursor-pointer transition-all touch-manipulation text-left ${dm ? 'border-white/10 bg-white/5 hover:bg-white/8' : 'border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm'}`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${CAT_SOLID[ev.category] || 'bg-indigo-500'}`} />
                  <span className={`text-[11px] font-bold truncate max-w-28 ${dm ? 'text-white' : 'text-slate-900'}`}>{ev.title}</span>
                  {isOrg
                    ? <span className="text-[8px] font-bold text-amber-500 shrink-0">Host</span>
                    : <span className="text-[8px] font-bold text-emerald-500 shrink-0">Going</span>
                  }
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Create / Edit form ── */}
      {showForm && (
        <div className={`rounded-3xl border mb-5 p-5 ${dm ? 'bg-[#0f0f15] border-white/10' : 'bg-white border-neutral-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-black text-sm ${dm ? 'text-white' : 'text-slate-900'}`}>
              {editingEvent ? '✏️ Edit Event' : '📅 Post a New Event'}
            </h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 touch-manipulation">
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Event title *" required className={inp} />
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={`${inp} cursor-pointer`}>
                {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="What's this event about? Who should attend? *"
              required rows={3}
              className={`${inp} resize-none`}
            />
            <div className="grid grid-cols-3 gap-3">
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required className={inp} />
              <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className={inp} />
              <input value={form.maxSeats} onChange={e => setForm(p => ({ ...p, maxSeats: e.target.value }))} placeholder="Max seats" type="number" min="1" className={inp} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} placeholder="Venue / location" className={inp} />
              <input value={form.college} onChange={e => setForm(p => ({ ...p, college: e.target.value }))} placeholder="College / open to all" className={inp} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} placeholder="Event link / meeting URL" className={inp} />
              <label className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border cursor-pointer ${dm ? 'border-white/10' : 'border-neutral-200'}`}>
                <input type="checkbox" checked={form.isOnline} onChange={e => setForm(p => ({ ...p, isOnline: e.target.checked }))} className="w-3.5 h-3.5 rounded text-indigo-500" />
                <span className={`text-xs ${dm ? 'text-slate-300' : 'text-slate-700'}`}>Online event</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={resetForm} className={`px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer touch-manipulation ${dm ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-neutral-100'}`}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-xs font-black cursor-pointer disabled:opacity-50 touch-manipulation">
                {saving ? 'Saving...' : editingEvent ? 'Save Changes' : 'Post Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Search bar ── */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border mb-4 ${dm ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-200 shadow-sm'}`}>
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search hackathons, fests, workshops..."
          className={`flex-1 text-xs bg-transparent outline-none ${dm ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
        />
        {search && <button onClick={() => setSearch('')} className="text-slate-400 cursor-pointer touch-manipulation"><X size={12} /></button>}
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-5" style={{touchAction: 'pan-x'}}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[10px] font-black transition-all cursor-pointer touch-manipulation ${
              activeTab === tab.key
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                : dm
                  ? 'bg-white/6 text-slate-400 hover:bg-white/10 border border-white/8'
                  : 'bg-white text-slate-500 hover:bg-neutral-100 border border-neutral-200 shadow-sm'
            }`}
          >
            {tab.icon}{tab.label}
            {tab.key !== 'All' && (() => {
              const count = events.filter(e => e.category === tab.key).length;
              return count > 0 ? <span className={`ml-0.5 text-[8px] font-mono ${activeTab === tab.key ? 'text-white/70' : dm ? 'text-slate-600' : 'text-slate-300'}`}>{count}</span> : null;
            })()}
          </button>
        ))}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className={`rounded-3xl border p-12 text-center ${dm ? 'bg-[#0f0f15] border-white/10' : 'bg-white border-neutral-200'}`}>
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading events...</p>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && filtered.length === 0 && (
        <div className={`rounded-3xl border p-12 text-center ${dm ? 'bg-[#0f0f15] border-white/10' : 'bg-white border-neutral-200'}`}>
          <div className="text-4xl mb-3">🎪</div>
          <p className={`text-sm font-black mb-1 ${dm ? 'text-white' : 'text-slate-900'}`}>No events here yet</p>
          <p className="text-[11px] text-slate-400 mb-4">
            {search ? `No results for "${search}"` : 'Be the first to post a campus event!'}
          </p>
          <button
            onClick={() => { setShowForm(true); setForm({ ...blank, college: currentUser.college, organizer: currentUser.fullName }); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-500 text-white text-xs font-bold cursor-pointer touch-manipulation"
          >
            <Plus size={12} />Post an Event
          </button>
        </div>
      )}

      {/* ── Featured + grid ── */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-5">
          {/* Featured (first unregistered event) */}
          {featuredEvent && (
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-2.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                Featured
              </p>
              <FeaturedEventCard
                ev={featuredEvent}
                currentUser={currentUser}
                darkMode={darkMode}
                onOpen={() => setSelectedEvent(featuredEvent)}
                onRegister={() => handleRegister(featuredEvent)}
              />
            </div>
          )}

          {/* Rest in poster grid */}
          {gridEvents.length > 0 && (
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-2.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                {activeTab === 'All' ? 'All Events' : `${TABS.find(t => t.key === activeTab)?.label}`}
                <span className={`ml-2 font-mono normal-case text-[8px] ${dm ? 'text-slate-600' : 'text-slate-300'}`}>{gridEvents.length}</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {gridEvents.map(ev => (
                  <EventPosterCard
                    key={ev.id}
                    ev={ev}
                    currentUser={currentUser}
                    darkMode={darkMode}
                    onOpen={() => setSelectedEvent(ev)}
                    onRegister={() => handleRegister(ev)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
