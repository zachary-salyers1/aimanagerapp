'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from "date-fns";
import { doc, updateDoc, Timestamp } from 'firebase/firestore'; // Import updateDoc
import { db } from '@/lib/firebase/config';
import { Task, TaskStatus, taskStatuses } from '@/types/task';

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogClose // Removed Trigger, handled externally
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from 'lucide-react';

// Validation Schema (same as Add Task)
const formSchema = z.object({
  title: z.string().min(2, { message: "Task title must be at least 2 characters." }).max(100),
  description: z.string().max(500).optional(),
  status: z.enum(Object.keys(taskStatuses) as [TaskStatus, ...TaskStatus[]]), 
  dueDate: z.date().optional(), 
});

type TaskFormValues = z.infer<typeof formSchema>;

interface EditTaskFormProps {
  task: Task; // Task data to edit
  isOpen: boolean;
  onOpenChange: (open: boolean) => void; // Control dialog state externally
}

export function EditTaskForm({ task, isOpen, onOpenChange }: EditTaskFormProps): React.ReactElement {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    // Default values populated from the task prop
    defaultValues: {
      title: task.title || "",
      description: task.description || "",
      status: task.status || 'TODO',
      // Convert Firebase Timestamp back to JS Date for the calendar
      dueDate: task.dueDate ? task.dueDate.toDate() : undefined,
    },
  });

  // Reset form when task changes (e.g., opening dialog for a different task)
  useEffect(() => {
      form.reset({
        title: task.title || "",
        description: task.description || "",
        status: task.status || 'TODO',
        dueDate: task.dueDate ? task.dueDate.toDate() : undefined,
      });
  }, [task, form]);

  async function onSubmit(values: TaskFormValues): Promise<void> {
    setIsSubmitting(true);
    setError(null);

    try {
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        title: values.title,
        description: values.description || '',
        status: values.status,
        dueDate: values.dueDate ? Timestamp.fromDate(values.dueDate) : null,
        // Note: createdAt and projectId are not updated
      });
      console.log(`Task ${task.id} updated successfully!`);
      onOpenChange(false); // Close dialog on success
    } catch (err: any) {
      console.error("Error updating task:", err);
      setError(err.message || "Failed to update task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* DialogTrigger is handled in the parent component (TaskList) */}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Modify the details for this task.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Form Fields are identical to AddTaskForm, just pre-filled */}
             {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Implement login page" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Details about the task..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
               {/* Status Select */}
               <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(taskStatuses).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Due Date Picker */}
                 <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col pt-2">
                        <FormLabel className="mb-1.5">Due Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 