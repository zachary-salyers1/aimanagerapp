import { Timestamp } from 'firebase/firestore';

export interface Expense {
  id: string; // Firestore document ID
  projectId: string;
  userId: string; // ID of the user who logged the expense
  date: Timestamp; // Date the expense was incurred
  amount: number; // Expense amount (consider using a specific currency type/handling if needed)
  description: string;
  // Optional fields related to receipt upload
  receiptName?: string; 
  receiptPath?: string; // Path in Firebase Storage
  receiptURL?: string; // Public download URL for the receipt
  createdAt: Timestamp; // When the entry was created
  // driveFileId?: string; // Optional, for later Drive sync
} 