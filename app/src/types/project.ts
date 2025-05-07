import { Timestamp } from 'firebase/firestore';

export interface Project {
  id: string; // Firestore document ID
  name: string;
  description?: string; // Optional description
  createdAt: Timestamp;
  ownerId: string;
  driveFolderId?: string; // Optional, added later
} 