import React, { useState, useEffect, useRef } from 'react';
import { Search, GraduationCap, Check, Plus } from 'lucide-react';
import { INITIAL_COLLEGES } from '../data/colleges';
import { API_ORIGIN } from '../api';

interface CollegeSelectorProps {
  value: string;
  onChange: (collegeName: string) => void;
  onCategoryChange?: (category: string) => void;
  darkMode: boolean;
  label?: string;
  placeholder?: string;
  id?: string;
  allowCustom?: boolean;
  required?: boolean;
}

export default function CollegeSelector({
  value,
  onChange,
  onCategoryChange,
  darkMode,
  label = "College / School / Institute",
  placeholder = "Type your university / college / school / coaching institute...",
  id = "college-select",
  allowCustom = true,
  required = true
}: CollegeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customNames, setCustomNames] = useState<string[]>([]);
  const [addingCustom, setAddingCustom] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isLocalChange = useRef(false);

  // Load institutions already represented on the platform as well as
  // user-submitted custom names. API_ORIGIN keeps this working on Firebase
  // Hosting, where the API lives on the Replit backend.
  useEffect(() => {
    Promise.all([
      fetch(`${API_ORIGIN}/api/colleges/directory`).then(r => r.ok ? r.json() : []),
      fetch(`${API_ORIGIN}/api/colleges/custom`).then(r => r.ok ? r.json() : []),
    ])
      .then(([directoryNames, customNamesFromApi]: [string[], string[]]) => {
        const seen = new Set<string>();
        const merged = [...directoryNames, ...customNamesFromApi].filter(name => {
          const key = name.trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setCustomNames(merged);
      })
      .catch(() => {});
  }, []);

  // Sync if value changes externally
  useEffect(() => {
    if (isLocalChange.current) {
      setSearchQuery(value);
      isLocalChange.current = false;
      return;
    }
    setSearchQuery(value);
  }, [value]);

  // Merge INITIAL_COLLEGES + custom names into one list
  const initialCollegeKeys = new Set(INITIAL_COLLEGES.map(c => c.name.toLowerCase()));
  const seenCollegeKeys = new Set<string>();
  const allColleges = [
    ...INITIAL_COLLEGES,
    ...customNames
      .filter(n => !initialCollegeKeys.has(n.toLowerCase()))
      .map(n => ({ name: n, category: 'Platform' })),
  ].filter(college => {
    const key = college.name.toLowerCase();
    if (seenCollegeKeys.has(key)) return false;
    seenCollegeKeys.add(key);
    return true;
  });

  // Filter across all colleges
  const filteredColleges = searchQuery.trim().length > 0
    ? allColleges.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 30)
    : [];

  // Whether the typed text exactly matches something in the list
  const exactMatch = allColleges.some(
    c => c.name.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  // Show "+ Add" button when user typed something that isn't already in the list
  const showAddOption = allowCustom && searchQuery.trim().length >= 2 && !exactMatch;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCollege = (name: string, category: string) => {
    isLocalChange.current = true;
    setSearchQuery(name);
    onChange(name);
    onCategoryChange?.(category);
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    isLocalChange.current = true;
    setSearchQuery(text);
    // In selection-only flows, typing is only used to filter the directory.
    // The value is committed to the parent only after a suggestion is chosen.
    if (allowCustom) onChange(text);
    setShowSuggestions(true);
  };

  const handleAddCustom = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) return;
    setAddingCustom(true);
    try {
      const res = await fetch(`${API_ORIGIN}/api/colleges/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        // Add to local list so it appears immediately for this session
        setCustomNames(prev =>
          prev.includes(trimmed) ? prev : [trimmed, ...prev]
        );
        // Select it
        isLocalChange.current = true;
        setSearchQuery(trimmed);
        onChange(trimmed);
        onCategoryChange?.('Other');
        setShowSuggestions(false);
      }
    } catch (_) {}
    setAddingCustom(false);
  };

  return (
    <div className="space-y-1.5 text-left w-full" ref={dropdownRef}>
      {label && (
        <label htmlFor={id} className="block text-[8.5px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500">
          {label}
        </label>
      )}

      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
          <Search size={14} />
        </span>
        <input
          data-testid={`input-${id}`}
          id={id}
          type="text"
          required={required}
          autoComplete="off"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
            darkMode ? 'bg-[#09090C] text-white placeholder:text-slate-600' : 'bg-white text-slate-800 placeholder:text-slate-400'
          }`}
        />

        {/* Dropdown */}
        {showSuggestions && (showAddOption || filteredColleges.length > 0) && (
          <div className={`absolute left-0 right-0 top-full mt-1.5 z-40 max-h-60 overflow-y-auto rounded-xl border border-neutral-200/80 dark:border-white/10 shadow-xl no-scrollbar ${
            darkMode ? 'bg-[#121217] text-slate-100' : 'bg-white text-slate-800'
          }`}>

            {/* ── "+ Add" pinned at the top ── */}
            {showAddOption && (
              <div className={`p-1 border-b ${darkMode ? 'border-white/5' : 'border-neutral-100'}`}>
                <button
                  data-testid={`button-add-custom-${id}`}
                  type="button"
                  onClick={handleAddCustom}
                  disabled={addingCustom}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg flex items-center gap-2 font-semibold transition-colors cursor-pointer border-0 ${
                    darkMode
                      ? 'text-indigo-400 hover:bg-indigo-500/10'
                      : 'text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  <Plus size={13} className="shrink-0" />
                  <span className="truncate">
                    {addingCustom ? 'Adding…' : `Add "${searchQuery.trim()}"`}
                  </span>
                  <span className={`ml-auto text-[9px] font-normal shrink-0 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    save &amp; use
                  </span>
                </button>
              </div>
            )}

            {/* ── Matching suggestions ── */}
            {filteredColleges.length > 0 && (
              <div className="p-1 space-y-0.5">
                {filteredColleges.map((college) => {
                  const isCurrent = value.toLowerCase() === college.name.toLowerCase();
                  return (
                    <button
                      data-testid={`button-select-${id}-${college.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      key={college.name}
                      type="button"
                      onClick={() => handleSelectCollege(college.name, college.category)}
                      className={`w-full text-left font-sans text-xs px-3 py-1.5 rounded-lg border-0 cursor-pointer flex items-center justify-between transition-colors ${
                        isCurrent
                          ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold'
                          : darkMode
                            ? 'hover:bg-white/5 text-slate-300'
                            : 'hover:bg-neutral-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <GraduationCap size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{college.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] text-slate-400 font-medium">{college.category}</span>
                        {isCurrent && <Check size={12} className="text-indigo-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
