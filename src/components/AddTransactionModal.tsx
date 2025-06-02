import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { motion } from "framer-motion";
import { 
  ShoppingBag, Utensils, Car, Home, Plane, Gift, Coffee, 
  BookOpen, FilmIcon, HeartPulse, MonitorSmartphone, CreditCard, 
  Wallet as WalletIcon, Smartphone, Banknote, BriefcaseBusiness, 
  BadgeDollarSign, Landmark, ArrowDownCircle, ArrowUpCircle,
  Receipt, CalendarIcon
} from 'lucide-react';

// Category definitions with icons
const expenseCategories = [
  { id: 'food_dining', name: 'Food & Dining', icon: Utensils, color: '#E53935' },
  { id: 'transportation', name: 'Transportation', icon: Car, color: '#1E88E5' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: '#FF8F00' },
  { id: 'housing', name: 'Housing', icon: Home, color: '#43A047' },
  { id: 'travel', name: 'Travel', icon: Plane, color: '#8E24AA' },
  { id: 'entertainment', name: 'Entertainment', icon: FilmIcon, color: '#F4511E' },
  { id: 'education', name: 'Education', icon: BookOpen, color: '#3949AB' },
  { id: 'healthcare', name: 'Healthcare', icon: HeartPulse, color: '#D81B60' },
  { id: 'gifts', name: 'Gifts', icon: Gift, color: '#FFA000' },
  { id: 'tech', name: 'Tech', icon: MonitorSmartphone, color: '#00ACC1' },
  { id: 'coffee', name: 'Coffee & Tea', icon: Coffee, color: '#6D4C41' },
  { id: 'other_expense', name: 'Other', icon: Receipt, color: '#546E7A' }
];

const incomeCategories = [
  { id: 'salary', name: 'Salary', icon: BriefcaseBusiness, color: '#00897B' },
  { id: 'freelance', name: 'Freelance', icon: BadgeDollarSign, color: '#039BE5' },
  { id: 'investments', name: 'Investments', icon: Landmark, color: '#43A047' },
  { id: 'gifts', name: 'Gifts', icon: Gift, color: '#7E57C2' },
  { id: 'other_income', name: 'Other', icon: Receipt, color: '#546E7A' }
];

const paymentMethods = [
  { id: 'cash', name: 'Cash', icon: Banknote, color: '#43A047' },
  { id: 'phonepe', name: 'PhonePe', icon: Smartphone, color: '#673AB7' }, 
  { id: 'paytm', name: 'Paytm', icon: Smartphone, color: '#2196F3' },
  { id: 'card', name: 'Debit/Credit Card', icon: CreditCard, color: '#FF5722' },
  { id: 'bank', name: 'Bank Transfer', icon: Landmark, color: '#1976D2' },
  { id: 'other_payment', name: 'Other', icon: WalletIcon, color: '#546E7A' }
];

// Update the component props to accept transaction for editing
export const AddTransactionModal = ({ 
  isOpen, 
  onClose, 
  transactionToEdit = null,
  onUpdate = null
}) => {
  const [isExpense, setIsExpense] = useState(true);
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Determine if we're in edit mode
  const isEditMode = !!transactionToEdit;

  // Reset form when modal is opened or transactionToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        // Populate form with transaction data for editing
        setIsExpense(transactionToEdit.type === 'expense');
        setPurpose(transactionToEdit.purpose || '');
        setAmount(transactionToEdit.amount?.toString() || '');
        setCategory(transactionToEdit.category || '');
        setPaymentMethod(transactionToEdit.paymentMethod || '');
        setDate(transactionToEdit.date || new Date().toISOString().split('T')[0]);
        setNotes(transactionToEdit.notes || '');
      } else {
        // Reset for new transaction
        setIsExpense(true);
        setPurpose('');
        setAmount('');
        setCategory('');
        setPaymentMethod('');
        setDate(new Date().toISOString().split('T')[0]);
        setNotes('');
      }
      setErrors({});
    }
  }, [isOpen, transactionToEdit]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!purpose.trim()) newErrors.purpose = 'Purpose is required';
    if (!amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }
    if (!category) newErrors.category = 'Category is required';
    if (!paymentMethod) newErrors.paymentMethod = 'Payment method is required';
    if (!date) newErrors.date = 'Date is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsLoading(true);
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        toast({
          title: "Authentication error",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        return;
      }
      
      if (isEditMode && onUpdate) {
        // For editing, call the update handler
        await onUpdate({
          purpose: purpose.trim(),
          amount,
          category,
          paymentMethod,
          date,
          notes: notes.trim(),
          type: isExpense ? 'expense' : 'income',
        });
      } else {
        // Add the transaction
        await addDoc(collection(db, 'users', userId, 'transactions'), {
          purpose: purpose.trim(),
          amount: parseFloat(amount),
          category,
          paymentMethod,
          date: new Date(date),
          notes: notes.trim(),
          type: isExpense ? 'expense' : 'income',
          createdAt: serverTimestamp(),
        });
        
        // Update the current balance
        const financialDocRef = doc(db, 'users', userId, 'financialProfile', 'stats');
        const financialDoc = await getDoc(financialDocRef);
        
        if (financialDoc.exists()) {
          const currentBalance = financialDoc.data().totalBalance || 0;
          const amountValue = parseFloat(amount);
          
          // Subtract for expense, add for income
          const newBalance = isExpense 
            ? currentBalance - amountValue 
            : currentBalance + amountValue;
          
          await updateDoc(financialDocRef, {
            totalBalance: newBalance,
            updatedAt: serverTimestamp()
          });
        }
      }
      
      toast({
        title: "Success!",
        description: `${isExpense ? 'Expense' : 'Income'} ${isEditMode ? 'updated' : 'added'} successfully.`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error with transaction:', error);
      toast({
        title: `Failed to ${isEditMode ? 'update' : 'add'} transaction`,
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const activeCategories = isExpense ? expenseCategories : incomeCategories;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white border border-gray-200 text-gray-800 shadow-xl rounded-xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className={cn(
            "w-full h-2", 
            isExpense ? "bg-gradient-to-r from-red-500 to-orange-400" : "bg-gradient-to-r from-emerald-500 to-teal-400"
          )} />
            
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-gray-800">
              {isExpense ? (
                <ArrowDownCircle className="h-6 w-6 text-red-500" />
              ) : (
                <ArrowUpCircle className="h-6 w-6 text-emerald-500" />
              )}
              {isEditMode ? 'Edit' : 'Add'} {isExpense ? 'Expense' : 'Income'}
            </DialogTitle>
          </DialogHeader>
            
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Transaction Type Switch */}
            <div className="flex justify-center">
              <div className="bg-gray-100 p-1 rounded-lg flex items-center w-full max-w-xs">
                <Button 
                  type="button"
                  onClick={() => setIsExpense(true)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2", 
                    isExpense 
                      ? "bg-gradient-to-r from-red-500 to-orange-400 text-white shadow-md" 
                      : "bg-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  Expense
                </Button>
                <Button 
                  type="button"
                  onClick={() => setIsExpense(false)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2",
                    !isExpense 
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-md" 
                      : "bg-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  Income
                </Button>
              </div>
            </div>

            {/* Purpose & Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="purpose" className="text-sm font-medium text-gray-700">
                  Purpose
                </Label>
                <Input
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder={isExpense ? "What did you spend on?" : "Source of income"}
                  className={cn(
                    "bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-800 placeholder:text-gray-400",
                    errors.purpose && "border-red-500 focus:border-red-500"
                  )}
                />
                {errors.purpose && <p className="text-sm text-red-500">{errors.purpose}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                  Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                  <Input
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={cn(
                      "bg-gray-50 border-gray-200 pl-7 focus:border-blue-500 text-gray-800 placeholder:text-gray-400",
                      errors.amount && "border-red-500 focus:border-red-500"
                    )}
                  />
                </div>
                {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                {isExpense ? "Expense Category" : "Income Category"}
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {activeCategories.map((cat) => (
                  <Button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "flex flex-col items-center justify-center h-20 gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 p-2 transition-all",
                      category === cat.id && `ring-2 ring-${cat.color.replace('#', '')} border-transparent shadow-md`
                    )}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center" 
                      style={{ backgroundColor: cat.color + '20' }}
                    >
                      <cat.icon className="h-5 w-5" style={{ color: cat.color }} />
                    </div>
                    <span className="text-xs text-center truncate w-full text-gray-700">
                      {cat.name}
                    </span>
                  </Button>
                ))}
              </div>
              {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                {isExpense ? "Payment Method" : "Received Via"}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 p-3 transition-all",
                      paymentMethod === method.id && `ring-2 ring-${method.color.replace('#', '')} border-transparent shadow-md`
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <method.icon 
                        className="h-4 w-4" 
                        style={{ color: method.color }} 
                      />
                      <span className="text-gray-700">{method.name}</span>
                    </div>
                  </Button>
                ))}
              </div>
              {errors.paymentMethod && (
                <p className="text-sm text-red-500">{errors.paymentMethod}</p>
              )}
            </div>

            {/* Date & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cn(
                    "bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-800",
                    errors.date && "border-red-500 focus:border-red-500"
                  )}
                />
                {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                  className="bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-800 placeholder:text-gray-400 resize-none h-[38px]"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                onClick={onClose} 
                variant="outline" 
                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className={cn(
                  "px-8 shadow-md",
                  isExpense 
                    ? "bg-gradient-to-r from-red-500 to-orange-400 hover:from-red-600 hover:to-orange-500 text-white" 
                    : "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-white"
                )}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Processing...
                  </div>
                ) : (
                  <>{isEditMode ? 'Update' : 'Save'} {isExpense ? 'Expense' : 'Income'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
