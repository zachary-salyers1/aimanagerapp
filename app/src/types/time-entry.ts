import { Timestamp } from 'firebase/firestore';

export interface TimeEntry {
  id: string; // Firestore document ID
  projectId: string;
  taskId?: string; // Optional: Link to a specific task
  userId: string; // ID of the user who logged the time
  date: Timestamp; // Date the work was done
  hours: number; // Number of hours logged
  notes?: string; // Optional notes about the time entry
  createdAt: Timestamp; // When the entry was created
} 