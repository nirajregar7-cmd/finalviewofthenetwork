import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, GraduationCap, School, Target, Users, Zap } from 'lucide-react';
import { UserProfile } from '../types';
import CollegeSelector from './CollegeSelector';

interface OnboardingSectionProps {
  user: UserProfile;
  onComplete: (updates: Partial<UserProfile>) => Promise<void>;
  darkMode: boolean;
}

type StudyType = 'school' | 'college' | 'exam' | 'other' | '';
type OnboardingStep = 'study-type' | 'study-details' | 'interests' | 'looking-for';

const INTERESTS = [
  'Coding', 'AI & ML', 'Startups', 'Research', 'Design', 'Finance',
  'Sports', 'Music', 'Gaming', 'Business', 'Photography', 'Higher Studies',
];

const LOOKING_FOR = [
  'Study Partner', 'Doubt Discussion', 'Study Group', 'Mentor',
  'Resources', 'Test / Practice', 'Motivation', 'DSA Partner',
  'Project Teammate', 'Hackathon Team', 'Friends', 'Internships',
  'Opportunities', 'Like-minded People', 'Other',
];

const COMPETITIVE_EXAMS = [
  'JEE', 'NEET', 'SAT', 'BITSAT', 'CUET', 'MHT-CET / State CET',
  'CLAT / AILET', 'NDA / CDS / AFCAT', 'GATE', 'JAM',
  'CAT / XAT / MAT', 'UPSC', 'SSC CGL / CHSL',
  'Banking / IBPS / SBI', 'Railway / RRB', 'CA Foundation',
  'CS / CMA', 'UGC NET / CSIR NET', 'CTET / State TET',
  'NIFT / NID / UCEED', 'ICAR AIEEA', 'NCHM JEE', 'GRE / GMAT',
  'Olympiads', 'Other',
];

const SCHOOL_EXAMS = [...COMPETITIVE_EXAMS.slice(0, -1), 'Boards', 'Other'];

const COLLEGE_PROGRAMS = [
  'BTech / BE', 'BSc', 'BCom', 'BA', 'BBA', 'BCA', 'MBBS', 'BDS',
  'LLB', 'MBA', 'MCA', 'MTech / ME', 'MSc', 'MA', 'PhD', 'Other',
];

const SPECIALIZATIONS: Record<string, string[]> = {
  'BTech / BE': ['CSE', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Chemical', 'Biotechnology', 'Production', 'Other'],
  BCom: ['Accounting', 'Finance', 'Economics', 'Business', 'Other'],
  BSc: ['Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'Biology', 'Other'],
  BBA: ['Finance', 'Marketing', 'Human Resources', 'Operations', 'Business Analytics', 'Other'],
  MBBS: ['Medicine', 'Surgery', 'Other'],
  LLB: ['Corporate Law', 'Criminal Law', 'Constitutional Law', 'Other'],
  Other: ['Other'],
};

const EXAM_LEVELS = [
  'School — 11th', 'School — 12th', 'Dropper',
  'College Student', 'Graduate', 'Working Professional', 'Other',
];

const STEP_META: Array<{ id: OnboardingStep; label: string; icon: typeof GraduationCap }> = [
  { id: 'study-type', label: 'Study type', icon: GraduationCap },
  { id: 'study-details', label: 'Your path', icon: School },
  { id: 'interests', label: 'Interests', icon: Zap },
  { id: 'looking-for', label: 'Goals', icon: Users },
];

export default function OnboardingSection({ user, onComplete, darkMode }: OnboardingSectionProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [studyType, setStudyType] = useState<StudyType>('');
  const [schoolClass, setSchoolClass] = useState('');
  const [schoolStream, setSchoolStream] = useState('');
  const [schoolScienceCombination, setSchoolScienceCombination] = useState('');
  const [schoolExams, setSchoolExams] = useState<string[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [collegeProgram, setCollegeProgram] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [collegeSpecialization, setCollegeSpecialization] = useState('');
  const [collegeYear, setCollegeYear] = useState('');
  const [collegeExams, setCollegeExams] = useState<string[]>([]);
  const [examTarget, setExamTarget] = useState('');
  const [examLevel, setExamLevel] = useState('');
  const [examInstitution, setExamInstitution] = useState('');
  const [examInstitutionType, setExamInstitutionType] = useState('');
  const [examNeeds, setExamNeeds] = useState<string[]>([]);
  const [otherStudy, setOtherStudy] = useState('');
  const [otherInstitution, setOtherInstitution] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user.interests || []);
  const [selectedLookingFor, setSelectedLookingFor] = useState<string[]>(user.lookingFor || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentStep = STEP_META[stepIndex];
  const specializationOptions = useMemo(
    () => SPECIALIZATIONS[collegeProgram] || ['Other'],
    [collegeProgram],
  );

  const bg = darkMode ? 'bg-[#09090C]' : 'bg-[#f7f8fc]';
  const card = `w-full max-w-2xl overflow-hidden rounded-3xl border shadow-xl ${
    darkMode ? 'border-white/10 bg-[#121217]' : 'border-slate-200/80 bg-white'
  }`;
  const field = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 ${
    darkMode
      ? 'border-white/10 bg-[#09090C] text-white placeholder:text-slate-600'
      : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400'
  }`;
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-2 text-xs font-semibold transition ${
      active
        ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
        : darkMode
          ? 'border-white/10 bg-white/5 text-slate-300 hover:border-indigo-400'
          : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600'
    }`;

  const toggle = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList(list.includes(item) ? list.filter(value => value !== item) : [...list, item]);
  };

  const canContinue = () => {
    if (currentStep.id === 'study-type') return Boolean(studyType);
    if (currentStep.id === 'interests') return selectedInterests.length > 0;
    if (currentStep.id === 'looking-for') return selectedLookingFor.length > 0;
    if (studyType === 'school') {
      const streamComplete = schoolClass === '9th' || schoolClass === '10th'
        || Boolean(schoolStream && (schoolStream !== 'Science' || schoolScienceCombination));
      return Boolean(schoolClass && streamComplete && schoolName);
    }
    if (studyType === 'college') {
      return Boolean(collegeProgram && collegeName && collegeSpecialization && collegeYear);
    }
    if (studyType === 'exam') {
      return Boolean(
        examTarget &&
        examLevel &&
        examInstitutionType &&
        (examInstitutionType === 'Self-study / Online' || examInstitution),
      );
    }
    return Boolean(otherStudy);
  };

  const studyTypeOptions: Array<{ value: Exclude<StudyType, ''>; title: string; description: string; icon: typeof GraduationCap }> = [
    { value: 'school', title: 'School Student', description: 'I’m currently in school', icon: School },
    { value: 'college', title: 'College / University Student', description: 'I’m pursuing a degree', icon: GraduationCap },
    { value: 'exam', title: 'Competitive Exam Aspirant', description: 'I’m preparing for an exam', icon: Target },
    { value: 'other', title: 'Other', description: 'Something else describes me', icon: Users },
  ];

  const handleStudyTypeChange = (nextType: Exclude<StudyType, ''>) => {
    if (nextType === studyType) return;
    setStudyType(nextType);
    setSchoolClass('');
    setSchoolStream('');
    setSchoolScienceCombination('');
    setSchoolExams([]);
    setSchoolName('');
    setCollegeProgram('');
    setCollegeName('');
    setCollegeSpecialization('');
    setCollegeYear('');
    setCollegeExams([]);
    setExamTarget('');
    setExamLevel('');
    setExamInstitution('');
    setExamInstitutionType('');
    setExamNeeds([]);
    setOtherStudy('');
    setOtherInstitution('');
    setError('');
  };

  const handleNext = async () => {
    if (!canContinue()) {
      setError('Please complete the required details to continue.');
      return;
    }
    setError('');
    if (stepIndex < STEP_META.length - 1) {
      setStepIndex(value => value + 1);
      return;
    }

    const education = studyType === 'school'
      ? {
          college: schoolName,
          degree: 'School Student',
            academicStream: schoolScienceCombination ? `${schoolStream} — ${schoolScienceCombination}` : schoolStream || 'School',
          programGroup: 'School',
            fields: [schoolClass, schoolStream, schoolScienceCombination, ...schoolExams].filter(Boolean),
            branch: schoolScienceCombination || schoolStream || schoolClass,
          year: 1,
        }
      : studyType === 'college'
        ? {
            college: collegeName,
            degree: collegeProgram,
            academicStream: 'College / University',
            programGroup: collegeYear === 'Postgraduate' || collegeProgram === 'PhD' ? 'Postgraduate' : 'Undergraduate',
            fields: [collegeSpecialization, ...collegeExams],
            branch: collegeSpecialization,
            year: ['5th Year', 'Postgraduate', 'PhD', 'Other'].includes(collegeYear)
              ? 5
              : Number(collegeYear.replace(/\D/g, '')) || 1,
          }
        : studyType === 'exam'
          ? {
              college: examInstitutionType === 'Self-study / Online' ? 'Self-study / Online' : examInstitution,
              degree: examTarget,
              academicStream: examLevel,
              programGroup: 'Competitive Exam / Preparation',
              fields: [examTarget, examLevel, examInstitutionType, ...examNeeds],
              branch: examTarget,
              year: 1,
            }
          : {
              college: otherInstitution,
              degree: 'Other',
              academicStream: 'Other',
              programGroup: 'Other',
              fields: [otherStudy],
              branch: otherStudy,
              year: 1,
            };

    setLoading(true);
    try {
      await onComplete({
        ...education,
        interests: selectedInterests,
        skills: user.skills || [],
        lookingFor: Array.from(new Set([...selectedLookingFor, ...examNeeds])),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save your profile. Please try again.');
      setLoading(false);
    }
  };

  const renderStudyDetails = () => {
    if (studyType === 'school') {
      return (
        <div className="space-y-5">
          <ChoiceGroup
            label="Which class are you in?"
            options={['9th', '10th', '11th', '12th']}
            value={schoolClass}
            onChange={value => {
              setSchoolClass(value);
              if (value === '9th' || value === '10th') {
                setSchoolStream('');
                setSchoolScienceCombination('');
              }
            }}
            darkMode={darkMode}
          />
          {(schoolClass === '11th' || schoolClass === '12th') && (
            <>
              <ChoiceGroup
                label="What is your stream?"
                options={['Science', 'Commerce', 'Arts / Humanities', 'Other']}
                value={schoolStream}
                onChange={value => {
                  setSchoolStream(value);
                  if (value !== 'Science') setSchoolScienceCombination('');
                }}
                darkMode={darkMode}
              />
              {schoolStream === 'Science' && (
                <ChoiceGroup
                  label="Which science combination?"
                  options={['PCM', 'PCB', 'PCMB']}
                  value={schoolScienceCombination}
                  onChange={setSchoolScienceCombination}
                  darkMode={darkMode}
                />
              )}
            </>
          )}
          <MultiChoice label="Are you preparing for any exam? (optional)" options={[...SCHOOL_EXAMS, 'Not preparing for any specific exam']} values={schoolExams} onToggle={item => toggle(schoolExams, setSchoolExams, item)} darkMode={darkMode} />
          <CollegeSelector id="onboarding-school" value={schoolName} onChange={setSchoolName} onCategoryChange={() => {}} darkMode={darkMode} label="Which school are you from?" />
        </div>
      );
    }
    if (studyType === 'college') {
      return (
        <div className="space-y-5">
          <ChoiceGroup label="What are you studying?" options={COLLEGE_PROGRAMS} value={collegeProgram} onChange={value => { setCollegeProgram(value); setCollegeSpecialization(''); }} darkMode={darkMode} />
          <CollegeSelector id="onboarding-college" value={collegeName} onChange={setCollegeName} onCategoryChange={() => {}} darkMode={darkMode} label="Which college / university are you from?" />
          <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Branch / specialization</label>
            <select value={collegeSpecialization} onChange={event => setCollegeSpecialization(event.target.value)} className={field}>
              <option value="">Select specialization</option>
              {specializationOptions.map(item => <option key={item}>{item}</option>)}
            </select>
          </div>
          <ChoiceGroup label="Which year are you in?" options={['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Postgraduate', 'PhD', 'Other']} value={collegeYear} onChange={setCollegeYear} darkMode={darkMode} />
          <MultiChoice label="Are you preparing for anything? (optional)" options={COMPETITIVE_EXAMS} values={collegeExams} onToggle={item => toggle(collegeExams, setCollegeExams, item)} darkMode={darkMode} />
        </div>
      );
    }
    if (studyType === 'exam') {
      return (
        <div className="space-y-5">
          <ChoiceGroup label="What are you preparing for?" options={COMPETITIVE_EXAMS} value={examTarget} onChange={setExamTarget} darkMode={darkMode} />
          <ChoiceGroup label="What is your current level?" options={EXAM_LEVELS} value={examLevel} onChange={setExamLevel} darkMode={darkMode} />
          <ChoiceGroup
            label="Where do you study or prepare?"
            options={['School / College', 'Coaching Institute', 'Self-study / Online']}
            value={examInstitutionType}
            onChange={value => {
              setExamInstitutionType(value);
              if (value === 'Self-study / Online') setExamInstitution('');
            }}
            darkMode={darkMode}
          />
          {examInstitutionType && examInstitutionType !== 'Self-study / Online' && (
            <CollegeSelector
              id="onboarding-exam-institution"
              value={examInstitution}
              onChange={setExamInstitution}
              onCategoryChange={() => {}}
              darkMode={darkMode}
              label={examInstitutionType === 'Coaching Institute' ? 'Which coaching institute are you from?' : 'Which school / college are you from?'}
            />
          )}
          <MultiChoice label="What are you looking for? (optional)" options={['Study Partner', 'Doubt Discussion', 'Study Group', 'Mentor', 'Resources', 'Test / Practice', 'Motivation', 'Other']} values={examNeeds} onToggle={item => toggle(examNeeds, setExamNeeds, item)} darkMode={darkMode} />
        </div>
      );
    }
    return (
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">What are you currently studying or working on?</label>
          <input className={field} value={otherStudy} onChange={event => setOtherStudy(event.target.value)} placeholder="Tell us what describes you" />
        </div>
        <div>
          <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Institution (optional)</label>
          <input className={field} value={otherInstitution} onChange={event => setOtherInstitution(event.target.value)} placeholder="School, college, company, or organisation" />
        </div>
      </div>
    );
  };

  const firstName = user.fullName.split(' ')[0] || 'there';

  return (
    <div className={`flex min-h-screen items-center justify-center p-4 ${bg} ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
      <div className={card}>
        <header className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-7 text-white sm:px-9">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15"><GraduationCap size={20} /></div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/70">The Network</p>
              <p className="text-sm font-bold">Build your student profile</p>
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            {currentStep.id === 'study-type' && `Welcome, ${firstName}`}
            {currentStep.id === 'study-details' && 'Tell us about your path'}
            {currentStep.id === 'interests' && 'What are you interested in?'}
            {currentStep.id === 'looking-for' && 'What are you looking for?'}
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-white/75">
            {currentStep.id === 'study-type' && 'A few details will help us show you the right people, communities, and opportunities.'}
            {currentStep.id === 'study-details' && 'This helps students find relevant communities and peers.'}
            {currentStep.id === 'interests' && 'Choose the topics you want to see more of.'}
            {currentStep.id === 'looking-for' && 'Choose the connections and opportunities you want from The Network.'}
          </p>
          <div className="mt-6 flex gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className={`h-1.5 rounded-full transition-all ${index <= stepIndex + 2 ? 'bg-white' : 'bg-white/25'} ${index === stepIndex + 2 ? 'flex-[2]' : 'flex-1'}`} />
            ))}
          </div>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/60">Step {stepIndex + 3} of 6 · {currentStep.label}</p>
        </header>

        <main className="space-y-6 p-6 sm:p-9">
           {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-semibold text-rose-600">{error}</div>}

          {currentStep.id === 'study-type' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {studyTypeOptions.map(option => {
                const Icon = option.icon;
                const active = studyType === option.value;
                return (
                  <button data-testid={`button-study-type-${option.value}`} aria-pressed={active} key={option.value} type="button" onClick={() => handleStudyTypeChange(option.value)} className={`flex min-h-[76px] items-center gap-3 rounded-2xl border p-4 text-left transition ${active ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-200' : darkMode ? 'border-white/10 bg-white/5 hover:border-indigo-400' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'}`}>
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}><Icon size={20} /></span>
                    <span><span className="block text-sm font-extrabold">{option.title}</span><span className={`mt-0.5 block text-xs ${active ? 'text-indigo-600/70' : 'text-slate-400'}`}>{option.description}</span></span>
                    {active && <Check className="ml-auto shrink-0 text-indigo-600" size={18} />}
                  </button>
                );
              })}
            </div>
          )}

          {currentStep.id === 'study-details' && renderStudyDetails()}

           {currentStep.id === 'interests' && (
            <div>
              <p className="mb-4 text-sm text-slate-400">Select at least one. You can change these later from your profile.</p>
               <div className="flex flex-wrap gap-2">{INTERESTS.map(item => <button data-testid={`button-interest-${item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} aria-pressed={selectedInterests.includes(item)} key={item} type="button" onClick={() => toggle(selectedInterests, setSelectedInterests, item)} className={chip(selectedInterests.includes(item))}>{selectedInterests.includes(item) && <Check size={12} className="mr-1 inline" />}{item}</button>)}</div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">{selectedInterests.length} selected</p>
            </div>
          )}

          {currentStep.id === 'looking-for' && (
            <div>
              <p className="mb-4 text-sm text-slate-400">Choose the people, support, and opportunities you want to find.</p>
               <div className="flex flex-wrap gap-2">{LOOKING_FOR.map(item => <button data-testid={`button-looking-for-${item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} aria-pressed={selectedLookingFor.includes(item)} key={item} type="button" onClick={() => toggle(selectedLookingFor, setSelectedLookingFor, item)} className={chip(selectedLookingFor.includes(item))}>{selectedLookingFor.includes(item) && <Check size={12} className="mr-1 inline" />}{item}</button>)}</div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">{selectedLookingFor.length} selected</p>
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-white/10">
             {stepIndex > 0 && <button data-testid="button-onboarding-back" type="button" onClick={() => { setError(''); setStepIndex(value => value - 1); }} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold ${darkMode ? 'border-white/10 text-slate-300 hover:border-white/20' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}><ArrowLeft size={14} /> Back</button>}
             <button data-testid="button-onboarding-continue" type="button" onClick={handleNext} disabled={loading} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Saving profile…' : stepIndex === STEP_META.length - 1 ? <><Check size={15} /> Complete profile</> : <>Continue <ArrowRight size={15} /></>}
            </button>
          </div>
          {!canContinue() && <p className="text-center text-[10px] text-slate-400">{currentStep.id === 'study-type' ? 'Choose the option that best describes you.' : currentStep.id === 'interests' ? 'Pick at least one interest.' : currentStep.id === 'looking-for' ? 'Pick at least one goal.' : 'Complete the required fields to continue.'}</p>}
        </main>
      </div>
    </div>
  );
}

function ChoiceGroup({ label, options, value, onChange, darkMode }: { label: string; options: string[]; value: string; onChange: (value: string) => void; darkMode: boolean }) {
  const groupId = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div>
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(option => <button data-testid={`button-${groupId}-${option.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} aria-pressed={value === option} key={option} type="button" onClick={() => onChange(option)} className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-bold transition ${value === option ? 'border-indigo-500 bg-indigo-500 text-white' : darkMode ? 'border-white/10 bg-white/5 text-slate-300 hover:border-indigo-400' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600'}`}>{value === option && <Check size={11} className="mr-1 inline" />}{option}</button>)}
      </div>
    </div>
  );
}

function MultiChoice({ label, options, values, onToggle, darkMode }: { label: string; options: string[]; values: string[]; onToggle: (value: string) => void; darkMode: boolean }) {
  const groupId = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div>
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(option => <button data-testid={`button-${groupId}-${option.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} aria-pressed={values.includes(option)} key={option} type="button" onClick={() => onToggle(option)} className={`min-h-11 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${values.includes(option) ? 'border-indigo-500 bg-indigo-500 text-white' : darkMode ? 'border-white/10 bg-white/5 text-slate-300 hover:border-indigo-400' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-400'}`}>{values.includes(option) && <Check size={11} className="mr-1 inline" />}{option}</button>)}
      </div>
    </div>
  );
}