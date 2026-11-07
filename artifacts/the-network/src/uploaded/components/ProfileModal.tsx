import React, { useEffect, useState } from 'react';
import { getEducationDisplay } from '../../utils/education';
import {
  X,
  CheckCircle2,
  MapPin,
  Share2,
  Edit3,
  Users,
  Award,
  Sparkles,
  BookOpen,
  Github,
  Mail,
  GraduationCap,
  MessageCircle,
  Link,
  Code,
  Building,
  Target,
  FileText,
  Camera
} from 'lucide-react';
import { api } from '../../api';
import { Community, User } from '../types';
import type { Connection } from '../../types';
import confetti from 'canvas-confetti';
import CollegeSelector from '../../components/CollegeSelector';
import { SafeAvatar } from './SafeAvatar';

const INTEREST_OPTIONS = [
  'AI & Machine Learning',
  'Web Development',
  'App Development',
  'Startups',
  'Entrepreneurship',
  'Higher Studies',
  'Sports',
  'Research',
  'Robotics',
  'Competitive Programming',
];

const SKILL_OPTIONS = [
  'C++',
  'Java',
  'Python',
  'JavaScript',
  'React',
  'Data Structures',
  'Web Development',
  'App Development',
  'Electrical & Electronics',
  'UI/UX Design',
  'Public Speaking',
  'Project Management',
];

const LOOKING_FOR_OPTIONS = [
  'Study Partner',
  'Friends',
  'Internship',
  'Placement Preparation',
  'Hackathon Team',
  'Project Collaborators',
  'Startup Team',
  'Mentor',
  'Higher Studies Guidance',
];

const ACADEMIC_CATEGORY_OPTIONS = [
  'Engineering',
  'Science',
  'Commerce',
  'Business & Management',
  'Arts & Humanities',
  'Medicine & Healthcare',
  'Law & Public Affairs',
  'Design / Art / Media',
  'Agriculture & Environment',
  'Education',
  'Sports & Recreation',
  'Professional',
  'Research',
  'Competitive Exam / Preparation',
  'Other',
];

const PROGRAM_GROUP_OPTIONS = [
  'Engineering & Technology',
  'Arts & Humanities',
  'Commerce & Management',
  'Science & Research',
  'Medicine & Healthcare',
  'Law',
  'Design & Architecture',
  'Competitive Exams',
  'Other',
];

const FIELD_OPTIONS = [
  'Artificial Intelligence',
  'Software Development',
  'Data Science',
  'Electronics & Embedded',
  'Business & Entrepreneurship',
  'Finance',
  'Research',
  'Healthcare',
  'Law & Policy',
  'Design',
  'Media & Content',
  'Computer Science (CSE)',
  'Electrical',
  'Mechanical',
  'Civil',
  'Chemistry',
  'Mathematics',
  'Biology',
  'Psychology',
  'Marketing',
  'Product Management',
  'Entrepreneurship',
  'Photography',
  'Agriculture',
  'Teaching',
  'Sports',
];

const BRANCH_OPTIONS = [
  'Computer Science (CSE)', 'CSE', 'Computer Science', 'Information Technology', 'Artificial Intelligence',
  'Data Science', 'Electrical', 'Electronics', 'Electronics & Communication',
  'Mechanical', 'Civil', 'Chemical', 'Aerospace', 'Automobile', 'Biomedical',
  'Biotechnology', 'Industrial', 'Instrumentation', 'Mechatronics', 'Commerce',
  'Accounting', 'Finance', 'Economics', 'Business', 'Management', 'Marketing',
  'English', 'History', 'Psychology', 'Political Science', 'Medicine', 'Dentistry',
  'Pharmacy', 'Nursing', 'Law', 'Public Policy', 'Graphic Design', 'UI/UX',
  'Architecture', 'Photography', 'Journalism', 'Agriculture', 'Teaching',
  'Sports', 'Other',
];

const DEGREE_OPTIONS = [
  'BA', 'BSc', 'BCom', 'BBA', 'BCA', 'B.Tech / BE', 'B.Tech', 'B.E', 'MBBS', 'BDS', 'BPharm',
  'BPT', 'BSc Nursing', 'LLB', 'BArch', 'BDes', 'BFA', 'BEd', 'BSW',
  'BHM / Hotel Management', 'BVSc', 'Agriculture', 'Polytechnic', 'Diploma',
  'ITI', 'MA', 'MSc', 'MCom', 'MBA', 'MCA', 'MTech / ME', 'MPharm', 'MD / MS',
  'MDS', 'LLM', 'MArch', 'MDes', 'MEd', 'MPH', 'MSW', 'MPlan', 'CA', 'CS',
  'CMA', 'CFA', 'ACCA', 'PhD', 'Research Scholar', 'JEE', 'NEET', 'GATE',
  'CAT', 'UPSC', 'CUET', 'GRE / GMAT', 'Other',
];

const SCHOOL_CLASS_OPTIONS = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'Gap year / Dropper'];
const SCHOOL_STREAM_OPTIONS = ['Science', 'Commerce', 'Arts & Humanities', 'Vocational', 'Other'];
const SUBJECT_COMBINATION_OPTIONS = ['PCM', 'PCB', 'PCMB', 'Commerce with Maths', 'Commerce', 'Humanities', 'Other'];
const EXAM_GOAL_OPTIONS = ['None / Exploring', 'JEE', 'NEET', 'CUET', 'CLAT', 'NDA', 'CA Foundation', 'Other'];
const COACHING_LEVEL_OPTIONS = ['Class 9–10', 'Class 11–12', 'Undergraduate', 'Graduate', 'Working professional', 'Other'];
const COACHING_FOCUS_OPTIONS = ['Engineering / JEE', 'Medical / NEET', 'Government exams', 'Management / CAT', 'Law / CLAT', 'Other'];
const COACHING_MODE_OPTIONS = ['Online', 'Offline', 'Hybrid', 'Self-paced', 'Other'];
type InstitutionType = 'school' | 'college' | 'coaching';

const INSTITUTION_TYPE_OPTIONS: Array<{ value: InstitutionType; label: string }> = [
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'coaching', label: 'Coaching Institute' },
];

function educationParts(user: User) {
  return [user.academicStream, user.branch, user.degree, user.programGroup]
    .flatMap(value => String(value || '').split(/[·|—]/))
    .map(value => value.trim())
    .filter(Boolean);
}

function initialSchoolClass(user: User) {
  const match = educationParts(user).join(' ').match(/\b(?:class\s*)?(9|10|11|12)(?:st|nd|rd|th)?\b/i);
  return match ? `Class ${match[1]}` : '';
}

function initialSchoolOption(user: User, options: string[]) {
  const parts = educationParts(user).map(value => value.toLowerCase());
  return options.find(option => parts.includes(option.toLowerCase())) || '';
}

function initialInstitutionType(user: User): InstitutionType {
  if (user.coachingName?.trim()) return 'coaching';
  if (user.schoolName?.trim()) return 'school';
  return 'college';
}

function initialInstitutionName(user: User, type: InstitutionType): string {
  if (type === 'coaching') return user.coachingName || '';
  if (type === 'school') return user.schoolName || '';
  return user.college || '';
}

function institutionDisplayName(user: User): string {
  const seen = new Set<string>();
  return [user.schoolName, user.coachingName, user.college]
    .flatMap(value => String(value || '').split(/[·|—]/))
    .map(value => value.trim())
    .filter(value => {
      if (!value) return false;
      const key = value.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(' · ');
}

interface ProfileModalProps {
  user: User;
  currentUser: User;
  communities: Community[];
  onClose: () => void;
  onSelectCommunity: (slug: string) => void;
  onToggleConnect: (
    userId: string,
    type?: Connection['type'],
    message?: string,
  ) => void | Promise<void>;
  onStartDirectChat: (user: User) => void;
  onUpdateCurrentUserProfile?: (updatedUser: Partial<User>) => void;
  onUpdateDirectMessagePreference?: (preference: NonNullable<User['directMessagePreference']>) => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  currentUser,
  communities,
  onClose,
  onSelectCommunity,
  onToggleConnect,
  onStartDirectChat,
  onUpdateCurrentUserProfile,
  onUpdateDirectMessagePreference,
}) => {
  const isMe = user.id === currentUser.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editAvatar, setEditAvatar] = useState(user.avatar);
  const [editBio, setEditBio] = useState(user.bio);
  const [editInstitutionType, setEditInstitutionType] = useState<InstitutionType>(() => initialInstitutionType(user));
  const [editInstitutionName, setEditInstitutionName] = useState(() => initialInstitutionName(user, initialInstitutionType(user)));
  const [editLocation, setEditLocation] = useState(user.location || '');
  const [editBranch, setEditBranch] = useState(user.branch);
  const [editDegree, setEditDegree] = useState(user.degree || '');
  const [editProgramGroup, setEditProgramGroup] = useState(user.programGroup || user.academicCategory || '');
  const [editFields, setEditFields] = useState(user.fields || []);
  const [editAcademicCategory, setEditAcademicCategory] = useState(user.academicCategory || '');
  const [editYear, setEditYear] = useState(user.year || '');
  const [editInterests, setEditInterests] = useState(user.interests || []);
  const [editSkills, setEditSkills] = useState(user.skills || []);
  const [editGoals, setEditGoals] = useState(user.goals || []);
  const [editMentor, setEditMentor] = useState(Boolean(user.mentorInfo?.isMentor));
  const isSchoolProfile = editInstitutionType === 'school';
  const isCoachingProfile = editInstitutionType === 'coaching';
  const [editClassLevel, setEditClassLevel] = useState(() => initialSchoolClass(user));
  const [editSchoolStream, setEditSchoolStream] = useState(() => initialSchoolOption(user, SCHOOL_STREAM_OPTIONS));
  const [editSubjectCombination, setEditSubjectCombination] = useState(() => initialSchoolOption(user, SUBJECT_COMBINATION_OPTIONS));
  const [editExamGoal, setEditExamGoal] = useState(() => (
    initialSchoolOption(user, EXAM_GOAL_OPTIONS)
    || (EXAM_GOAL_OPTIONS.includes(user.degree || '') ? user.degree : 'None / Exploring')
  ));
  const [institutionError, setInstitutionError] = useState('');
  const [directMessagePreference, setDirectMessagePreference] = useState<User['directMessagePreference']>(
    currentUser.directMessagePreference || 'connections',
  );
  const [savingDirectMessagePreference, setSavingDirectMessagePreference] = useState(false);
  const [safetyError, setSafetyError] = useState('');
  const [safetyNotice, setSafetyNotice] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<Array<{ id: string; name: string; avatar: string; college: string }>>([]);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);
  const institutionLabel = INSTITUTION_TYPE_OPTIONS.find(option => option.value === editInstitutionType)?.label || 'Institution';
  const availableForItems = Array.isArray(user.availableFor)
    ? user.availableFor
    : Object.entries(user.availableFor ?? {})
      .filter(([, enabled]) => enabled)
      .map(([item]) => item);

  useEffect(() => {
    if (!isMe) return;
    setLoadingBlockedUsers(true);
    api.safety.getBlockedUsers()
      .then(setBlockedUsers)
      .catch((error: unknown) => setSafetyError(error instanceof Error ? error.message : 'Could not load blocked accounts.'))
      .finally(() => setLoadingBlockedUsers(false));
  }, [isMe]);

  const handleSaveDirectMessagePreference = async (value: NonNullable<User['directMessagePreference']>) => {
    if (!onUpdateDirectMessagePreference || savingDirectMessagePreference) return;
    setSafetyError('');
    setSafetyNotice('');
    setSavingDirectMessagePreference(true);
    try {
      await onUpdateDirectMessagePreference(value);
      setDirectMessagePreference(value);
      setSafetyNotice('Direct message privacy updated.');
    } catch (error) {
      setSafetyError(error instanceof Error ? error.message : 'Could not update direct message privacy.');
    } finally {
      setSavingDirectMessagePreference(false);
    }
  };

  const handleUnblockUser = async (blockedUserId: string) => {
    setSafetyError('');
    try {
      await api.safety.unblock(blockedUserId);
      setBlockedUsers((current) => current.filter((blockedUser) => blockedUser.id !== blockedUserId));
    } catch (error) {
      setSafetyError(error instanceof Error ? error.message : 'Could not unblock this account.');
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setEditAvatar(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const toggleSelection = (
    value: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setSelected((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = editName.trim();
    const institutionName = editInstitutionName.trim();
    if (!name) {
      setInstitutionError('Please enter your full name first.');
      return;
    }
    const hasInstitution = Boolean(institutionName);
    if (!hasInstitution) {
      setInstitutionError('Please select or add your school, college, or institute name first.');
      return;
    }
    setInstitutionError('');
    const schoolAcademicStream = [editClassLevel, editSchoolStream, editSubjectCombination]
      .filter(Boolean)
      .join(' · ');
    const schoolBranch = [editSchoolStream, editSubjectCombination]
      .filter(Boolean)
      .join(' · ');
    const schoolYear = editClassLevel.match(/\d+/)?.[0] || '';
    const savedDegree = isSchoolProfile
      ? (editExamGoal === 'None / Exploring' ? 'School Student' : editExamGoal)
      : isCoachingProfile
        ? (editExamGoal === 'None / Exploring' ? 'Coaching Student' : editExamGoal)
        : editDegree;
    const savedAcademicStream = isSchoolProfile
      ? (schoolAcademicStream || editAcademicCategory)
      : isCoachingProfile
        ? editBranch
        : editAcademicCategory;
    const savedProgramGroup = isSchoolProfile
      ? 'School'
      : isCoachingProfile
        ? 'Coaching'
        : editProgramGroup;
    if (onUpdateCurrentUserProfile) {
      onUpdateCurrentUserProfile({
        name,
        avatar: editAvatar,
        bio: editBio,
        college: institutionName,
        schoolName: editInstitutionType === 'school' ? institutionName : '',
        coachingName: editInstitutionType === 'coaching' ? institutionName : '',
        location: editLocation.trim(),
        branch: isSchoolProfile ? (schoolBranch || editBranch) : editBranch,
        degree: savedDegree,
        programGroup: savedProgramGroup,
        fields: editFields,
        academicStream: savedAcademicStream,
        academicCategory: editAcademicCategory,
        year: isSchoolProfile ? (schoolYear || editYear) : editYear,
        interests: editInterests,
        skills: editSkills,
        goals: editGoals,
        mentorInfo: editMentor
          ? {
              isMentor: true,
              rating: user.mentorInfo?.rating || 5,
              studentsHelped: user.mentorInfo?.studentsHelped || 0,
              price: user.mentorInfo?.price || 'Free',
              speciality: user.mentorInfo?.speciality || editSkills[0] || 'Peer mentoring',
              companyOrRole: user.mentorInfo?.companyOrRole || `${editBranch} student`,
            }
          : undefined,
      });
    }
    setIsEditing(false);
    confetti({ particleCount: 30, spread: 50 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in sm:p-4">
      <div className="bg-white rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 shadow-2xl max-w-2xl w-full h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto relative my-0 sm:my-8">
        {/* Top Floating Controls */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-3.5 border-b border-slate-100 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Student Profile
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                confetti({ particleCount: 20, spread: 35 });
              }}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
              title="Share profile"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6 space-y-6">
          {/* Header Identity Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <SafeAvatar
                src={user.avatar}
                name={user.name}
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-50 shadow-md"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-black text-slate-900">{user.name}</h1>
                  {user.verified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Verified Student
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  {institutionDisplayName(user)}
                </p>
                {user.academicCategory && (
                  <p className="text-xs font-bold text-indigo-600 mt-0.5">{user.academicCategory}</p>
                )}
                <p className="text-xs text-slate-500">
                  {getEducationDisplay(user).compact}
                </p>
                {user.location && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{user.location}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Main Action CTAs */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isMe ? (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onToggleConnect(user.id);
                      if (!user.isConnected && !user.connectionPending) {
                        confetti({ particleCount: 30, spread: 50 });
                      }
                    }}
                    disabled={user.isConnected || user.connectionPending}
                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      user.isConnected || user.connectionPending
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    }`}
                  >
                    {user.isConnected ? 'Connected ✓' : user.connectionPending ? 'Requested' : 'Connect'}
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      onStartDirectChat(user);
                    }}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                    title="Send message"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {isMe && (
            <section aria-labelledby="direct-message-privacy-title" className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div>
                <h2 id="direct-message-privacy-title" className="text-sm font-bold text-slate-900">Safety &amp; privacy</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Connection requests stay separate. This setting controls who can start a direct message with you.
                </p>
              </div>
              <label className="block text-xs font-bold text-slate-700" htmlFor="direct-message-preference">
                Who can send you direct messages?
                <select
                  id="direct-message-preference"
                  value={directMessagePreference || 'connections'}
                  disabled={savingDirectMessagePreference || !onUpdateDirectMessagePreference}
                  onChange={(event) => void handleSaveDirectMessagePreference(event.target.value as NonNullable<User['directMessagePreference']>)}
                  className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 disabled:opacity-60"
                >
                  <option value="everyone">Everyone</option>
                  <option value="connections">Accepted connections only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </label>
              {savingDirectMessagePreference && <p role="status" className="text-xs text-indigo-700">Saving privacy setting…</p>}
              {loadingBlockedUsers && <p role="status" className="text-xs text-slate-500">Loading blocked accounts…</p>}
              {blockedUsers.length > 0 && (
                <div className="space-y-2 border-t border-indigo-100 pt-3">
                  <h3 className="text-xs font-bold text-slate-800">Blocked accounts</h3>
                  {blockedUsers.map((blockedUser) => (
                    <div key={blockedUser.id} className="flex items-center gap-2">
                      <SafeAvatar src={blockedUser.avatar} name={blockedUser.name} className="h-8 w-8 rounded-full object-cover" />
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{blockedUser.name}</span>
                      <button
                        type="button"
                        onClick={() => void handleUnblockUser(blockedUser.id)}
                        className="min-h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {safetyError && <p role="alert" className="text-xs font-semibold text-rose-700">{safetyError}</p>}
              {safetyNotice && <p role="status" className="text-xs font-semibold text-emerald-700">{safetyNotice}</p>}
            </section>
          )}

          {/* Inline Edit Form */}
          {isEditing && (
            <form onSubmit={handleSaveEdit} className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
              <div>
                <h3 className="text-sm font-black text-indigo-900">Set up your student profile</h3>
                <p className="text-[11px] text-indigo-700/70 mt-0.5">These answers personalize your feed with relevant communities, courses and people.</p>
                <p className="mt-2 rounded-lg border border-indigo-200 bg-white/70 px-2.5 py-2 text-[10px] font-semibold leading-relaxed text-indigo-800">
                  Add your school, college, or institute so other students can find you. Select an existing name or add your own.
                </p>
              </div>
              <div>
                <label htmlFor="profile-full-name" className="text-[10px] font-bold text-slate-600">Full name</label>
                <input
                  id="profile-full-name"
                  type="text"
                  value={editName}
                  onChange={(event) => {
                    setEditName(event.target.value);
                    if (event.target.value.trim()) setInstitutionError('');
                  }}
                  placeholder="Enter your full name"
                  maxLength={80}
                  autoComplete="name"
                  className="mt-1 w-full text-sm p-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-white p-3">
                <SafeAvatar
                  src={editAvatar}
                  name={editName}
                  className="h-14 w-14 rounded-2xl object-cover ring-2 ring-indigo-50"
                />
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-800">Profile photo</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Use a clear photo so students recognize you.</p>
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-2 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100">
                  <Camera className="h-3.5 w-3.5" />
                  Change
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div>
                   <label htmlFor="profile-institution-type" className="text-[10px] font-bold text-slate-600">Institution type</label>
                   <select
                     id="profile-institution-type"
                     value={editInstitutionType}
                     onChange={(e) => {
                       const nextType = e.target.value as InstitutionType;
                       setEditInstitutionType(nextType);
                       setEditInstitutionName(initialInstitutionName(user, nextType));
                       setInstitutionError('');
                     }}
                     className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                   >
                     {INSTITUTION_TYPE_OPTIONS.map(option => (
                       <option key={option.value} value={option.value}>{option.label}</option>
                     ))}
                   </select>
                 </div>
                 <CollegeSelector
                   id="profile-institution"
                   value={editInstitutionName}
                   onChange={(value) => {
                     setEditInstitutionName(value);
                     if (value.trim()) setInstitutionError('');
                   }}
                   darkMode={false}
                   label={`${institutionLabel} name`}
                    placeholder={
                      editInstitutionType === 'school'
                        ? 'Type your school name...'
                        : editInstitutionType === 'coaching'
                          ? 'Type your coaching institute...'
                          : 'Type your university or college...'
                    }
                 />
                 {institutionError && (
                   <p className="sm:col-span-2 text-[10px] font-semibold text-rose-600">{institutionError}</p>
                 )}
                  {isSchoolProfile ? (
                   <>
                     <div>
                       <label className="text-[10px] font-bold text-slate-600">Class level</label>
                       <select value={editClassLevel} onChange={(e) => setEditClassLevel(e.target.value)} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white">
                         <option value="">Select class</option>
                         {SCHOOL_CLASS_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-600">Academic stream</label>
                       <select value={editSchoolStream} onChange={(e) => setEditSchoolStream(e.target.value)} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white">
                         <option value="">Select stream</option>
                         {SCHOOL_STREAM_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-600">Subject combination</label>
                       <select value={editSubjectCombination} onChange={(e) => setEditSubjectCombination(e.target.value)} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white">
                         <option value="">Select subjects</option>
                         {SUBJECT_COMBINATION_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-600">Exam goal</label>
                       <select value={editExamGoal} onChange={(e) => setEditExamGoal(e.target.value)} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white">
                         {EXAM_GOAL_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                       </select>
                     </div>
                   </>
                  ) : isCoachingProfile ? (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600">Preparation goal</label>
                        <select value={editExamGoal} onChange={(e) => setEditExamGoal(e.target.value)} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white">
                          {EXAM_GOAL_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600">Current level</label>
                        <select value={editYear} onChange={(e) => setEditYear(e.target.value)} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white">
                          <option value="">Select level</option>
                          {COACHING_LEVEL_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600">Subject / focus</label>
                        <select value={editBranch} onChange={(e) => setEditBranch(e.target.value)} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white">
                          <option value="">Select focus</option>
                          {COACHING_FOCUS_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600">Learning mode</label>
                        <select value={editProgramGroup} onChange={(e) => setEditProgramGroup(e.target.value)} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white">
                          <option value="">Select mode</option>
                          {COACHING_MODE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                   <>
                     <div>
                       <label className="text-[10px] font-bold text-slate-600">Branch / Department</label>
                       <select value={editBranch} onChange={(e) => setEditBranch(e.target.value)} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white">
                         <option value="">Select branch</option>
                         {BRANCH_OPTIONS.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-600">Current year</label>
                       <select value={editYear} onChange={(e) => setEditYear(e.target.value)} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white">
                         <option value="">Select year</option>
                         {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year', 'Graduated'].map((year) => <option key={year} value={year}>{year}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-600">Academic stream</label>
                       <select
                         value={editAcademicCategory}
                         onChange={(e) => setEditAcademicCategory(e.target.value)}
                         className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                       >
                         <option value="">Select stream</option>
                         {ACADEMIC_CATEGORY_OPTIONS.map((option) => (
                           <option key={option} value={option}>{option}</option>
                         ))}
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-600">Degree / qualification</label>
                       <select value={editDegree} onChange={(e) => setEditDegree(e.target.value)} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white">
                         <option value="">Select degree</option>
                         {DEGREE_OPTIONS.map((degree) => <option key={degree} value={degree}>{degree}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-600">Program group</label>
                       <select
                         value={editProgramGroup}
                         onChange={(e) => setEditProgramGroup(e.target.value)}
                         className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                       >
                         <option value="">Select program group</option>
                         {PROGRAM_GROUP_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                       </select>
                     </div>
                   </>
                 )}
                 <div className="sm:col-span-2">
                   <label className="text-[10px] font-bold text-slate-600">Location</label>
                   <div className="relative">
                     <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                     <input
                       value={editLocation}
                       onChange={(e) => setEditLocation(e.target.value)}
                       placeholder="City, state or campus"
                       className="w-full text-xs p-2 pl-8 rounded-lg border border-slate-200 bg-white"
                     />
                   </div>
                 </div>
               </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600">Fields you’re exploring</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {FIELD_OPTIONS.map(field => (
                    <button
                      type="button"
                      key={field}
                      onClick={() => setEditFields(current => current.includes(field) ? current.filter(item => item !== field) : [...current, field])}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                        editFields.includes(field)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {field}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600">What are you doing right now?</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  placeholder="e.g. Building a campus project, preparing for GATE, looking for a web development team..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600">Interests</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {INTEREST_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => toggleSelection(option, editInterests, setEditInterests)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        editInterests.includes(option)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600">What do you know?</label>
                <p className="text-[9px] text-slate-400 mt-0.5">Select your languages, tools and skills</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {SKILL_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => toggleSelection(option, editSkills, setEditSkills)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        editSkills.includes(option)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600">What are you looking for?</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {LOOKING_FOR_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => toggleSelection(option, editGoals, setEditGoals)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        editGoals.includes(option)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-100 bg-emerald-50/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editMentor}
                  onChange={(e) => setEditMentor(e.target.checked)}
                  className="mt-0.5 accent-emerald-600"
                />
                <span>
                  <span className="block text-xs font-bold text-emerald-900">I can mentor juniors</span>
                  <span className="block text-[10px] text-emerald-700/80 mt-0.5">Show me to students looking for help in my branch or skills.</span>
                </span>
              </label>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </form>
          )}

          {/* Quick Stats Ribbon */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div>
              <p className="text-xs sm:text-sm font-black text-slate-900">
                {user.connectionsCount ?? user.stats?.connectionsCount ?? 0}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">Connections</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-slate-900">
                {user.communities.length}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">Communities</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-slate-900">
                {user.projects?.length ?? 0}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">Projects</p>
            </div>
          </div>

          {/* About Bio */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">About</h3>
            <p className="text-xs text-slate-600 leading-relaxed bg-white p-3.5 rounded-2xl border border-slate-100">
              {user.bio}
            </p>
          </div>

          {/* Goals & Target */}
          {user.goals && user.goals.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Current Goals & Focus
              </h3>
              <div className="flex flex-wrap gap-2">
                {user.goals.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>{g}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills & Domains */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Skills & Tech Stack
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {user.skills.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Available For */}
          {availableForItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Available For
              </h3>
              <div className="space-y-1.5">
                {availableForItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs font-semibold text-emerald-800"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Communities Joined */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Communities Active In
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {user.communities.map((commSlug) => {
                const community = communities.find((item) => item.slug === commSlug);
                if (!community) return null;
                return (
                  <div
                    key={commSlug}
                    onClick={() => {
                      onClose();
                      onSelectCommunity(commSlug);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-bold text-xs flex items-center justify-center">
                      {community.displayName.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate">{community.displayName}</span>
                  </div>
                );
              })}
              {user.communities.length === 0 && (
                <p className="col-span-full rounded-xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-400">
                  No communities joined yet.
                </p>
              )}
            </div>
          </div>

          {/* Projects & Work */}
          {user.projects && user.projects.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Projects & Work
              </h3>
              <div className="space-y-2.5">
                {user.projects.map((proj) => (
                  <div
                    key={proj.title}
                    className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">{proj.title}</h4>
                      {proj.githubLink && (
                        <a
                          href={`https://${proj.githubLink}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                        >
                          <Github className="w-3.5 h-3.5" />
                          <span>Code</span>
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{proj.description}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {proj.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white border border-slate-200 text-slate-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification details are shown only when the database says this
              profile completed institutional verification. */}
          {user.verified && (
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Institutional Identity Verified</p>
                  <p className="text-[10px] text-slate-400">
                    Verified student{user.verifiedCollege ? ` · ${user.verifiedCollege}` : ''}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Verified
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
