'use client';

import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase/config';
import { useAuth } from '@/context/auth-context';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, File as FileIcon, X } from 'lucide-react';

interface DocumentUploadFormProps {
  projectId: string;
  // Optional taskId for linking to a specific task
  taskId?: string; 
}

export function DocumentUploadForm({ projectId, taskId }: DocumentUploadFormProps): React.ReactElement {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for resetting file input

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      setError(null); // Clear previous errors
    } else {
      setFile(null);
    }
  }
  
  function clearFileSelection(): void {
     setFile(null);
     setProgress(0);
     setError(null);
     if (fileInputRef.current) {
         fileInputRef.current.value = ""; // Reset the file input
     }
  }

  async function handleUpload(): Promise<void> {
    if (!file || !user) {
      setError("Please select a file and ensure you are logged in.");
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    // Define storage path (adjust structure as needed)
    const storagePath = `projects/${projectId}/${taskId ? `tasks/${taskId}/` : 'general/'}${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(currentProgress);
      },
      (uploadError: any) => {
        console.error("Upload Error:", uploadError);
        setError(`Upload failed: ${uploadError.message}`);
        setIsUploading(false);
        setProgress(0);
      },
      async () => {
        // Upload completed successfully
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('File available at', downloadURL);

          // Add document metadata to Firestore
          const docsCollection = collection(db, 'documents');
          await addDoc(docsCollection, {
            projectId: projectId,
            taskId: taskId || null, // Store taskId if provided
            name: file.name,
            storagePath: storagePath,
            downloadURL: downloadURL,
            uploadedAt: serverTimestamp(),
            uploaderId: user.uid,
          });
          
          console.log("Firestore document created successfully!");
          clearFileSelection(); // Clear selection on success
          
        } catch (firestoreError: any) {
           console.error("Firestore Error:", firestoreError);
           setError(`Failed to save document metadata: ${firestoreError.message}`);
        } finally {
           setIsUploading(false);
        }
      }
    );
  }

  return (
    <div className="border p-4 rounded-lg mb-6 bg-muted/40">
      <Label htmlFor="file-upload" className="font-semibold text-sm mb-2 block">Upload Document</Label>
      <div className="flex items-center gap-4">
        <Input 
          id="file-upload" 
          type="file" 
          onChange={handleFileChange} 
          ref={fileInputRef}
          className="flex-grow"
          disabled={isUploading}
        />
        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          size="sm"
        >
          <UploadCloud className="mr-2 h-4 w-4" /> 
          {isUploading ? `Uploading...` : 'Upload'}
        </Button>
        {file && (
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={clearFileSelection}
             disabled={isUploading}
             className="text-muted-foreground hover:text-destructive"
             title="Clear selection"
           >
             <X className="h-4 w-4" />
           </Button>
        )}
      </div>
      {file && !isUploading && (
          <div className="mt-2 text-sm text-muted-foreground flex items-center">
              <FileIcon className="h-4 w-4 mr-2 flex-shrink-0" /> 
              <span>Selected: {file.name}</span>
          </div>
      )}
      {isUploading && (
        <Progress value={progress} className="w-full mt-2 h-2" />
      )}
      {error && (
        <p className="text-sm font-medium text-destructive mt-2">{error}</p>
      )}
    </div>
  );
} 