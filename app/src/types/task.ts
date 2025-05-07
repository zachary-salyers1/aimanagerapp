import { Timestamp } from 'firebase/firestore';

// Define possible task statuses
export const taskStatuses = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
} as const; // Use 'as const' for stricter typing

export type TaskStatus = keyof typeof taskStatuses;

export interface Task {
  id: string; // Firestore document ID
  projectId: string; // Link to the parent project
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: Timestamp; // Optional due date
  createdAt: Timestamp; // Added for sorting/tracking
} 