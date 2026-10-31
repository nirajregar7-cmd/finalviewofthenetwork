import React, { useState } from 'react';
import {
  X,
  ChevronDown,
  ChevronLeft,
  HelpCircle,
  Link2,
  BarChart3,
  Hash,
  UsersRound,
  BriefcaseBusiness,
  BookOpen,
  Laptop2,
  Rocket,
  CalendarDays,
  Building2,
  MessageCircle,
  MoreHorizontal,
  GraduationCap,
  Coffee,
  Image as ImageIcon,
  EyeOff,
  ShieldCheck,
  Search,
  Plus,
  Trash2,
} from 'lucide-react';
import { Community, User } from '../types';
import confetti from 'canvas-confetti';
import { LinkPreview, extractUrls } from './LinkPreview';

interface CreatePostModalProps {
  communities: Community[];
  currentUser: User;
  onClose: () => void;
  initialMode?: 'post' | 'community';
  initialRequestType?: string;
  initialPostType?: 'post' | 'question' | 'project' | 'hackathon' | 'resource' | 'opportunity' | 'event' | 'collab';
  initialCommunitySlug?: string;
  initialTitle?: string;
  initialContent?: string;
  initialAnonymous?: boolean;
  onCreatePost: (postData: {
    communitySlug: string;
     type: 'post' | 'question' | 'project' | 'hackathon' | 'resource' | 'opportunity' | 'event' | 'collab';
    title: string;
    content: string;
    requestType?: string;
    prizePool?: string;
    teamSize?: string;
    deadline?: string;
    tags: string[];
    postImage?: string;
     postImages?: string[];
    fileName?: string;
    fileData?: string;
    fileMimeType?: string;
     pollOptions?: string[];
    websiteUrl?: string;
    isAnonymous?: boolean;
    anonymousTopic?: string;
  }) => void | Promise<void>;
  onCreateCommunity?: (communityData: {
    slug: string;
    displayName: string;
    description: string;
    category: 'college' | 'interest' | 'career';
  }) => void;
  onOpenAnonymous?: () => void;
}

const ANONYMOUS_REQUEST_TYPES = new Set([
  'study partner',
  'dsa practice partner',
  'library partner',
]);

const LOOKING_FOR_OPTIONS = [
  { value: '', label: 'Just sharing', icon: '✦' },
  { value: 'Study partner', label: 'Study partner', icon: '📚' },
  { value: 'DSA practice partner', label: 'DSA practice partner', icon: '🧩' },
  { value: 'Library partner', label: 'Library partner', icon: '🔖' },
  { value: 'Project teammate', label: 'Project teammate', icon: '💻' },
  { value: 'Exam teammate', label: 'Exam teammate', icon: '🏆' },
  { value: 'Hackathon team', label: 'Hackathon team', icon: '🚀' },
  { value: 'Mentor', label: 'Mentor / Guidance', icon: '🎓' },
  { value: 'Friendship', label: 'Friend / Hangout', icon: '☕' },
  { value: 'Someone to talk to', label: 'Someone to talk to', icon: '💬' },
  { value: 'Anything else', label: 'Something else', icon: '•••' },
] as const;

const CONTENT_TYPE_OPTIONS = [
  { id: 'collab', label: 'Match request', icon: '🤝' },
  { id: 'post', label: 'Campus Update', icon: '🏫' },
  { id: 'question', label: 'Question / Doubt', icon: '❓' },
  { id: 'opportunity', label: 'Opportunity', icon: '💼' },
  { id: 'resource', label: 'Resource', icon: '📚' },
  { id: 'project', label: 'Project', icon: '💻' },
  { id: 'hackathon', label: 'Hackathon', icon: '🚀' },
  { id: 'event', label: 'Event', icon: '📅' },
] as const;

const LOOKING_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'Study partner': BookOpen,
  'DSA practice partner': Laptop2,
  'Library partner': BookOpen,
  'Project teammate': UsersRound,
  'Exam teammate': UsersRound,
  'Hackathon team': Rocket,
  Mentor: GraduationCap,
  Friendship: Coffee,
  'Someone to talk to': MessageCircle,
  'Anything else': MoreHorizontal,
};

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  question: HelpCircle,
  opportunity: BriefcaseBusiness,
  resource: BookOpen,
  project: Laptop2,
  hackathon: Rocket,
  event: CalendarDays,
  post: Building2,
  collab: UsersRound,
};

const MAX_POST_WORDS = 5000;

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function limitToWords(value: string, maxWords = MAX_POST_WORDS) {
  const words = value.match(/\S+/g);
  return words && words.length > maxWords ? words.slice(0, maxWords).join(' ') : value;
}

interface PostTextFieldsHandle {
  getValues: () => { title: string; content: string; linkInput: string };
}

interface PostTextDraftValues {
  title: string;
  content: string;
  linkInput: string;
}

interface PostTextFieldsProps {
  draftValuesRef: React.MutableRefObject<PostTextDraftValues>;
  showLinkInput: boolean;
  hasSubmitError: boolean;
  onEdited: () => void;
}

const PostTextFields = React.memo(React.forwardRef<PostTextFieldsHandle, PostTextFieldsProps>(
  function PostTextFields({ draftValuesRef, showLinkInput, hasSubmitError, onEdited }, ref) {
    const [title, setTitle] = useState(draftValuesRef.current.title);
    const [content, setContent] = useState(draftValuesRef.current.content);
    const [linkInput, setLinkInput] = useState(draftValuesRef.current.linkInput);

    React.useImperativeHandle(ref, () => ({
      getValues: () => ({ title, content, linkInput }),
    }), [content, linkInput, title]);

    const handleEdit = () => {
      if (hasSubmitError) onEdited();
    };
    const previewUrl = showLinkInput ? extractUrls(`${content}\n${linkInput}`)[0] : undefined;

    return (
      <>
        <div className="space-y-2">
          <label htmlFor="create-post-title" className="block text-xs font-black text-slate-800">Title</label>
          <input
            id="create-post-title"
            type="text"
            required
            maxLength={140}
            value={title}
            onChange={(event) => {
              draftValuesRef.current.title = event.target.value;
              setTitle(event.target.value);
              handleEdit();
            }}
            placeholder="Give your post a title"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none shadow-sm placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="create-post-body" className="block text-xs font-black text-slate-800">Body</label>
          <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm">
            <textarea
              id="create-post-body"
              rows={7}
              required
              value={content}
              onChange={(event) => {
                const nextContent = limitToWords(event.target.value);
                draftValuesRef.current.content = nextContent;
                setContent(nextContent);
                handleEdit();
              }}
              placeholder="What's on your mind?"
              className="min-h-[12rem] w-full resize-none rounded-2xl bg-transparent p-3.5 pb-8 text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
            />
            <span className="absolute bottom-3 right-3 text-[10px] font-semibold text-slate-400">
              {countWords(content)}/{MAX_POST_WORDS} words
            </span>
          </div>
        </div>

        {showLinkInput && (
          <div className="space-y-2">
            <input
              type="url"
              value={linkInput}
              onChange={(event) => {
                draftValuesRef.current.linkInput = event.target.value;
                setLinkInput(event.target.value);
                handleEdit();
              }}
              placeholder="Paste a link"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-indigo-400"
            />
            {previewUrl && <LinkPreview url={previewUrl} />}
          </div>
        )}
      </>
    );
  },
));

interface PollOptionsDraftHandle {
  getValues: () => string[];
}

interface PollOptionsDraftFieldsProps {
  optionsRef: React.MutableRefObject<string[]>;
  visible: boolean;
}

const PollOptionsDraftFields = React.memo(React.forwardRef<PollOptionsDraftHandle, PollOptionsDraftFieldsProps>(
  function PollOptionsDraftFields({ optionsRef, visible }: PollOptionsDraftFieldsProps, ref) {
    const [options, setOptions] = useState<string[]>(optionsRef.current);

    React.useImperativeHandle(ref, () => ({
      getValues: () => optionsRef.current,
    }), [optionsRef]);

    const updateOptions = (update: string[] | ((current: string[]) => string[])) => {
      setOptions((current) => {
        const next = typeof update === 'function' ? update(current) : update;
        optionsRef.current = next;
        return next;
      });
    };

    if (!visible) return null;

    return (
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
        <p className="mb-1 text-[11px] font-bold text-indigo-900">Poll options</p>
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={`poll-option-${index}`} className="flex items-center gap-2">
              <input
                type="text"
                value={option}
                onChange={(event) => updateOptions((current) => current.map((value, optionIndex) => (
                  optionIndex === index ? event.target.value : value
                )))}
                placeholder={`Option ${index + 1}`}
                maxLength={120}
                className="min-w-0 flex-1 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => updateOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white hover:text-rose-600"
                  aria-label={`Remove poll option ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={options.length >= 6}
          onClick={() => updateOptions((current) => [...current, ''])}
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 disabled:opacity-40"
        >
          <Plus className="h-3 w-3" /> Add option
        </button>
        <p className="mt-1 text-[10px] text-indigo-700">Add 2–6 choices, then select one when voting.</p>
      </div>
    );
  },
));

function SearchableCommunityPicker({
  communities,
  value,
  onChange,
}: {
  communities: Community[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedCommunity = communities.find((community) => community.slug === value);
  const filteredCommunities = communities.filter((community) => {
    const searchableText = `${community.displayName} ${community.name} ${community.slug}`.toLowerCase();
    return searchableText.includes(query.trim().toLowerCase());
  });

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-xs font-bold text-slate-800 outline-none transition hover:border-indigo-300"
      >
        <span className="truncate">{selectedCommunity?.displayName || selectedCommunity?.name || 'General Feed'}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-500" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search communities..."
              aria-label="Search communities"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-indigo-400"
            />
          </div>
          <div role="listbox" aria-label="Post to community" className="max-h-56 overflow-y-auto">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => { onChange(''); setQuery(''); setOpen(false); }}
              className={`w-full rounded-lg px-2.5 py-2 text-left text-xs ${
                !value ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              General Feed
            </button>
            {filteredCommunities.map((community) => (
              <button
                key={community.id}
                type="button"
                role="option"
                aria-selected={community.slug === value}
                onClick={() => { onChange(community.slug); setQuery(''); setOpen(false); }}
                className={`w-full rounded-lg px-2.5 py-2 text-left text-xs ${
                  community.slug === value ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="block truncate">{community.displayName || community.name}</span>
              </button>
            ))}
            {filteredCommunities.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-slate-400">No communities found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  communities,
  currentUser,
  onClose,
  initialMode = 'post',
  initialRequestType,
  initialPostType,
  initialCommunitySlug,
  initialTitle,
  initialContent,
  initialAnonymous = false,
  onCreatePost,
  onCreateCommunity,
  onOpenAnonymous,
}) => {
  const normalizedInitialRequestType =
    typeof initialRequestType === 'string' ? initialRequestType : '';
  const isInitialAnonymousRequest =
    normalizedInitialRequestType.toLowerCase() === 'anonymous';
  const [modalMode, setModalMode] = useState<'post' | 'community'>(initialMode);
  const [postType, setPostType] = useState<'post' | 'question' | 'project' | 'hackathon' | 'resource' | 'opportunity' | 'event' | 'collab'>(
    initialPostType || (initialAnonymous || isInitialAnonymousRequest ? 'collab' : normalizedInitialRequestType ? 'collab' : 'post')
  );
  const [requestType, setRequestType] = useState(
    normalizedInitialRequestType && !isInitialAnonymousRequest ? normalizedInitialRequestType : ''
  );
  const [openSelector, setOpenSelector] = useState<'looking' | 'category' | null>(null);
  const [communitySlug, setCommunitySlug] = useState(
    initialCommunitySlug !== undefined ? initialCommunitySlug : communities[0]?.slug || '/dsa',
  );
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showPollInput, setShowPollInput] = useState(false);
  const [postImages, setPostImages] = useState<string[]>([]);
  const [prizePool, setPrizePool] = useState('₹1L prize pool');
  const [teamSize, setTeamSize] = useState('Teams of 4');
  const [deadline, setDeadline] = useState('5 days left');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentData, setAttachmentData] = useState<string | null>(null);
  const [attachmentMimeType, setAttachmentMimeType] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(initialAnonymous || isInitialAnonymousRequest);
  const [respectConfirmed, setRespectConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);
  const postImageInputRef = React.useRef<HTMLInputElement>(null);
  const textFieldsRef = React.useRef<PostTextFieldsHandle>(null);
  const pollOptionsDraftRef = React.useRef<PollOptionsDraftHandle>(null);
  const textDraftValuesRef = React.useRef<PostTextDraftValues>({
    title: initialTitle || '',
    content: initialContent || '',
    linkInput: '',
  });
  const pollOptionsValuesRef = React.useRef<string[]>(['', '']);

  // New community form
  const [newCommSlug, setNewCommSlug] = useState('');
  const [newCommTitle, setNewCommTitle] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [newCommCat, setNewCommCat] = useState<'college' | 'interest' | 'career'>('interest');

  const handleAttachmentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError('Files must be 10 MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentName(file.name);
      setAttachmentMimeType(file.type || 'application/octet-stream');
      setAttachmentData(String(reader.result || ''));
      setSubmitError('');
    };
    reader.readAsDataURL(file);
  };

  const handlePostImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    event.target.value = '';
    if (!files.length) return;

    const availableSlots = 10 - postImages.length;
    if (availableSlots <= 0) {
      setSubmitError('You can attach up to 10 images.');
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      setSubmitError('Only the first 10 selected images were added.');
    } else {
      setSubmitError('');
    }

    const invalidFile = selectedFiles.find((file) => !file.type.startsWith('image/'));
    if (invalidFile) {
      setSubmitError('Please choose image files only.');
      return;
    }

    const oversizedFile = selectedFiles.find((file) => file.size > 8 * 1024 * 1024);
    if (oversizedFile) {
      setSubmitError('Each image must be 8 MB or smaller.');
      return;
    }

    try {
      const encodedImages = await Promise.all(selectedFiles.map((file) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('This image could not be read.'));
        reader.readAsDataURL(file);
      })));
      setPostImages((current) => [...current, ...encodedImages].slice(0, 10));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not read the selected images.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (modalMode === 'post') {
      const { title, content, linkInput } = textFieldsRef.current?.getValues() || textDraftValuesRef.current;
      const normalizedTitle = title.trim();
      const normalizedContent = content.trim();
      if (!normalizedTitle) {
        setSubmitError('Add a title before posting.');
        return;
      }
      if (!normalizedContent) {
        setSubmitError('Add a body before posting.');
        return;
      }
      if (!respectConfirmed) {
        setSubmitError('Please confirm that your post is respectful.');
        return;
      }
      const pollOptions = (pollOptionsDraftRef.current?.getValues() || pollOptionsValuesRef.current)
        .map((option) => option.trim())
        .filter(Boolean)
        .filter((option, index, options) => options.indexOf(option) === index)
        .slice(0, 6);
      if (showPollInput && pollOptions.length < 2) {
        setSubmitError('Add at least two poll options.');
        return;
      }

      setSubmitError('');
      setIsSubmitting(true);
      try {
        await onCreatePost({
          communitySlug,
          type: postType,
          title: normalizedTitle,
          content: normalizedContent,
           websiteUrl: linkInput.trim() || undefined,
          requestType: requestType || undefined,
          anonymousTopic: isAnonymous ? requestType || 'Campus life' : undefined,
           tags: [],
          postImages: postImages.length ? postImages : undefined,
          prizePool: postType === 'hackathon' ? prizePool : undefined,
          teamSize: postType === 'hackathon' ? teamSize : undefined,
          deadline: postType === 'hackathon' ? deadline : undefined,
          fileName: attachmentName || undefined,
          fileData: attachmentData || undefined,
          fileMimeType: attachmentMimeType || undefined,
          pollOptions: pollOptions.length >= 2 ? pollOptions : undefined,
          isAnonymous: ANONYMOUS_REQUEST_TYPES.has(requestType.trim().toLowerCase()) && isAnonymous,
        });
        confetti({ particleCount: 40, spread: 60 });
        onClose();
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Could not publish this post. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!newCommSlug.trim() || !newCommTitle.trim()) return;
      const formattedSlug = newCommSlug.startsWith('/') ? newCommSlug : `/${newCommSlug}`;
      if (onCreateCommunity) {
        onCreateCommunity({
          slug: formattedSlug,
          displayName: newCommTitle,
          description: newCommDesc || 'A student community for discussions & learning',
          category: newCommCat,
        });
      }
      confetti({ particleCount: 50, spread: 70 });
      onClose();
    }
  };

  const selectedLookingOption = LOOKING_FOR_OPTIONS.find((option) => option.value === requestType);
  const SelectedLookingIcon = LOOKING_ICON_MAP[requestType] || UsersRound;
  const selectedCategoryOption = CONTENT_TYPE_OPTIONS.find((option) => option.id === postType) || CONTENT_TYPE_OPTIONS.find((option) => option.id === 'post')!;
  const SelectedCategoryIcon = CATEGORY_ICON_MAP[postType] || Building2;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden overscroll-none bg-slate-900/60 backdrop-blur-xs animate-in fade-in p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 shadow-2xl max-w-xl w-full h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)] min-h-0 overflow-hidden relative my-0 sm:my-8 flex flex-col">
        {/* Header */}
        <div className="relative shrink-0 border-b border-slate-100 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={modalMode === 'post' ? onClose : () => setModalMode('post')}
            className="absolute left-4 top-4 rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 sm:left-6"
            aria-label={modalMode === 'post' ? 'Close create post' : 'Back to create post'}
          >
            {modalMode === 'post' ? <X className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <div className="mx-auto max-w-[240px] text-center">
            <h2 className="text-lg font-black tracking-tight text-slate-950">
              {modalMode === 'post' ? 'Create Post' : 'New Community'}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {modalMode === 'post' ? 'Share with your campus community' : 'Create a space for students to connect'}
            </p>
          </div>
          {modalMode === 'post' ? (
            <button
              type="button"
              onClick={() => setModalMode('community')}
              className="absolute right-4 top-4 rounded-lg px-2 py-1 text-[10px] font-bold text-indigo-600 transition hover:bg-indigo-50 sm:right-6"
            >
              New community
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 sm:right-6"
              aria-label="Close create community"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y p-4 pb-6 sm:p-6 space-y-4">
          {modalMode === 'post' ? (
            <>
               <div className="space-y-3">
                 <div className="flex gap-2">
                   <div className="relative min-w-0 flex-1">
                     <button
                       type="button"
                       aria-haspopup="listbox"
                       aria-expanded={openSelector === 'category'}
                       onClick={() => setOpenSelector((current) => current === 'category' ? null : 'category')}
                       className="flex w-full items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3 py-2.5 text-left text-xs font-bold text-slate-800 transition hover:border-indigo-300"
                     >
                       <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-100 text-indigo-700">
                         {postType === 'collab' ? <UsersRound className="h-4 w-4" /> : <SelectedCategoryIcon className="h-4 w-4" />}
                       </span>
                       <span className="min-w-0 flex-1 truncate">{postType === 'collab' ? 'Looking for' : selectedCategoryOption.label}</span>
                       <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                     </button>
                     {openSelector === 'category' && (
                       <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-slate-950/5">
                         <div className="flex items-center justify-between px-2 py-1.5">
                           <p className="text-xs font-black text-slate-800">Select category</p>
                           <button type="button" onClick={() => setOpenSelector(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Close category menu">
                             <X className="h-4 w-4" />
                           </button>
                         </div>
                         <div role="radiogroup" aria-label="Post category">
                           {CONTENT_TYPE_OPTIONS.map((option) => {
                             const selected = postType === option.id;
                             const OptionIcon = CATEGORY_ICON_MAP[option.id] || MoreHorizontal;
                             return (
                               <button
                                 key={option.id}
                                 type="button"
                                 role="radio"
                                 aria-checked={selected}
                                 onClick={() => {
                                   setPostType(option.id);
                                   setOpenSelector(null);
                                 }}
                                 className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-xs font-semibold transition ${
                                   selected ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-50'
                                 }`}
                               >
                                 <OptionIcon className={`h-4 w-4 ${selected ? 'text-indigo-600' : 'text-slate-500'}`} />
                                 <span className="flex-1">{option.id === 'collab' ? 'Looking for' : option.label}</span>
                                 {selected && <span className="text-sm font-black text-indigo-700">✓</span>}
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     )}
                   </div>

                   <div className="relative min-w-0 flex-1">
                     <button
                       type="button"
                       aria-haspopup="listbox"
                       aria-expanded={openSelector === 'looking'}
                       onClick={() => setOpenSelector((current) => current === 'looking' ? null : 'looking')}
                       className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-bold text-slate-800 transition hover:border-indigo-300"
                     >
                       <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                         <SelectedLookingIcon className="h-4 w-4" />
                       </span>
                       <span className="min-w-0 flex-1 truncate">{selectedLookingOption?.value ? selectedLookingOption.label : 'Choose one'}</span>
                       <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                     </button>
                     {openSelector === 'looking' && (
                       <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-slate-950/5">
                         <div className="flex items-center justify-between px-2 py-1.5">
                           <p className="text-xs font-black text-slate-800">What are you looking for?</p>
                           <button type="button" onClick={() => setOpenSelector(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Close looking-for menu">
                             <X className="h-4 w-4" />
                           </button>
                         </div>
                         <div role="radiogroup" aria-label="Looking for">
                           {LOOKING_FOR_OPTIONS.map((option) => {
                             const selected = requestType === option.value;
                             const OptionIcon = LOOKING_ICON_MAP[option.value] || (option.value ? MoreHorizontal : UsersRound);
                             return (
                               <button
                                 key={option.value || 'sharing'}
                                 type="button"
                                 role="radio"
                                 aria-checked={selected}
                                 onClick={() => {
                                   setRequestType(option.value);
                                   if (!ANONYMOUS_REQUEST_TYPES.has(option.value.toLowerCase())) setIsAnonymous(false);
                                   setOpenSelector(null);
                                 }}
                                 className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-xs font-semibold transition ${
                                   selected ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-50'
                                 }`}
                               >
                                 <OptionIcon className={`h-4 w-4 ${selected ? 'text-indigo-600' : 'text-slate-500'}`} />
                                 <span className="flex-1">{option.label}</span>
                                 {selected && <span className="text-sm font-black text-indigo-700">✓</span>}
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     )}
                   </div>
                 </div>

                  <PostTextFields
                    ref={textFieldsRef}
                    draftValuesRef={textDraftValuesRef}
                    showLinkInput={showLinkInput}
                    hasSubmitError={Boolean(submitError)}
                    onEdited={() => setSubmitError('')}
                  />

                  <div className="grid grid-cols-3 gap-2">
                   <button type="button" onClick={() => postImageInputRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-[11px] font-bold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50">
                     <ImageIcon className="h-4 w-4 text-slate-500" /> Photo
                   </button>
                   <button type="button" onClick={() => setShowLinkInput((current) => !current)} className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-bold transition ${showLinkInput ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}`}>
                     <Link2 className="h-4 w-4" /> Link
                   </button>
                   <button type="button" onClick={() => setShowPollInput((current) => !current)} className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-bold transition ${showPollInput ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}`}>
                     <BarChart3 className="h-4 w-4" /> Poll
                   </button>
                 </div>

                 <input
                   ref={postImageInputRef}
                   type="file"
                   accept="image/png,image/jpeg,image/webp,image/gif"
                   multiple
                   className="hidden"
                   onChange={handlePostImageUpload}
                 />

                 {postImages.length > 0 && (
                   <div className="grid grid-cols-3 gap-2">
                     {postImages.map((image, index) => (
                       <div key={`${image.slice(0, 24)}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                         <img src={image} alt={`Preview ${index + 1} of ${postImages.length}`} className="h-full w-full object-cover" />
                         <button type="button" onClick={() => setPostImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-1 text-[9px] font-bold text-white" aria-label={`Remove image ${index + 1}`}>
                           <X className="h-3 w-3" />
                         </button>
                       </div>
                     ))}
                   </div>
                 )}

                 <PollOptionsDraftFields
                   ref={pollOptionsDraftRef}
                   optionsRef={pollOptionsValuesRef}
                   visible={showPollInput}
                 />

                 <div className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 ${isAnonymous ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-200 bg-white'}`}>
                   <div className="flex min-w-0 items-center gap-2.5">
                     <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${isAnonymous ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                       <EyeOff className="h-4 w-4" />
                     </span>
                     <div className="min-w-0">
                       <p className="text-xs font-bold text-slate-800">Post as <span className={isAnonymous ? 'text-indigo-700' : 'text-slate-900'}>{isAnonymous ? 'Anonymous' : 'My profile'}</span></p>
                       <p className="mt-0.5 truncate text-[10px] text-slate-400">{isAnonymous ? 'Your profile stays hidden from other students.' : 'Your name and profile will be shown.'}</p>
                     </div>
                   </div>
                   <button
                     type="button"
                     role="switch"
                     aria-checked={isAnonymous}
                     disabled={!ANONYMOUS_REQUEST_TYPES.has(requestType.trim().toLowerCase())}
                     onClick={() => setIsAnonymous((current) => !current)}
                     className={`relative h-6 w-11 shrink-0 rounded-full transition ${isAnonymous ? 'bg-indigo-600' : 'bg-slate-200'} ${!ANONYMOUS_REQUEST_TYPES.has(requestType.trim().toLowerCase()) ? 'cursor-not-allowed opacity-50' : ''}`}
                     aria-label="Post anonymously"
                   >
                     <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${isAnonymous ? 'left-6' : 'left-1'}`} />
                   </button>
                 </div>

                 <div>
                   <label className="mb-1.5 block text-xs font-black text-slate-800">Post to</label>
                    <SearchableCommunityPicker
                      communities={communities}
                      value={communitySlug}
                      onChange={setCommunitySlug}
                    />
                 </div>

                 <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                   <input type="checkbox" required checked={respectConfirmed} onChange={(e) => setRespectConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
                   <span>
                     <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-900"><ShieldCheck className="h-4 w-4" /> Keep it respectful</span>
                     <span className="mt-1 block text-[10px] leading-relaxed text-emerald-800">No harassment, hate, or sharing someone’s private details.</span>
                   </span>
                 </label>

                 {postType === 'hackathon' && (
                   <div className="grid grid-cols-3 gap-2 rounded-xl border border-purple-100 bg-purple-50 p-3">
                     <input type="text" value={prizePool} onChange={(e) => setPrizePool(e.target.value)} aria-label="Prize pool" placeholder="Prize pool" className="w-full rounded-lg border border-purple-200 bg-white px-2 py-2 text-[10px]" />
                     <input type="text" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} aria-label="Team size" placeholder="Team size" className="w-full rounded-lg border border-purple-200 bg-white px-2 py-2 text-[10px]" />
                     <input type="text" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-label="Deadline" placeholder="Deadline" className="w-full rounded-lg border border-purple-200 bg-white px-2 py-2 text-[10px]" />
                   </div>
                 )}

                 {attachmentName && (
                   <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
                     <span className="truncate">{attachmentName}</span>
                     <button type="button" onClick={() => attachmentInputRef.current?.click()} className="ml-2 shrink-0 font-bold text-indigo-600">Replace</button>
                   </div>
                 )}
                 <input ref={attachmentInputRef} type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={handleAttachmentUpload} className="hidden" />
               </div>
            </>
          ) : (
            /* Create Community Mode */
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Community Handle (Slug)
                </label>
                <input
                  type="text"
                  required
                  value={newCommSlug}
                  onChange={(e) => setNewCommSlug(e.target.value)}
                  placeholder="e.g. /rust-lang or /quantum-computing"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono focus:bg-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={newCommTitle}
                  onChange={(e) => setNewCommTitle(e.target.value)}
                  placeholder="e.g. Rust Programming & Systems"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <select
                  value={newCommCat}
                  onChange={(e) => setNewCommCat(e.target.value as any)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none"
                >
                  <option value="interest">Interest / Technology</option>
                  <option value="career">Career / Exam (GATE, JEE, Placements)</option>
                  <option value="college">College / University</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Purpose / Description
                </label>
                <textarea
                  rows={3}
                  value={newCommDesc}
                  onChange={(e) => setNewCommDesc(e.target.value)}
                  placeholder="What is this community about? What should students share here?"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </>
          )}
          </div>

          {submitError && (
            <p role="alert" className="px-4 pb-2 text-[11px] leading-relaxed text-rose-600 sm:px-6">
              {submitError}
            </p>
          )}
          {/* Submit */}
          <div className="shrink-0 border-t border-slate-100 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
            {modalMode === 'post' ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? 'Posting…' : 'Post'}
              </button>
            ) : (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isSubmitting ? 'Creating…' : 'Create Community'}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
