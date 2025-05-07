'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, QuerySnapshot, DocumentData, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from '@/lib/firebase/config';
import { useAuth } from '@/context/auth-context';
import { Document } from '@/types/document';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableCaption, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { FileText, Download, Trash2 } from 'lucide-react';

interface DocumentListProps {
  projectId: string;
}

export function DocumentList({ projectId }: DocumentListProps): React.ReactElement {
  const { user } = useAuth(); // Get current user for delete permissions
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const docsRef = collection(db, 'documents');
    const q = query(docsRef, where('projectId', '==', projectId), orderBy('uploadedAt', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const fetchedDocs: Document[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Document, 'id'>)
        }));
        setDocuments(fetchedDocs);
        setIsLoading(false);
      },
      (err) => {
        console.error(`Error fetching documents for project ${projectId}:`, err);
        setError('Failed to load documents.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  async function handleDeleteDocument(docToDelete: Document): Promise<void> {
     if (!user || user.uid !== docToDelete.uploaderId) {
        alert("You don't have permission to delete this file.");
        return;
     }
     if (!window.confirm(`Are you sure you want to delete the file "${docToDelete.name}"?`)) {
        return;
    }
    
    const firestoreDocRef = doc(db, 'documents', docToDelete.id);
    const storageRef = ref(storage, docToDelete.storagePath);

    try {
      // Delete Firestore entry first
      await deleteDoc(firestoreDocRef);
      console.log("Firestore document deleted.")
      
      // Then delete file from Storage
      await deleteObject(storageRef);
      console.log("Storage file deleted.");
      
      // List will update via onSnapshot
    } catch (err: any) {
       console.error("Error deleting document:", err);
       alert(`Failed to delete document: ${err.message}`);
    }
  }

  if (isLoading) {
    return <p className="text-center text-muted-foreground py-4">Loading documents...</p>;
  }

  if (error) {
    return <p className="text-destructive text-center py-4">{error}</p>;
  }

  return (
    <div className="mt-6">
      {documents.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No documents uploaded for this project yet.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableCaption>A list of documents uploaded for this project.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead> {/* Icon */} 
                <TableHead>Name</TableHead>
                <TableHead>Uploaded On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell><FileText className="h-5 w-5 text-muted-foreground" /></TableCell>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.uploadedAt ? format(doc.uploadedAt.toDate(), 'PPP p') : 'Processing...'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                     <Button 
                        variant="outline"
                        size="icon"
                        asChild // Allows link behaviour
                        title="Download"
                     >
                       <a href={doc.downloadURL} target="_blank" rel="noopener noreferrer">
                         <Download className="h-4 w-4" />
                       </a>
                     </Button>
                      {/* Show delete only if user uploaded the doc */} 
                     {user && user.uid === doc.uploaderId && (
                       <Button 
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteDocument(doc)}
                          title="Delete"
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
    </div>
  );
} 