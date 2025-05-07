'use client'; // This page now needs client-side hooks

import React, { useState } from 'react';
import { useAuth } from "@/context/auth-context";
import { LoginForm } from "@/components/auth/login-form";
import { SignUpForm } from "@/components/auth/signup-form";
import { ProjectList } from "@/components/projects/project-list";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";

export default function Home(): React.ReactElement {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);

  async function handleLogout(): Promise<void> {
    try {
      await signOut(auth);
      setShowLogin(true);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {user ? (
        <div>
          <nav className="bg-background border-b sticky top-0 z-10">
            <div className="container mx-auto px-4 h-16 flex justify-between items-center">
              <span className="font-semibold">Project Manager</span>
              <div>
                <span className="mr-4 text-sm text-muted-foreground">{user.email}</span>
                <Button onClick={handleLogout} variant="outline" size="sm">Logout</Button>
              </div>
            </div>
          </nav>
          <ProjectList />
        </div>
      ) : (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-24">
          {showLogin ? (
            <LoginForm onShowSignUp={() => setShowLogin(false)} />
          ) : (
            <SignUpForm onShowLogin={() => setShowLogin(true)} />
          )}
        </div>
      )}
    </main>
  );
}
