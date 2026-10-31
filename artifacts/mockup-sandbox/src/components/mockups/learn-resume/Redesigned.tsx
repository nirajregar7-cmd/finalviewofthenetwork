import React, { useState } from "react";
import "./_group.css";
import { ArrowRight, BookOpen, ChevronDown, Route } from "lucide-react";

const topic = {
  name: "AI & Machine Learning",
  summaryPath: ["Python", "ML", "Deep Learning", "Project"],
  progressPercent: 0,
};

export function Redesigned() {
  const [roadmapOpen, setRoadmapOpen] = useState(false);

  return (
    <main className="flex min-h-[100dvh] items-start justify-center bg-[#f2f0e8] px-4 py-8 sm:items-center sm:px-8 sm:py-12">
      <section
        aria-labelledby="learning-title"
        className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#d8dfd3] bg-[#fffdf7] shadow-[0_18px_55px_rgba(43,68,59,0.09)]"
      >
        <div className="grid md:grid-cols-[1.2fr_0.8fr]">
          <div className="relative flex flex-col p-6 sm:p-9 lg:p-11">
            <div className="mb-8 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e6eee4] text-[#315f51]">
                <BookOpen aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <span className="font-['Outfit'] text-[11px] font-bold uppercase tracking-[0.16em] text-[#527363]">
                Your learning plan
              </span>
            </div>

            <p className="mb-2 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#a76146]">
              A good place to pick things back up.
            </p>
            <h1
              id="learning-title"
              className="max-w-xl font-['Outfit'] text-[2rem] font-semibold leading-[1.08] tracking-[-0.045em] text-[#263b34] sm:text-[2.75rem]"
            >
              Keep going with
              <br className="hidden sm:block" /> {topic.name}
            </h1>
            <p className="mt-4 max-w-md font-['Plus_Jakarta_Sans'] text-sm leading-6 text-[#66756c] sm:text-[15px]">
              {topic.summaryPath.join(" → ")}
            </p>

            <div className="mt-8 max-w-lg">
              <div className="mb-2.5 flex items-center justify-between gap-4 font-['Plus_Jakarta_Sans'] text-xs">
                <span className="font-semibold text-[#42584d]">Your progress</span>
                <span className="font-medium tabular-nums text-[#65746c]">
                  {topic.progressPercent}% complete
                </span>
              </div>
              <div
                aria-label={`${topic.progressPercent}% complete`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={topic.progressPercent}
                className="h-2.5 overflow-hidden rounded-full bg-[#e8e9de]"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-[#477462] transition-[width] duration-500"
                  style={{ width: `${topic.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#315f51] px-5 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#fffdf7] transition-colors hover:bg-[#264d41] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315f51]"
                onClick={() => setRoadmapOpen(true)}
                type="button"
              >
                Continue roadmap
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                aria-expanded={roadmapOpen}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d9dfd3] bg-transparent px-5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#40574b] transition-colors hover:bg-[#f2f5ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315f51]"
                onClick={() => setRoadmapOpen((open) => !open)}
                type="button"
              >
                {roadmapOpen ? "Hide roadmap" : "View roadmap"}
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform ${roadmapOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          </div>

          <aside className="relative flex min-h-[260px] flex-col justify-between overflow-hidden border-t border-[#dfe5d9] bg-[#edf2e9] p-6 sm:p-8 md:border-l md:border-t-0 lg:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full border border-[#d5e0d3]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-5 -top-11 h-32 w-32 rounded-full border border-[#d5e0d3]"
            />
            <div className="relative">
              <div className="mb-6 flex items-center gap-2 text-[#557362]">
                <Route aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                <span className="font-['Outfit'] text-[11px] font-bold uppercase tracking-[0.16em]">
                  The path ahead
                </span>
              </div>
              <ol className="relative space-y-4 before:absolute before:bottom-3 before:left-[11px] before:top-3 before:w-px before:bg-[#cad8c9]">
                {topic.summaryPath.map((step, index) => (
                  <li className="relative flex items-center gap-3.5" key={step}>
                    <span
                      aria-hidden="true"
                      className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        index === 0
                          ? "border-[#477462] bg-[#477462] text-[#fffdf7]"
                          : "border-[#c4d2c3] bg-[#f7f8f1] text-[#688171]"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#3f584b]">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="relative mt-8 flex items-start gap-3 border-t border-[#d5dfd2] pt-5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#dfe9dd] text-[#557362]">
                <BookOpen aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <p className="max-w-[220px] font-['Plus_Jakarta_Sans'] text-xs leading-5 text-[#64766a]">
                One step at a time. Your plan is here when you need it.
              </p>
            </div>
          </aside>
        </div>

        {roadmapOpen && (
          <div
            aria-label="Roadmap steps"
            className="border-t border-[#dfe5d9] bg-[#f8f8f1] px-6 py-5 sm:px-9 sm:py-6 lg:px-11"
            id="roadmap-details"
          >
            <p className="mb-3 font-['Outfit'] text-[11px] font-bold uppercase tracking-[0.16em] text-[#748075]">
              Your roadmap
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#40574b]">
              {topic.summaryPath.map((step, index) => (
                <React.Fragment key={step}>
                  {index > 0 && (
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-[#a0afa0]" />
                  )}
                  <span className="rounded-lg border border-[#dce4d8] bg-[#fffdf7] px-3 py-2">
                    {step}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default Redesigned;
