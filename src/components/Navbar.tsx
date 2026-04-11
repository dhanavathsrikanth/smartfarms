"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ShieldCheck, Loader2, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full border-b-4 border-primary/20 bg-background/80 backdrop-blur-xl transition-all">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between font-sans">
        
        {/* Logo/Branding */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-primary rounded-none transition-transform group-hover:rotate-12">
            <Zap className="w-5 h-5 text-black" />
          </div>
          <span className="text-h2 font-black italic tracking-tighter uppercase text-foreground">
            SmartFarm<span className="text-secondary opacity-80">OS</span>
          </span>
        </Link>

        {/* Right Aligned Auth Section */}
        <div className="flex items-center gap-6">
          <AuthLoading>
            <div className="flex items-center gap-2">
               <Loader2 className="w-4 h-4 text-zinc-300 animate-spin" />
               <span className="text-body font-black text-zinc-300 uppercase tracking-widest">Syncing</span>
            </div>
          </AuthLoading>

          <Authenticated>
            <div className="flex items-center gap-6 animate-in fade-in slide-in-from-right-2 duration-500">
              {/* Dashboard Link */}
              <Link href="/dashboard">
                <Button variant="ghost" className="flex items-center gap-2 text-zinc-400 hover:text-foreground font-black uppercase tracking-widest text-[10px] italic">
                  <LayoutDashboard className="w-4 h-4" />
                  Terminal Dashboard
                </Button>
              </Link>

              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Operational</span>
                <span className="text-body font-bold text-foreground italic">Authenticated</span>
              </div>
              <Badge className="hidden sm:flex bg-primary text-black border-none px-4 py-1 rounded-full font-black text-[9px] uppercase tracking-widest animate-pulse">
                System Live
              </Badge>
              <div className="border-2 border-primary rounded-full p-0.5 shadow-lg shadow-primary/10">
                <UserButton />
              </div>
            </div>
          </Authenticated>

          <Unauthenticated>
            {/* Safety Handshake: If Clerk is signed in but Convex isn't yet, we hide the button */}
            {(!isLoaded || isSignedIn) ? (
              <div className="flex items-center gap-2 text-zinc-300 animate-pulse">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">Handshake...</span>
              </div>
            ) : (
              <div className="flex items-center gap-6 animate-in fade-in slide-in-from-right-2 duration-500">
                <div className="hidden lg:flex items-center gap-2 text-zinc-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-body font-bold uppercase tracking-widest italic text-[10px]">Level 7 Security</span>
                </div>
                <SignInButton mode="modal">
                  <Button className="btn-primary-branding h-11 px-8 text-body uppercase tracking-[0.15em] italic">
                    Operator Entry
                  </Button>
                </SignInButton>
              </div>
            )}
          </Unauthenticated>
        </div>
      </div>
    </nav>
  );
}
