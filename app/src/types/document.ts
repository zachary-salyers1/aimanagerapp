import { Timestamp } from 'firebase/firestore';

export interface Document {
  id: string; // Firestore document ID
  projectId: string; // Link to the parent project
  taskId?: string; // Optional: Link to a specific task
  name: string; // Original file name
  storagePath: string; // Path in Firebase Storage
  downloadURL: string; // Publicly accessible download URL
  uploadedAt: Timestamp;
  uploaderId: string; // ID of the user who uploaded
  // driveFileId?: string; // Optional, for later Drive sync
} 