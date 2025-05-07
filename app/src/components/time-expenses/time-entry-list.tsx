'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, QuerySnapshot, DocumentData, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/auth-context';
import { TimeEntry } from '@/types/time-entry';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableCaption, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Trash2 } from 'lucide-react'; // Assuming edit is less common for time

interface TimeEntryListProps {
  projectId: string;
}

export function TimeEntryList({ projectId }: TimeEntryListProps): React.ReactElement {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const entriesRef = collection(db, 'timeEntries');
    const q = query(entriesRef, where('projectId', '==', projectId), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const fetchedEntries: TimeEntry[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<TimeEntry, 'id'>)
        }));
        setEntries(fetchedEntries);
        setIsLoading(false);
      },
      (err) => {
        console.error(`Error fetching time entries for project ${projectId}:`, err);
        setError('Failed to load time entries.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  async function deleteTimeEntry(entryId: string): Promise<void> {
     // Basic permission check (creator/owner can delete)
     const entryToDelete = entries.find(e => e.id === entryId);
     if (!user || !entryToDelete || user.uid !== entryToDelete.userId) {
         alert("You don't have permission to delete this entry.");
         return;
     }
     if (!window.confirm("Are you sure you want to delete this time entry?")) {
        return;
    }
    
    const entryRef = doc(db, 'timeEntries', entryId);
    try {
      await deleteDoc(entryRef);
      console.log("Time entry deleted.");
    } catch (err: any) {
       console.error("Error deleting time entry:", err);
       alert(`Failed to delete time entry: ${err.message}`);
    }
  }

  if (isLoading) {
    return <p className="text-center text-muted-foreground py-4">Loading time entries...</p>;
  }

  if (error) {
    return <p className="text-destructive text-center py-4">{error}</p>;
  }

  // Calculate total hours
  const totalHours = entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);

  return (
    <>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No time logged for this project yet.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableCaption>Total Hours Logged: {totalHours.toFixed(2)}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">
                    {entry.date ? format(entry.date.toDate(), 'PPP') : 'Processing...'}
                  </TableCell>
                  <TableCell className="font-medium text-right">{entry.hours.toFixed(2)}</TableCell>
                  <TableCell>{entry.notes || '-'}</TableCell>
                  <TableCell className="text-right">
                     {/* Show delete only if user created the entry */} 
                     {user && user.uid === entry.userId && (
                       <Button 
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteTimeEntry(entry.id)}
                          title="Delete Entry"
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