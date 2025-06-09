import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Utensils, Car, Film, Heart, Home, Briefcase, Gift, 
  Book, Coffee, Laptop, FileText, ShoppingBag,
  Banknote, CreditCard, Smartphone, Building, X
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, getDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';

// Category icons array with proper data structure - enhanced with colors for better visibility
const categories = [
  { id: 'food-dining', name: 'Food & Dining', icon: <Utensils className="h-5 w-5" />, color: 'orange' },
  { id: 'transportation', name: 'Transportation', icon: <Car className="h-5 w-5" />, color: 'blue' },
  { id: 'shopping', name: 'Shopping', icon: <ShoppingBag className="h-5 w-5" />, color: 'pink' },
  { id: 'housing', name: 'Housing', icon: <Home className="h-5 w-5" />, color: 'green' },
  { id: 'travel', name: 'Travel', icon: <Briefcase className="h-5 w-5" />, color: 'purple' },
  { id: 'entertainment', name: 'Entertainment', icon: <Film className="h-5 w-5" />, color: 'red' },
  { id: 'education', name: 'Education', icon: <Book className="h-5 w-5" />, color: 'cyan' },
  { id: 'healthcare', name: 'Healthcare', icon: <Heart className="h-5 w-5" />, color: 'rose' },
  { id: 'gifts', name: 'Gifts', icon: <Gift className="h-5 w-5" />, color: 'yellow' },
  { id: 'tech', name: 'Tech', icon: <Laptop className="h-5 w-5" />, color: 'indigo' },
  { id: 'coffee-tea', name: 'Coffee & Tea', icon: <Coffee className="h-5 w-5" />, color: 'amber' },
  { id: 'other', name: 'Other', icon: <FileText className="h-5 w-5" />, color: 'gray' }
];

// Payment methods array with proper data structure
const paymentMethods = [
  { id: 'cash', name: 'Cash', icon: <Banknote className="h-5 w-5 text-green-500" /> },
  { id: 'phonepe', name: 'PhonePe', icon: <Smartphone className="h-5 w-5 text-purple-500" /> },
  { id: 'paytm', name: 'Paytm', icon: <Smartphone className="h-5 w-5 text-blue-500" /> },
  { id: 'card', name: 'Debit/Credit Card', icon: <CreditCard className="h-5 w-5 text-orange-500" /> },
  { id: 'bank-transfer', name: 'Bank Transfer', icon: <Building className="h-5 w-5 text-gray-500" /> },
  { id: 'other', name: 'Other', icon: <FileText className="h-5 w-5 text-gray-500" /> }
];

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: any;
  onUpdate?: (data: any) => Promise<void>;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  transactionToEdit,
  onUpdate
}) => {
  const isEditing = !!transactionToEdit;

  // Form state
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill form when editing
  useEffect(() => {
    if (transactionToEdit) {
      setPurpose(transactionToEdit.purpose || '');
      setAmount(transactionToEdit.amount || '');
      setType(transactionToEdit.type || 'expense');
      setCategory(transactionToEdit.category || '');
      setPaymentMethod(transactionToEdit.paymentMethod || '');
      setDate(transactionToEdit.date || new Date().toISOString().split('T')[0]);
      setNotes(transactionToEdit.notes || '');
    } else {
      // Reset form when not editing
      setPurpose('');
      setAmount('');
      setType('expense');
      setCategory('');
      setPaymentMethod('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [transactionToEdit]);

  // Handle transaction creation with improved mobile support
  const handleAddTransaction = async () => {
    // Form validation
    if (!purpose.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a purpose for the transaction.",
        variant: "destructive",
      });
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "Missing category",
        description: "Please select a category for the transaction.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Missing payment method",
        description: "Please select a payment method.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // If editing, use update function
      if (isEditing && onUpdate) {
        await onUpdate({
          purpose,
          amount,
          type,
          category,
          paymentMethod,
          date,
          notes
        });
        
        toast({
          title: "Transaction updated",
          description: "Your transaction has been updated successfully.",
        });
        
        onClose();
        return;
      }
      
      // Otherwise create new transaction
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Convert amount to number with proper validation
      const numericAmount = Number(amount.toString().replace(/,/g, '').trim());
      if (isNaN(numericAmount)) {
        throw new Error("Invalid amount value");
      }

      // Add transaction to Firestore
      const transactionData = {
        purpose,
        amount: numericAmount,
        type,
        category,
        paymentMethod,
        date: new Date(date),
        notes,
        createdAt: serverTimestamp()
      };
      
      // Add the transaction
      await addDoc(collection(db, 'users', userId, 'transactions'), transactionData);
      
      // Update financial stats
      const financialDocRef = doc(db, 'users', userId, 'financialProfile', 'stats');
      const financialDocSnap = await getDoc(financialDocRef);
      
      // If financialProfile stats doc exists, update it
      if (financialDocSnap.exists()) {
        const updateData: any = {};
        
        if (type === 'expense') {
          // Use the numeric value directly instead of parsing again
          updateData.totalBalance = increment(-numericAmount);
          updateData.monthlyExpenses = increment(numericAmount);
        } else {
          updateData.totalBalance = increment(numericAmount);
          updateData.monthlyIncome = increment(numericAmount);
        }
        
        try {
          await updateDoc(financialDocRef, updateData);
        } catch (updateError) {
          console.error('Error updating financial data:', updateError);
          // Continue with transaction added but notify about stats update error
          toast({
            title: "Transaction added",
            description: "Transaction added, but financial stats may not be updated correctly.",
            variant: "default", // Changed from "warning" to "default"
          });
          onClose();
          setIsSubmitting(false);
          return;
        }
      }
      
      toast({
        title: "Transaction added",
        description: "Your transaction has been added successfully.",
      });
      
      // Reset and close the form
      onClose();
      
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Error",
        description: "There was a problem adding your transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format selected category name for display
  const getSelectedCategoryName = () => {
    const selectedCategory = categories.find(c => c.id === category || c.name.toLowerCase() === category.toLowerCase());
    return selectedCategory ? selectedCategory.name : '';
  };
  
  // Format selected payment method name for display
  const getSelectedPaymentMethodName = () => {
    const selectedMethod = paymentMethods.find(m => m.id === paymentMethod || m.name.toLowerCase() === paymentMethod.toLowerCase());
    return selectedMethod ? selectedMethod.name : '';
  };

  // Helper function to get color class based on category color
  const getCategoryColorClass = (catId: string, isSelected: boolean) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return '';
    
    const colorMap: {[key: string]: {bg: string, border: string, text: string}} = {
      orange: {
        bg: isSelected ? 'bg-orange-100' : 'bg-orange-50', 
        border: isSelected ? 'border-orange-300' : 'border-orange-100',
        text: 'text-orange-700'
      },
      blue: {
        bg: isSelected ? 'bg-blue-100' : 'bg-blue-50', 
        border: isSelected ? 'border-blue-300' : 'border-blue-100',
        text: 'text-blue-700'
      },
      pink: {
        bg: isSelected ? 'bg-pink-100' : 'bg-pink-50', 
        border: isSelected ? 'border-pink-300' : 'border-pink-100',
        text: 'text-pink-700'
      },
      green: {
        bg: isSelected ? 'bg-green-100' : 'bg-green-50', 
        border: isSelected ? 'border-green-300' : 'border-green-100',
        text: 'text-green-700'
      },
      purple: {
        bg: isSelected ? 'bg-purple-100' : 'bg-purple-50', 
        border: isSelected ? 'border-purple-300' : 'border-purple-100',
        text: 'text-purple-700'
      },
      red: {
        bg: isSelected ? 'bg-red-100' : 'bg-red-50', 
        border: isSelected ? 'border-red-300' : 'border-red-100',
        text: 'text-red-700'
      },
      cyan: {
        bg: isSelected ? 'bg-cyan-100' : 'bg-cyan-50', 
        border: isSelected ? 'border-cyan-300' : 'border-cyan-100',
        text: 'text-cyan-700'
      },
      rose: {
        bg: isSelected ? 'bg-rose-100' : 'bg-rose-50', 
        border: isSelected ? 'border-rose-300' : 'border-rose-100',
        text: 'text-rose-700'
      },
      yellow: {
        bg: isSelected ? 'bg-yellow-100' : 'bg-yellow-50', 
        border: isSelected ? 'border-yellow-300' : 'border-yellow-100',
        text: 'text-yellow-700'
      },
      indigo: {
        bg: isSelected ? 'bg-indigo-100' : 'bg-indigo-50', 
        border: isSelected ? 'border-indigo-300' : 'border-indigo-100',
        text: 'text-indigo-700'
      },
      amber: {
        bg: isSelected ? 'bg-amber-100' : 'bg-amber-50', 
        border: isSelected ? 'border-amber-300' : 'border-amber-100',
        text: 'text-amber-700'
      },
      gray: {
        bg: isSelected ? 'bg-gray-100' : 'bg-gray-50', 
        border: isSelected ? 'border-gray-300' : 'border-gray-100',
        text: 'text-gray-700'
      }
    };
    
    return `${colorMap[cat.color].bg} ${colorMap[cat.color].border} ${colorMap[cat.color].text}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 rounded-lg">
        <DialogHeader className="p-4 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-4 py-3 space-y-6">
          {/* Transaction Type - Improved visibility */}
          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium text-gray-700 block mb-1">Transaction Type</Label>
            <RadioGroup 
              value={type} 
              onValueChange={setType}
              className="flex flex-row space-x-2"
            >
              <div className={`flex flex-1 items-center justify-center gap-2 border-2 rounded-md p-3 cursor-pointer transition-all ${
                type === 'expense' 
                  ? 'bg-red-50 border-red-400 shadow-sm' 
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>
                <RadioGroupItem value="expense" id="expense" className="sr-only" />
                <label htmlFor="expense" className="flex items-center gap-1.5 cursor-pointer w-full justify-center font-medium">
                  Expense
                </label>
              </div>
              <div className={`flex flex-1 items-center justify-center gap-2 border-2 rounded-md p-3 cursor-pointer transition-all ${
                type === 'income' 
                  ? 'bg-green-50 border-green-400 shadow-sm' 
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>
                <RadioGroupItem value="income" id="income" className="sr-only" />
                <label htmlFor="income" className="flex items-center gap-1.5 cursor-pointer w-full justify-center font-medium">
                  Income
                </label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Description - Enhanced style */}
          <div className="space-y-2">
            <Label htmlFor="purpose" className="text-sm font-medium text-gray-700 block mb-1">Description</Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="What was this transaction for?"
              className="w-full border-gray-300 focus:border-indigo-500"
            />
          </div>
          
          {/* Amount - Enhanced style with better mobile support */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700 block mb-1">Amount</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium">₹</span>
              <Input
                id="amount"
                type="text" // Changed from number to text for better mobile input
                pattern="[0-9]*\.?[0-9]*" // Restrict to numeric input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7 w-full text-lg border-gray-300 focus:border-indigo-500"
                onFocus={(e) => e.target.select()} // Select all text on focus
              />
            </div>
          </div>
          
          {/* Date - Enhanced style */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium text-gray-700 block mb-1">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border-gray-300 focus:border-indigo-500"
            />
          </div>
          
          {/* Category Selection - Completely redesigned for better visibility */}
          <div className="space-y-3">
            <Label htmlFor="category" className="text-sm font-medium text-gray-700 block">
              Category
            </Label>
            {category && (
              <div className="bg-indigo-50 p-2 rounded-md mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {categories.find(c => c.id === category || c.name.toLowerCase() === category.toLowerCase())?.icon}
                  <span className="font-medium text-indigo-700">{getSelectedCategoryName()}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setCategory('')}
                  className="h-7 w-7 p-0 rounded-full text-indigo-700 hover:bg-indigo-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((cat) => {
                const isSelected = category === cat.id || category === cat.name;
                return (
                  <div 
                    key={cat.id} 
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? `${getCategoryColorClass(cat.id, true)} shadow-sm` 
                        : `bg-white border-gray-200 hover:${getCategoryColorClass(cat.id, false)}`
                    }`}
                    onClick={() => setCategory(cat.id)}
                  >
                    <div className={`p-2 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-50'}`}>
                      {React.cloneElement(cat.icon as React.ReactElement, {
                        className: `h-5 w-5 ${isSelected ? getCategoryColorClass(cat.id, true).split(' ').find(cls => cls.startsWith('text-')) || '' : 'text-gray-600'}`
                      })}
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? '' : 'text-gray-700'}`}>
                      {cat.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Payment Method Selection - Completely redesigned for better visibility */}
          <div className="space-y-3">
            <Label htmlFor="payment-method" className="text-sm font-medium text-gray-700 block">
              Payment Method
            </Label>
            {paymentMethod && (
              <div className="bg-indigo-50 p-2 rounded-md mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {paymentMethods.find(m => m.id === paymentMethod || m.name.toLowerCase() === paymentMethod.toLowerCase())?.icon}
                  <span className="font-medium text-indigo-700">{getSelectedPaymentMethodName()}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPaymentMethod('')}
                  className="h-7 w-7 p-0 rounded-full text-indigo-700 hover:bg-indigo-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === method.id || paymentMethod === method.name
                      ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setPaymentMethod(method.id)}
                >
                  <div className="p-2 rounded-full bg-white">
                    {method.icon}
                  </div>
                  <span className={`text-sm font-medium ${
                    paymentMethod === method.id || paymentMethod === method.name
                      ? 'text-indigo-700' 
                      : 'text-gray-700'
                  }`}>
                    {method.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Notes - Enhanced style */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700 block mb-1">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional details..."
              className="h-20 text-sm border-gray-300 focus:border-indigo-500"
            />
          </div>
        </div>
        
        {/* Footer */}
        <DialogFooter className="p-4 border-t border-gray-200 flex gap-2 sticky bottom-0 bg-white z-10">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 font-medium"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddTransaction}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                {isEditing ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              isEditing ? 'Update' : 'Add'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
