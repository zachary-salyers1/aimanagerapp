'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/auth-context';
import { Project } from '@/types/project';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AddProjectForm } from './add-project-form';

// Placeholder for Project creation button/modal (to be added later)
// function AddProjectButton() {
//   return <button>Add Project</button>; // Simple placeholder
// }

export function ProjectList(): React.ReactElement {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      // If user logs out or isn't loaded yet, clear projects and stop loading
      setProjects([]);
      setIsLoading(false); // Ensure loading stops if auth is checked but no user
      return;
    }

    setIsLoading(true);
    setError(null);

    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where('ownerId', '==', user.uid));

    const unsubscribe = onSnapshot(q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const fetchedProjects: Project[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Project, 'id'>) // Type assertion
        }));
        setProjects(fetchedProjects);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching projects:", err);
        setError('Failed to load projects.');
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount or when user changes
    return () => unsubscribe();
  }, [user]); // Re-run effect when user changes

  if (isAuthLoading || isLoading) {
    return <p>Loading projects...</p>;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Projects</h1>
        {/* <AddProjectButton /> Placeholder */} 
        <AddProjectForm />
      </div>

      {projects.length === 0 ? (
        <p>No projects found. Create your first project!</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} passHref legacyBehavior>
              <a className="block hover:shadow-md transition-shadow duration-200 rounded-lg">
                <Card className="h-full cursor-pointer">
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    {project.description && (
                      <CardDescription>{project.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Created: {project.createdAt ? project.createdAt.toDate().toLocaleDateString() : 'Processing...'}
                    </p>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 