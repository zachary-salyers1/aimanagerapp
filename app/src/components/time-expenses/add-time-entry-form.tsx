'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from "date-fns";
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/auth-context';

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogClose
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from 'lucide-react';

// Validation Schema
const formSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  hours: z.coerce.number().min(0.1, "Hours must be positive.").max(24, "Cannot log more than 24 hours at once."),
  notes: z.string().max(500).optional(),
  // taskId: z.string().optional(), // Optional: Add task selection later
});

type TimeEntryFormValues = z.infer<typeof formSchema>;

interface AddTimeEntryFormProps {
  projectId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTimeEntryForm({ projectId, isOpen, onOpenChange }: AddTimeEntryFormProps): React.ReactElement {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(), // Default to today
      hours: undefined,
      notes: "",
    },
  });

  async function onSubmit(values: TimeEntryFormValues): Promise<void> {
    if (!user) {
        setError("Authentication error.");
        return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const timeEntriesCollection = collection(db, 'timeEntries');
      await addDoc(timeEntriesCollection, {
        projectId: projectId,
        userId: user.uid,
        date: Timestamp.fromDate(values.date),
        hours: values.hours,
        notes: values.notes || '',
        createdAt: serverTimestamp(),
      });
      console.log("Time entry created successfully!");
      form.reset({ date: new Date(), hours: undefined, notes: "" }); // Reset form with default date
      onOpenChange(false); // Close dialog on success
    } catch (err: any) {
      console.error("Error creating time entry:", err);
      setError(err.message || "Failed to log time. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { 
       if (!open) form.reset({ date: new Date(), hours: undefined, notes: "" }); // Reset on close
       onOpenChange(open); 
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Log Time</DialogTitle>
          <DialogDescription>
            Add a new time entry for this project.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                 {/* Date Picker */}
                 <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col pt-2">
                        <FormLabel className="mb-1.5">Date</FormLabel>
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
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 {/* Hours Input */}
                 <FormField
                      control={form.control}
                      name="hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hours</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="e.g., 1.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                  />
            </div>
            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What did you work on?"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Task Selector - Add later */} 

            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Logging Time...' : 'Log Time'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 