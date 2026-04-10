"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCurrentUser } from "../useCurrentUser";
import { useStoreUserEffect } from "../useStoreUserEffect";

export default function Home() {
  // We use useStoreUserEffect to ensure the user is synchronized on login
  useStoreUserEffect();
  
  // We use useCurrentUser to handle the UI state based on the database record existence
  const { isLoading, isAuthenticated } = useCurrentUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-50 dark:bg-black transition-colors duration-500 font-sans">
      <div className="z-10 w-full max-w-xl items-center justify-center flex flex-col gap-8 p-10 bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-all">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            SmartFarm <span className="text-emerald-500 italic">Core</span>
          </h1>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-emerald-500/20 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="text-zinc-400 font-medium animate-pulse">Establishing secure connection...</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="flex flex-col items-center gap-6 text-center py-6">
            <div className="space-y-2">
              <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Welcome Back</p>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xs">
                Your agricultural data is secured. Please sign in to resume your management tasks.
              </p>
            </div>
            <SignInButton mode="modal">
              <button className="w-full px-12 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0">
                Sign In to Dashboard
              </button>
            </SignInButton>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 w-full">
            <div className="flex items-center justify-between w-full p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center gap-3">
                <UserButton afterSignOutUrl="/" />
                <div className="flex flex-col">
                  <p className="text-[0.7rem] font-bold uppercase tracking-widest text-zinc-400">Operator</p>
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Systems Active</p>
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
                ))}
              </div>
            </div>
            <Content />
          </div>
        )}
      </div>
    </main>
  );
}

function Content() {
  const tasks = useQuery(api.tasks.get);
  const messages = useQuery(api.messages.getForCurrentUser);
  
  return (
    <div className="w-full flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Messages Section */}
      <section className="flex flex-col gap-5">
        <header className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Internal Messages</h2>
          </div>
          <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black rounded-full border border-blue-500/20">
            {messages?.length ?? 0}
          </span>
        </header>
        
        <div className="flex flex-col gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
          {messages === undefined ? (
            <Skeleton count={1} color="blue" />
          ) : messages.length === 0 ? (
            <EmptyState message="No personal broadcasts found" />
          ) : (
            messages.map(({ _id, body }) => (
              <div
                key={_id}
                className="p-5 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 shadow-sm"
              >
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">{body}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Tasks Section */}
      <section className="flex flex-col gap-5 border-t border-zinc-100 dark:border-zinc-800 pt-8">
        <header className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Field Logs</h2>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-full border border-emerald-500/20">
            {tasks?.length ?? 0}
          </span>
        </header>
        
        <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {tasks === undefined ? (
            <Skeleton count={2} color="emerald" />
          ) : tasks.length === 0 ? (
            <EmptyState message="No system logs available" />
          ) : (
            tasks.map(({ _id, text }) => (
              <div
                key={_id}
                className="p-5 bg-zinc-50 dark:bg-zinc-800/30 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-all cursor-default group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500/40 group-hover:bg-emerald-500 transition-colors"></div>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">{text}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Skeleton({ count, color }: { count: number; color: "blue" | "emerald" }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`h-16 w-full rounded-2xl animate-pulse bg-${color}-500/5 dark:bg-${color}-500/10`}></div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 px-4 flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-800/10 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
      <p className="text-zinc-400 dark:text-zinc-500 italic font-medium">{message}</p>
    </div>
  );
}
