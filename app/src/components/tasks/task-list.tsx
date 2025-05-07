'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, QuerySnapshot, DocumentData, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Task, TaskStatus, taskStatuses } from '@/types/task';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { AddTaskForm } from './add-task-form';
import { EditTaskForm } from './edit-task-form';

interface TaskListProps {
  projectId: string;
}

export function TaskList({ projectId }: TaskListProps): React.ReactElement {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const tasksRef = collection(db, 'tasks');
    // Query tasks for the specific project, order by creation time
    const q = query(tasksRef, where('projectId', '==', projectId), orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const fetchedTasks: Task[] = snapshot.docs.map(doc => {
          const data = doc.data() as Omit<Task, 'id'>;
          return {
            id: doc.id,
            ...data,
            // Ensure Timestamps are handled correctly, check if they exist
            dueDate: data.dueDate, 
            createdAt: data.createdAt
          };
        });
        setTasks(fetchedTasks);
        setIsLoading(false);
      },
      (err) => {
        console.error(`Error fetching tasks for project ${projectId}:`, err);
        setError('Failed to load tasks.');
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [projectId]); // Re-run effect if projectId changes

  // --- Add Update Task Status Function ---
  async function updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<void> {
    const taskRef = doc(db, 'tasks', taskId);
    try {
      await updateDoc(taskRef, { status: newStatus });
      console.log(`Task ${taskId} status updated to ${newStatus}`);
      // No need to update local state, onSnapshot will handle it
    } catch (err) {
      console.error("Error updating task status:", err);
      // TODO: Show user-friendly error message
    }
  }

  // --- Add Delete Task Function ---
  async function deleteTask(taskId: string): Promise<void> {
    if (!window.confirm("Are you sure you want to delete this task?")) {
        return;
    }
    const taskRef = doc(db, 'tasks', taskId);
    try {
      await deleteDoc(taskRef);
      console.log(`Task ${taskId} deleted`);
      // No need to update local state, onSnapshot will handle it
    } catch (err) {
      console.error("Error deleting task:", err);
      // TODO: Show user-friendly error message
    }
  }

  // --- Function to handle opening the edit dialog ---
  function handleEditClick(task: Task) {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  }

  if (isLoading) {
    return <p>Loading tasks...</p>;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
    <div className="mt-6">
       <div className="flex justify-end mb-4">
         <AddTaskForm projectId={projectId} />
       </div>
      {tasks.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No tasks yet for this project.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-[50px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Checkbox 
                      checked={task.status === 'DONE'} 
                      // Call updateTaskStatus on change
                      onCheckedChange={(checked) => {
                         const newStatus = checked ? 'DONE' : 'TODO';
                         updateTaskStatus(task.id, newStatus);
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.dueDate ? task.dueDate.toDate().toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(task)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedTask && (
        <EditTaskForm 
          task={selectedTask} 
          isOpen={isEditDialogOpen} 
          onOpenChange={setIsEditDialogOpen} 
        />
      )}
    </div>
  );
} 