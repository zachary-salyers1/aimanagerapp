'use client'; // Needed for hooks like useParams or fetching data client-side

import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, DocumentData, DocumentSnapshot } from 'firebase/firestore'; // Import onSnapshot
import { db } from '@/lib/firebase/config';
import { Project } from '@/types/project';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TaskList } from '@/components/tasks/task-list'; // Import TaskList
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs" // Import Tabs
// import { TaskList } from '@/components/tasks/task-list'; // To be added next
// Import Document components
import { DocumentUploadForm } from '@/components/documents/document-upload-form'; 
import { DocumentList } from '@/components/documents/document-list';
// Import placeholder for Time & Expense content
import { TimeExpenseTabContent } from '@/components/time-expenses/time-expense-tab-content';

interface ProjectDetailPageProps {
  params: {
    projectId: string;
  };
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps): React.ReactElement {
  const { projectId } = params;
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const projectRef = doc(db, 'projects', projectId);

    const unsubscribe = onSnapshot(projectRef,
      (docSnap: DocumentSnapshot<DocumentData>) => {
        if (docSnap.exists()) {
          // Check if createdAt exists before setting state
          const data = docSnap.data() as Omit<Project, 'id'>;
          if (data.createdAt) { 
             setProject({ id: docSnap.id, ...data });
          } else {
            // Handle case where timestamp is pending (optional, might show brief loading)
            // Or fetch again shortly if needed, but onSnapshot usually handles this
             setProject({ id: docSnap.id, ...data }); // Set anyway, check in render
          }
        } else {
          setError("Project not found.");
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching project:", err);
        setError("Failed to load project details.");
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [projectId]); // Re-run effect if projectId changes


  return (
    <div className="container mx-auto py-8 px-4">
       <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
         <ArrowLeft className="mr-2 h-4 w-4" />
         Back to Projects
       </Link>

      {isLoading ? (
        <p>Loading project...</p>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : project ? (
        <>
          <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mb-2 max-w-prose">{project.description}</p>
          )}
          <p className="text-sm text-muted-foreground mb-6">
             Created: {project.createdAt ? project.createdAt.toDate().toLocaleDateString() : 'Processing...'}
          </p>

          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md mb-4"> {/* Limit width */} 
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="time-expenses">Time & Expenses</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks">
              <TaskList projectId={projectId} />
            </TabsContent>
            <TabsContent value="documents">
               {/* Add Document Upload and List components */}
               <DocumentUploadForm projectId={projectId} />
               <DocumentList projectId={projectId} />
            </TabsContent>
            <TabsContent value="time-expenses">
               {/* Use the new wrapper component */}
               <TimeExpenseTabContent projectId={projectId} />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <p>Project data not available.</p> // Should ideally be handled by error state
      )}
    </div>
  );
} 