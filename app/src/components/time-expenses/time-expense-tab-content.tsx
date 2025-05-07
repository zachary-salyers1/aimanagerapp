'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
// Import List components
import { TimeEntryList } from './time-entry-list';
import { ExpenseList } from './expense-list';
// Import Form components
import { AddTimeEntryForm } from './add-time-entry-form';
import { AddExpenseForm } from './add-expense-form';

interface TimeExpenseTabContentProps {
  projectId: string;
}

export function TimeExpenseTabContent({ projectId }: TimeExpenseTabContentProps): React.ReactElement {
  // State for controlling dialogs
  const [isAddTimeEntryOpen, setIsAddTimeEntryOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* Time Entries Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Time Entries</h3>
          {/* Trigger Add Time Entry Dialog */}
          <Button variant="outline" size="sm" onClick={() => setIsAddTimeEntryOpen(true)} >
            <PlusCircle className="mr-2 h-4 w-4" /> Log Time
          </Button>
        </div>
        {/* Render Time Entry List */}
        <TimeEntryList projectId={projectId} />
      </section>

      {/* Expenses Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Expenses</h3>
           {/* Trigger Add Expense Dialog */}
          <Button variant="outline" size="sm" onClick={() => setIsAddExpenseOpen(true)} >
            <PlusCircle className="mr-2 h-4 w-4" /> Log Expense
          </Button>
        </div>
         {/* Render Expense List */}
        <ExpenseList projectId={projectId} />
      </section>

      {/* Render Dialogs */}
      {isAddTimeEntryOpen && (
         <AddTimeEntryForm 
            projectId={projectId} 
            isOpen={isAddTimeEntryOpen} 
            onOpenChange={setIsAddTimeEntryOpen} 
         />
      )}
      {isAddExpenseOpen && (
         <AddExpenseForm 
            projectId={projectId} 
            isOpen={isAddExpenseOpen} 
            onOpenChange={setIsAddExpenseOpen} 
         />
      )}
    </div>
  );
} 