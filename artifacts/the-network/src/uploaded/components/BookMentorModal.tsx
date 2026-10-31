import React, { useState } from 'react';
import { X, Calendar, Clock, Star, CheckCircle2, Video, GraduationCap } from 'lucide-react';
import { User } from '../types';
import confetti from 'canvas-confetti';

interface BookMentorModalProps {
  mentor: User;
  onClose: () => void;
}

export const BookMentorModal: React.FC<BookMentorModalProps> = ({ mentor, onClose }) => {
  const [selectedDate, setSelectedDate] = useState('Tomorrow, 6:00 PM');
  const [sessionTopic, setSessionTopic] = useState('Resume Review & Placement Strategy');
  const [booked, setBooked] = useState(false);

  const handleConfirm = () => {
    setBooked(true);
    confetti({ particleCount: 45, spread: 65 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden relative my-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-black text-slate-900">Book 1:1 Mentorship</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Mentor details card */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
            <img
              src={mentor.avatar}
              alt={mentor.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-xs"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">{mentor.name}</h3>
                <span className="text-xs font-bold text-amber-700">
                  {mentor.mentorInfo?.price || 'Free'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">{mentor.mentorInfo?.companyOrRole}</p>
              <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold mt-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{mentor.mentorInfo?.rating}</span>
                <span className="text-slate-400">· {mentor.mentorInfo?.studentsHelped} helped</span>
              </div>
            </div>
          </div>

          {booked ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 animate-in zoom-in-95">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-900">Session Confirmed!</h4>
              <p className="text-xs text-emerald-700">
                Google Meet link and calendar invite sent to your student email. See you at {selectedDate}!
              </p>
              <button
                onClick={onClose}
                className="mt-3 px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Session topic */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Session Topic / Goal
                </label>
                <select
                  value={sessionTopic}
                  onChange={(e) => setSessionTopic(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                >
                  <option value="Resume Review & Placement Strategy">Resume Review & Placement Strategy</option>
                  <option value="GATE Preparation & Strategy Guidance">GATE Preparation & Strategy Guidance</option>
                  <option value="Mock Technical Interview (DSA/System Design)">Mock Technical Interview (DSA/System Design)</option>
                  <option value="Research Paper / Higher Studies Planning">Research Paper / Higher Studies Planning</option>
                </select>
              </div>

              {/* Slot selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Choose Available Time Slot
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      'Tomorrow, 6:00 PM',
                      'Tomorrow, 8:30 PM',
                      'Saturday, 11:00 AM',
                      'Sunday, 5:00 PM',
                    ] as const
                  ).map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedDate(slot)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        selectedDate === slot
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs ring-1 ring-indigo-200'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{slot}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Confirm Booking</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
