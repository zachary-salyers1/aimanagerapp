'use client';

import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Button } from "@/components/ui/button";
// Optional: Add an icon library if you want a Google logo
// import { FcGoogle } from "react-icons/fc"; 

export function GoogleSignInButton(): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn(): Promise<void> {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      // Sign-in successful, AuthProvider handles the state update
      console.log('Google Sign-in successful');
    } catch (err: any) {
      console.error("Google Sign-in error:", err);
      // Handle specific errors like popup closed by user if needed
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        {/* Optional: <FcGoogle className="mr-2 h-4 w-4" /> */}
        {isLoading ? 'Signing in...' : 'Sign in with Google'}
      </Button>
      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}
    </div>
  );
} 