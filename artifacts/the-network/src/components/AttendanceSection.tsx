import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { api } from '../api';
import { Plus, Trash2, CheckCircle2, XCircle, BookOpen, AlertTriangle, Target } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  totalClasses: number;
  presentClasses: number;
  targetPercent: number;
}

interface Props {
  currentUser: UserProfile;
  darkMode: boolean;
}

const BRANCH_SUBJECTS: Record<string, string[]> = {
  'Computer Science': ['Data Structures', 'DBMS', 'Operating Systems', 'Computer Networks', 'Algorithms', 'Software Engineering'],
  'Electrical Engineering': ['Circuit Theory', 'Signals & Systems', 'Power Systems', 'Control Systems', 'Electromagnetics'],
  'Mechanical Engineering': ['Thermodynamics', 'Fluid Mechanics', 'Machine Design', 'Manufacturing', 'Heat Transfer'],
  'Civil Engineering': ['Structural Analysis', 'Fluid Mechanics', 'Soil Mechanics', 'Construction Materials', 'Surveying'],
  'Electronics': ['Analog Circuits', 'Digital Electronics', 'VLSI Design', 'Microprocessors', 'Communication Systems'],
};

export default function AttendanceSection({ currentUser, darkMode }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState(75);
  const [marking, setMarking] = useState<string | null>(null);

  const suggestions = BRANCH_SUBJECTS[currentUser.branch] || [];

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    try {
      const data = await api.attendance.getAll(currentUser.id);
      setSubjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function addSubject() {
    if (!newName.trim()) return;
    try {
      const created = await api.attendance.create(currentUser.id, newName.trim(), newTarget);
      setSubjects(prev => [...prev, created]);
      setNewName('');
      setNewTarget(75);
      setShowAdd(false);
    } catch (e) { console.error(e); }
  }

  async function mark(subjectId: string, present: boolean) {
    setMarking(subjectId);
    try {
      const updated = await api.attendance.mark(subjectId, present);
      setSubjects(prev => prev.map(s => s.id === subjectId ? updated : s));
    } catch (e) { console.error(e); }
    finally { setMarking(null); }
  }

  async function deleteSubject(subjectId: string) {
    try {
      await api.attendance.delete(subjectId);
      setSubjects(prev => prev.filter(s => s.id !== subjectId));
    } catch (e) { console.error(e); }
  }

  function getPct(s: Subject) {
    if (s.totalClasses === 0) return null;
    return Math.round((s.presentClasses / s.totalClasses) * 100);
  }

  function classesCanSkip(s: Subject) {
    if (s.totalClasses === 0) return 0;
    const pct = s.presentClasses / s.totalClasses;
    if (pct * 100 < s.targetPercent) return 0;
    let skip = 0;
    while (true) {
      const newPct = s.presentClasses / (s.totalClasses + skip + 1);
      if (newPct * 100 < s.targetPercent) break;
      skip++;
      if (skip > 100) break;
    }
    return skip;
  }

  function classesNeeded(s: Subject) {
    if (s.totalClasses === 0) return 0;
    const pct = getPct(s)!;
    if (pct >= s.targetPercent) return 0;
    let need = 0;
    let total = s.totalClasses;
    let present = s.presentClasses;
    while ((present / total) * 100 < s.targetPercent) {
      present++;
      total++;
      need++;
      if (need > 200) break;
    }
    return need;
  }

  function statusColor(pct: number | null, target: number) {
    if (pct === null) return darkMode ? 'text-slate-400' : 'text-slate-500';
    if (pct >= target) return 'text-emerald-500';
    if (pct >= target - 5) return 'text-amber-500';
    return 'text-rose-500';
  }

  function barColor(pct: number | null, target: number) {
    if (pct === null) return 'bg-slate-300';
    if (pct >= target) return 'bg-emerald-500';
    if (pct >= target - 5) return 'bg-amber-500';
    return 'bg-rose-500';
  }

  const overallPct = subjects.length > 0
    ? Math.round(subjects.reduce((sum, s) => sum + (s.totalClasses > 0 ? (s.presentClasses / s.totalClasses) * 100 : 0), 0) / subjects.filter(s => s.totalClasses > 0).length || 0)
    : null;

  const card = darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200';

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className={`rounded-2xl border p-5 ${card}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-base">Attendance Tracker</h2>
              <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Never fall below 75%</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-all cursor-pointer border-0"
          >
            <Plus size={13} /> Add Subject
          </button>
        </div>

        {/* Overall summary */}
        {subjects.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-xl p-3 text-center ${darkMode ? 'bg-white/5' : 'bg-neutral-50'}`}>
              <div className="text-2xl font-black text-indigo-500">{subjects.length}</div>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Subjects</div>
            </div>
            <div className={`rounded-xl p-3 text-center ${darkMode ? 'bg-white/5' : 'bg-neutral-50'}`}>
              <div className={`text-2xl font-black ${overallPct !== null ? (overallPct >= 75 ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-400'}`}>
                {overallPct !== null ? `${overallPct}%` : '—'}
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Avg</div>
            </div>
            <div className={`rounded-xl p-3 text-center ${darkMode ? 'bg-white/5' : 'bg-neutral-50'}`}>
              <div className={`text-2xl font-black ${subjects.filter(s => getPct(s) !== null && getPct(s)! < s.targetPercent).length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {subjects.filter(s => getPct(s) !== null && getPct(s)! < s.targetPercent).length}
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>At Risk</div>
            </div>
          </div>
        )}
      </div>

      {/* Add Subject Modal */}
      {showAdd && (
        <div className={`rounded-2xl border p-5 ${card}`}>
          <h3 className="font-bold text-sm mb-3">Add New Subject</h3>

          {/* Quick suggestions */}
          {suggestions.length > 0 && (
            <div className="mb-3">
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Quick add for {currentUser.branch}</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.filter(s => !subjects.find(sub => sub.name === s)).map(s => (
                  <button
                    key={s}
                    onClick={() => setNewName(s)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all ${newName === s ? 'bg-indigo-500 text-white border-indigo-500' : (darkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-neutral-50 border-neutral-200 text-slate-600 hover:bg-neutral-100')}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            type="text"
            placeholder="Subject name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSubject()}
            className={`w-full px-3 py-2 rounded-xl border text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-[#09090C] border-white/10 text-white' : 'bg-neutral-50 border-neutral-200 text-slate-900'}`}
          />

          <div className="flex items-center gap-3 mb-4">
            <label className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Target %</label>
            <div className="flex gap-2">
              {[75, 80, 85].map(t => (
                <button
                  key={t}
                  onClick={() => setNewTarget(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer transition-all ${newTarget === t ? 'bg-indigo-500 text-white border-indigo-500' : (darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-neutral-50 border-neutral-200 text-slate-600')}`}
                >
                  {t}%
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={addSubject}
              disabled={!newName.trim()}
              className="flex-1 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-bold transition-all cursor-pointer border-0"
            >
              Add Subject
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName(''); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer border ${darkMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-600 hover:bg-neutral-50'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Subject Cards */}
      {loading ? (
        <div className={`rounded-2xl border p-8 text-center ${card}`}>
          <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading subjects...</div>
        </div>
      ) : subjects.length === 0 ? (
        <div className={`rounded-2xl border p-10 text-center ${card}`}>
          <BookOpen size={36} className={`mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
          <p className="font-bold text-sm mb-1">No subjects yet</p>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Add your subjects and mark attendance after every class</p>
        </div>
      ) : (
        subjects.map(subject => {
          const pct = getPct(subject);
          const skip = classesCanSkip(subject);
          const need = classesNeeded(subject);
          const isAtRisk = pct !== null && pct < subject.targetPercent;
          const isMarking = marking === subject.id;

          return (
            <div key={subject.id} className={`rounded-2xl border p-4 ${card}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{subject.name}</h3>
                  <div className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {subject.presentClasses}/{subject.totalClasses} classes · Target {subject.targetPercent}%
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className={`text-xl font-black ${statusColor(pct, subject.targetPercent)}`}>
                    {pct !== null ? `${pct}%` : '—'}
                  </span>
                  <button
                    onClick={() => deleteSubject(subject.id)}
                    className={`p-1 rounded-lg cursor-pointer border-0 bg-transparent transition-colors ${darkMode ? 'text-slate-600 hover:text-rose-400' : 'text-slate-300 hover:text-rose-500'}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className={`w-full h-2 rounded-full mb-3 ${darkMode ? 'bg-white/10' : 'bg-neutral-100'}`}>
                <div
                  className={`h-2 rounded-full transition-all ${barColor(pct, subject.targetPercent)}`}
                  style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
                />
              </div>

              {/* Status hint */}
              {subject.totalClasses > 0 && (
                <div className="mb-3">
                  {isAtRisk ? (
                    <div className="flex items-center gap-1.5 text-rose-500 text-[11px] font-semibold">
                      <AlertTriangle size={11} />
                      Attend next <strong>{need}</strong> class{need !== 1 ? 'es' : ''} to recover
                    </div>
                  ) : skip > 0 ? (
                    <div className="flex items-center gap-1.5 text-emerald-500 text-[11px] font-semibold">
                      <Target size={11} />
                      You can skip <strong>{skip}</strong> more class{skip !== 1 ? 'es' : ''} safely
                    </div>
                  ) : null}
                </div>
              )}

              {/* Mark buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => mark(subject.id, true)}
                  disabled={isMarking}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold transition-all cursor-pointer border-0"
                >
                  <CheckCircle2 size={13} />
                  Present
                </button>
                <button
                  onClick={() => mark(subject.id, false)}
                  disabled={isMarking}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-xs font-bold transition-all cursor-pointer border-0"
                >
                  <XCircle size={13} />
                  Absent
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
