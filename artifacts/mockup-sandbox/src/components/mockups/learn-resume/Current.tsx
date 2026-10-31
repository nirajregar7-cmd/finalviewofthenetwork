import React from "react";
import "./_group.css";
import { BookOpen, GraduationCap } from "lucide-react";

const topic = {
  name: "AI & Machine Learning",
  summaryPath: "Python → ML → Deep Learning → Project",
  progressPercent: 62,
};

export function Current() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 flex items-start justify-center">
      <div className="w-full max-w-6xl">
        <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-white rounded-3xl border border-indigo-100 p-5 sm:p-6 relative overflow-hidden shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-xs">
                  <BookOpen className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider">
                  Continue learning
                </span>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {topic.name}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {topic.summaryPath}
                </p>
              </div>
              <div className="space-y-1.5 max-w-md">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Progress</span>
                  <span>{topic.progressPercent}% completed</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${topic.progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all">
                  Continue Roadmap
                </button>
                <button className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors">
                  View Roadmap
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end justify-center space-y-3">
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-tr from-indigo-100 to-purple-100 border border-indigo-200 flex items-center justify-center shadow-inner relative">
                <BookOpen className="h-12 w-12" />
                <span className="absolute -top-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                  <GraduationCap className="h-5 w-5" />
                </span>
              </div>
              <div className="text-center md:text-right">
                <p className="text-xs font-bold text-slate-900">
                  <span className="text-indigo-600 text-sm font-black">58</span> students
                </p>
                <p className="text-[11px] text-slate-500">learning together</p>
                <div className="flex -space-x-1.5 overflow-hidden justify-center md:justify-end mt-1">
                  <img
                    className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                    alt=""
                  />
                  <img
                    className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                    alt=""
                  />
                  <img
                    className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"
                    alt=""
                  />
                  <span className="h-5 w-5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    +53
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
