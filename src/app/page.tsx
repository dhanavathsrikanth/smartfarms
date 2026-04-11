"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Loader2, 
  ArrowRight,
  LayoutDashboard,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useStoreUserEffect } from "../useStoreUserEffect";

export default function Home() {
  useStoreUserEffect();

  return (
    <main className="flex-1 flex flex-col items-center">
      <AuthLoading>
        <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center bg-white">
          <Loader2 className="w-12 h-12 text-secondary animate-spin mb-4" />
          <p className="text-body font-black uppercase tracking-[0.3em] text-zinc-300">Synchronizing</p>
        </div>
      </AuthLoading>

      <Authenticated>
        <div className="flex-1 w-full flex flex-col items-center justify-center px-6 text-center bg-white relative overflow-hidden">
          <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <Badge className="bg-primary/20 text-secondary border-none px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] mb-4">
              Authorized Session Active
            </Badge>
            <h1 className="text-[64px] md:text-[84px] font-black leading-[0.85] tracking-tighter uppercase italic text-foreground">
              Terminal<br />
              <span className="text-secondary tracking-[-0.05em]">Unlocked</span>
            </h1>
            <p className="text-h2 text-zinc-500 font-medium max-w-xl mx-auto leading-tight uppercase tracking-tight">
              Operational clearance confirmed. Your dashboard is ready for execution.
            </p>
            <div className="pt-8">
              <Link href="/dashboard">
                <Button className="btn-primary-branding h-20 px-12 group text-h2 uppercase italic tracking-widest shadow-2xl shadow-primary/40">
                  Launch Dashboard
                  <LayoutDashboard className="ml-4 w-6 h-6 group-hover:rotate-12 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Authenticated>

      <Unauthenticated>
        <UnauthenticatedSplash />
      </Unauthenticated>
    </main>
  );
}

function UnauthenticatedSplash() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center px-6 text-center bg-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-1/2 h-1/2 bg-secondary rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <Badge className="bg-primary/20 text-secondary border-none px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] mb-4">
          Next-Gen Agricultural Intelligence
        </Badge>
        <h1 className="text-[64px] md:text-[84px] font-black leading-[0.85] tracking-tighter uppercase italic text-foreground text-left">
          Precision<br />
          <span className="text-secondary tracking-[-0.05em] ml-28 md:ml-40">Agriculture</span><br />
          Unified.
        </h1>
        <div className="h-4 w-48 bg-primary mx-auto mb-12 shadow-xl shadow-primary/20" />
        
        <p className="text-h2 text-zinc-500 font-medium max-w-xl mx-auto leading-tight uppercase tracking-tight">
          Manage your entire farm operation through a single, secure, real-time command interface.
        </p>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
          {(!isLoaded || isSignedIn) ? (
            <div className="flex flex-col items-center gap-4 p-8 border-4 border-zinc-100 rounded-[20px] bg-zinc-50/50 animate-pulse">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-zinc-300" />
                <span className="text-h2 font-black uppercase tracking-widest text-zinc-300">Security Handshake</span>
              </div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Finalizing authorization with backend...</p>
            </div>
          ) : (
            <>
              <SignUpButton mode="modal">
                <Button className="btn-primary-branding h-20 px-12 group text-h2 uppercase italic tracking-widest shadow-2xl shadow-primary/40">
                  Get Started
                  <Zap className="ml-4 w-6 h-6 group-hover:scale-125 transition-transform" />
                </Button>
              </SignUpButton>
              
              <SignInButton mode="modal">
                <Button variant="outline" className="border-4 border-zinc-100 h-20 px-12 rounded-[16px] text-zinc-400 font-black uppercase tracking-widest text-h2 hover:bg-zinc-50 transition-all group">
                  Sign In
                  <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </SignInButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
