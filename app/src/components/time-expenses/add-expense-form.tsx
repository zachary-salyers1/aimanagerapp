'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from "date-fns";
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from '@/lib/firebase/config';
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CalendarIcon, UploadCloud, File as FileIcon, X } from 'lucide-react';

// Validation Schema
const formSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  amount: z.coerce.number().min(0.01, "Amount must be positive."),
  description: z.string().min(2, "Description is required.").max(200),
  receipt: z.instanceof(File).optional(), // For file input
});

type ExpenseFormValues = z.infer<typeof formSchema>;

interface AddExpenseFormProps {
  projectId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddExpenseForm({ projectId, isOpen, onOpenChange }: AddExpenseFormProps): React.ReactElement {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      amount: undefined,
      description: "",
      receipt: undefined,
    },
  });
  
  // Watch the receipt field to display file info
  const currentReceipt = form.watch("receipt");

  // Separate upload function for clarity
  async function uploadReceipt(file: File): Promise<{ path: string, url: string }> {
     const storagePath = `projects/${projectId}/receipts/${Date.now()}_${file.name}`;
     const storageRef = ref(storage, storagePath);
     const uploadTask = uploadBytesResumable(storageRef, file);

     return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          (error) => reject(error),
          async () => {
             try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({ path: storagePath, url: downloadURL });
             } catch (getUrlError) {
                reject(getUrlError);
             }
          }
        );
     });
  }

  async function onSubmit(values: ExpenseFormValues): Promise<void> {
    if (!user) {
        setError("Authentication error.");
        return;
    }
    setIsSubmitting(true);
    setError(null);
    setUploadProgress(0);
    let receiptData: { name?: string, path?: string, url?: string } = {};

    try {
       // 1. Upload receipt if present
       if (values.receipt) {
         try {
           const { path, url } = await uploadReceipt(values.receipt);
           receiptData = { name: values.receipt.name, path, url };
         } catch (uploadError: any) {
           console.error("Receipt Upload Error:", uploadError);
           throw new Error(`Receipt upload failed: ${uploadError.message}`); // Throw to stop submission
         }
       }
       
       // 2. Add expense entry to Firestore
      const expensesCollection = collection(db, 'expenses');
      await addDoc(expensesCollection, {
        projectId: projectId,
        userId: user.uid,
        date: Timestamp.fromDate(values.date),
        amount: values.amount,
        description: values.description,
        receiptName: receiptData.name || null,
        receiptPath: receiptData.path || null,
        receiptURL: receiptData.url || null,
        createdAt: serverTimestamp(),
      });
      
      console.log("Expense created successfully!");
      form.reset({ date: new Date(), amount: undefined, description: "", receipt: undefined });
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input too
      onOpenChange(false); // Close dialog
      
    } catch (err: any) {
      console.error("Error creating expense:", err);
      setError(err.message || "Failed to log expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
             form.reset({ date: new Date(), amount: undefined, description: "", receipt: undefined });
             setUploadProgress(0);
             if (fileInputRef.current) fileInputRef.current.value = "";
        }
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Log Expense</DialogTitle>
          <DialogDescription>
            Add a new expense entry for this project. Upload an optional receipt.
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
                                 className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                               >
                                 {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                 <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                               </Button>
                             </FormControl>
                           </PopoverTrigger>
                           <PopoverContent className="w-auto p-0" align="start">
                             <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                           </PopoverContent>
                         </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 {/* Amount Input */}
                 <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ($)</FormLabel> {/* Specify currency */}
                          <FormControl>
                             {/* Use onChange to handle potential undefined value from reset */}
                            <Input type="number" step="0.01" placeholder="e.g., 49.99" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                  />
            </div>
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Software subscription" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Receipt Upload */}
            <FormField
              control={form.control}
              name="receipt"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Receipt (Optional)</FormLabel>
                   <FormControl>
                      <Input 
                         {...fieldProps} 
                         type="file" 
                         accept="image/*,.pdf" // Accept images and PDFs
                         ref={fileInputRef}
                         onChange={(event) => onChange(event.target.files?.[0])}
                      />
                   </FormControl>
                  {/* Display selected file info */}
                   {currentReceipt && !isSubmitting && (
                      <div className="mt-2 text-sm text-muted-foreground flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <FileIcon className="h-4 w-4 flex-shrink-0" /> 
                            <span>{currentReceipt.name}</span>
                         </div>
                         <Button 
                            type="button"
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                               form.setValue("receipt", undefined);
                               if (fileInputRef.current) fileInputRef.current.value = ""; 
                            }}
                            title="Clear selection"
                         >
                            <X className="h-4 w-4" />
                         </Button>
                      </div>
                   )}
                   {/* Display upload progress */} 
                   {isSubmitting && uploadProgress > 0 && currentReceipt && (
                      <Progress value={uploadProgress} className="w-full mt-2 h-2" />
                   )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (uploadProgress > 0 ? `Uploading (${uploadProgress.toFixed(0)}%)...` : 'Saving...') : 'Log Expense'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 