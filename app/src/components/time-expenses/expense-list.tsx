'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, QuerySnapshot, DocumentData, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from '@/lib/firebase/config';
import { useAuth } from '@/context/auth-context';
import { Expense } from '@/types/expense';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableCaption, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Link as LinkIcon, Trash2 } from 'lucide-react';

interface ExpenseListProps {
  projectId: string;
}

export function ExpenseList({ projectId }: ExpenseListProps): React.ReactElement {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const expensesRef = collection(db, 'expenses');
    const q = query(expensesRef, where('projectId', '==', projectId), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const fetchedExpenses: Expense[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Expense, 'id'>)
        }));
        setExpenses(fetchedExpenses);
        setIsLoading(false);
      },
      (err) => {
        console.error(`Error fetching expenses for project ${projectId}:`, err);
        setError('Failed to load expenses.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  async function deleteExpense(expenseToDelete: Expense): Promise<void> {
     const expenseId = expenseToDelete.id;
     // Basic permission check (creator/owner can delete)
     if (!user || user.uid !== expenseToDelete.userId) {
         alert("You don't have permission to delete this expense.");
         return;
     }
     if (!window.confirm(`Are you sure you want to delete this expense: ${expenseToDelete.description}?`)) {
        return;
     }
    
    const expenseRef = doc(db, 'expenses', expenseId);
    
    try {
      // Delete Firestore entry first
      await deleteDoc(expenseRef);
      console.log("Expense deleted from Firestore.");
      
      // If there was a receipt, delete it from Storage
      if (expenseToDelete.receiptPath) {
        const storageRef = ref(storage, expenseToDelete.receiptPath);
        await deleteObject(storageRef);
        console.log("Receipt deleted from Storage.");
      }
      // List will update via onSnapshot
    } catch (err: any) {
       console.error("Error deleting expense:", err);
       alert(`Failed to delete expense: ${err.message}`);
    }
  }

  if (isLoading) {
    return <p className="text-center text-muted-foreground py-4">Loading expenses...</p>;
  }

  if (error) {
    return <p className="text-destructive text-center py-4">{error}</p>;
  }

  // Calculate total expenses
  const totalAmount = expenses.reduce((sum, entry) => sum + (entry.amount || 0), 0);

  return (
    <>
      {expenses.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No expenses logged for this project yet.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableCaption>Total Expenses Logged: ${totalAmount.toFixed(2)}</TableCaption> {/* Assuming USD */}
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Receipt</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-muted-foreground">
                    {expense.date ? format(expense.date.toDate(), 'PPP') : 'Processing...'}
                  </TableCell>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    {expense.receiptURL ? (
                      <Button variant="outline" size="icon" asChild title={expense.receiptName || 'View Receipt'}>
                        <a href={expense.receiptURL} target="_blank" rel="noopener noreferrer">
                          <LinkIcon className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                     {/* Show delete only if user created the entry */} 
                     {user && user.uid === expense.userId && (
                       <Button 
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteExpense(expense)}
                          title="Delete Expense"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
} 