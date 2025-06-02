import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, Filter, Download, Edit, Trash2, CreditCard, 
  Smartphone, Banknote, PlusCircle, Receipt, Utensils, 
  Car, Film, Heart, Tag, Briefcase, AlertCircle, X,
  ArrowDownCircle, ArrowUpCircle, CalendarRange
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, Timestamp, getDoc, increment, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AddTransactionModal } from './AddTransactionModal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export const TransactionSheet = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New state variables for edit and delete operations
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { toast } = useToast();

  // Add these new state variables at the top with other useState declarations
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date }>({
    from: undefined,
    to: undefined
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);
  const [transactionType, setTransactionType] = useState('all');

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    setIsLoading(true);
    const q = query(
      collection(db, 'users', userId, 'transactions'), 
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const transactionsData: any[] = [];
      querySnapshot.forEach((doc) => {
        transactionsData.push({ id: doc.id, ...doc.data() });
      });
      setTransactions(transactionsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getPaymentIcon = (method: string) => {
    switch (method?.toLowerCase() || '') {
      case 'cash':
        return <Banknote className="w-4 h-4 text-green-500" />;
      case 'phonepe':
        return <Smartphone className="w-4 h-4 text-purple-500" />;
      case 'paytm':
        return <Smartphone className="w-4 h-4 text-blue-500" />;
      case 'card':
      case 'debit/credit card':
        return <CreditCard className="w-4 h-4 text-orange-500" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-500" />;
    }
  };

  // Enhanced filtering function
  const filteredTransactions = transactions.filter(transaction => {
    // Text search condition
    const matchesSearch = searchTerm === '' || 
      transaction.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter condition
    const matchesCategory = filterCategory === 'all' || 
      transaction.category?.toLowerCase() === filterCategory;
    
    // Payment method filter condition
    const matchesPayment = filterPaymentMethod === 'all' || 
      transaction.paymentMethod?.toLowerCase() === filterPaymentMethod;
    
    // Transaction type filter condition
    const matchesType = transactionType === 'all' || 
      transaction.type === transactionType;
    
    // Date range filter condition
    const transactionDate = transaction.date.toDate();
    const matchesDateRange = (!dateRange.from || transactionDate >= dateRange.from) &&
      (!dateRange.to || transactionDate <= dateRange.to);
    
    return matchesSearch && matchesCategory && matchesPayment && matchesType && matchesDateRange;
  });

  // Calculate active filters
  useEffect(() => {
    let count = 0;
    if (searchTerm) count++;
    if (filterCategory !== 'all') count++;
    if (filterPaymentMethod !== 'all') count++;
    if (transactionType !== 'all') count++;
    if (dateRange.from || dateRange.to) count++;
    
    setActiveFilters(count);
  }, [searchTerm, filterCategory, filterPaymentMethod, transactionType, dateRange]);

  // Calculate spending breakdown by payment method
  const calculatePaymentBreakdown = () => {
    const breakdown: Record<string, number> = {};
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    // Return early if there are no expense transactions
    if (expenseTransactions.length === 0) {
      return {};
    }
    
    expenseTransactions.forEach(transaction => {
      const method = transaction.paymentMethod?.toLowerCase() || 'other';
      if (!breakdown[method]) {
        breakdown[method] = 0;
      }
      breakdown[method] += parseFloat(transaction.amount) || 0;
    });

    return breakdown;
  };
  
  const paymentBreakdown = calculatePaymentBreakdown();
  const hasPaymentData = Object.keys(paymentBreakdown).length > 0;

  // Get total spending amount
  const totalSpending = Object.values(paymentBreakdown).reduce((sum: number, amount: number) => sum + amount, 0);

  // Handler for edit button
  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction({
      id: transaction.id,
      purpose: transaction.purpose,
      amount: transaction.amount.toString(),
      category: transaction.category,
      paymentMethod: transaction.paymentMethod,
      type: transaction.type,
      date: transaction.date.toDate().toISOString().split('T')[0],
      notes: transaction.notes || '',
    });
  };

  // Handler for updating transaction
  const handleUpdateTransaction = async (updatedData: any) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId || !editingTransaction?.id) return;

      const transactionRef = doc(db, 'users', userId, 'transactions', editingTransaction.id);
      
      // Calculate balance adjustment
      const originalTransaction = transactions.find(t => t.id === editingTransaction.id);
      const originalAmount = originalTransaction?.amount || 0;
      const newAmount = parseFloat(updatedData.amount);
      let balanceAdjustment = 0;
      
      if (originalTransaction?.type === 'expense' && updatedData.type === 'expense') {
        // If still an expense, adjust by difference
        balanceAdjustment = originalAmount - newAmount;
      } else if (originalTransaction?.type === 'income' && updatedData.type === 'income') {
        // If still income, adjust by difference
        balanceAdjustment = newAmount - originalAmount;
      } else if (originalTransaction?.type === 'expense' && updatedData.type === 'income') {
        // Changed from expense to income, add both
        balanceAdjustment = originalAmount + newAmount;
      } else if (originalTransaction?.type === 'income' && updatedData.type === 'expense') {
        // Changed from income to expense, subtract both
        balanceAdjustment = -(originalAmount + newAmount);
      }

      // Update the transaction
      await updateDoc(transactionRef, {
        purpose: updatedData.purpose,
        amount: parseFloat(updatedData.amount),
        category: updatedData.category,
        paymentMethod: updatedData.paymentMethod,
        type: updatedData.type,
        date: new Date(updatedData.date),
        notes: updatedData.notes,
        updatedAt: Timestamp.now()
      });

      // Update financial stats to reflect the change if needed
      if (balanceAdjustment !== 0) {
        const financialDocRef = doc(db, 'users', userId, 'financialProfile', 'stats');
        const financialDocSnap = await getDoc(financialDocRef);
        if (financialDocSnap.exists()) {
          await updateDoc(financialDocRef, {
            totalBalance: increment(balanceAdjustment)
          });
        }
      }

      toast({
        title: "Transaction updated",
        description: "Your transaction has been updated successfully.",
      });

      setEditingTransaction(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Update failed",
        description: "There was a problem updating the transaction.",
        variant: "destructive",
      });
    }
  };

  // Handler for delete confirmation
  const handleDeleteTransaction = async () => {
    if (!deletingTransactionId) return;
    
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Find the transaction to be deleted
      const transactionToDelete = transactions.find(t => t.id === deletingTransactionId);
      if (!transactionToDelete) return;

      // Delete the transaction
      await deleteDoc(doc(db, 'users', userId, 'transactions', deletingTransactionId));

      // Update balance if needed
      const amount = transactionToDelete.amount || 0;
      const type = transactionToDelete.type;
      
      if (amount > 0) {
        const financialDocRef = doc(db, 'users', userId, 'financialProfile', 'stats');
        // Adjust balance: add back if it was an expense, subtract if it was income
        const balanceAdjustment = type === 'expense' ? amount : -amount;
        
        await updateDoc(financialDocRef, {
          totalBalance: increment(balanceAdjustment)
        });
      }

      toast({
        title: "Transaction deleted",
        description: "The transaction has been deleted successfully.",
      });

      setDeletingTransactionId(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Delete failed",
        description: "There was a problem deleting the transaction.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllTransactions = async () => {
    if (!auth.currentUser?.uid) return;
    
    try {
      setIsDeletingAll(true);
      const userId = auth.currentUser.uid;
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      const querySnapshot = await getDocs(transactionsRef);
      
      const deletePromises = querySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
      
      toast({
        title: "Transactions deleted",
        description: "All transactions have been successfully deleted.",
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting transactions:", error);
      toast({
        title: "Error",
        description: "Failed to delete transactions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Export function
  const handleExport = async () => {
    if (filteredTransactions.length === 0) return;
    
    try {
      setIsExporting(true);
      
      // Format the data for CSV
      const headers = ['Date', 'Type', 'Purpose', 'Category', 'Payment Method', 'Amount', 'Notes'];
      const csvRows = [
        headers.join(','),
        ...filteredTransactions.map(t => [
          new Date(t.date.toDate()).toLocaleDateString(),
          t.type,
          `"${t.purpose.replace(/"/g, '""')}"`, // Escape quotes in CSV
          t.category,
          t.paymentMethod,
          parseFloat(t.amount).toFixed(2),
          t.notes ? `"${t.notes.replace(/"/g, '""')}"` : ''
        ].join(','))
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create a link to download the CSV
      const link = document.createElement('a');
      const filename = `transactions_export_${new Date().toISOString().slice(0, 10)}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export complete",
        description: `${filteredTransactions.length} transactions exported to CSV.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was a problem exporting your transactions.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setFilterPaymentMethod('all');
    setTransactionType('all');
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <div className="space-y-6">
      {/* Payment Method Breakdown Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-gray-900 font-display flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            Payment Method Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasPaymentData ? (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Spending Data Yet</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Add your expenses with payment methods to see spending breakdown by payment type.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {Object.entries(paymentBreakdown).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getPaymentIcon(method)}
                      <span className="text-gray-900 capitalize">{method}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-gray-900 font-bold">₹{amount.toFixed(2)}</span>
                      <span className="text-gray-600 text-sm">
                        {((amount / totalSpending) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-300 flex justify-between">
                  <span className="text-gray-900 font-medium">Total Spending</span>
                  <span className="text-gray-900 font-bold">₹{totalSpending.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Keep the chart as-is */}
              <div className="flex items-center justify-center">
                <div className="relative w-40 h-40">
                  {/* Progress Ring Chart */}
                  {Object.entries(paymentBreakdown).map(([method, amount], index) => {
                    const percentage = amount / totalSpending;
                    const dashArray = 2 * Math.PI * 38; // 2πr
                    const dashOffset = dashArray * (1 - percentage);
                    const rotate = index > 0 ? 
                      Object.entries(paymentBreakdown)
                        .slice(0, index)
                        .reduce((sum, [, amt]) => sum + (amt / totalSpending), 0) * 360 
                      : 0;
                    
                    const getColorByMethod = (method) => {
                      switch (method) {
                        case 'cash': return 'rgb(72, 187, 120)'; // green
                        case 'phonepe': return 'rgb(124, 58, 237)'; // purple
                        case 'paytm': return 'rgb(59, 130, 246)'; // blue
                        case 'card': return 'rgb(249, 115, 22)'; // orange
                        default: return 'rgb(156, 163, 175)'; // gray
                      }
                    };
                    
                    return (
                      <svg 
                        key={method}
                        className="absolute inset-0 -rotate-90" 
                        style={{ transform: `rotate(${rotate}deg)` }}
                        viewBox="0 0 100 100"
                      >
                        <circle 
                          cx="50" cy="50" r="38" 
                          fill="transparent"
                          stroke={getColorByMethod(method)}
                          strokeWidth="12"
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                        />
                      </svg>
                    );
                  })}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {Object.keys(paymentBreakdown).length} methods
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Transaction Filters */}
      <Card className="bg-white shadow-lg rounded-xl border border-gray-100">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-gray-800 font-display flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-600" />
              Filter Transactions
              {activeFilters > 0 && (
                <span className="bg-indigo-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              {activeFilters > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Clear filters
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-gray-600 hover:text-gray-900"
              >
                {showFilters ? "Hide options" : "Show options"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className={showFilters ? "py-4" : "py-0 h-0 overflow-hidden"}>
          <div className="space-y-6">
            {/* Quick filters */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Search</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by purpose, category, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-200 focus:border-indigo-500 rounded-lg"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full text-gray-400 hover:text-gray-600"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Advanced filters */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Advanced Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Transaction Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent position="item-aligned" sideOffset={5} align="start">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="expense" className="flex items-center gap-2">
                        <ArrowDownCircle className="h-3.5 w-3.5 text-red-500" />
                        <span>Expenses</span>
                      </SelectItem>
                      <SelectItem value="income" className="flex items-center gap-2">
                        <ArrowUpCircle className="h-3.5 w-3.5 text-green-500" />
                        <span>Income</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Category</label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="modern-input">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="visible-dropdown">
                      <SelectItem value="all" className="dropdown-item">All Categories</SelectItem>
                      <SelectItem value="food & dining" className="dropdown-item">Food & Dining</SelectItem>
                      <SelectItem value="transportation" className="dropdown-item">Transportation</SelectItem>
                      <SelectItem value="entertainment" className="dropdown-item">Entertainment</SelectItem>
                      <SelectItem value="healthcare" className="dropdown-item">Healthcare</SelectItem>
                      <SelectItem value="salary" className="dropdown-item">Salary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Payment Method</label>
                  <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                    <SelectTrigger className="modern-input">
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent className="visible-dropdown">
                      <SelectItem value="all" className="dropdown-item">All Methods</SelectItem>
                      <SelectItem value="cash" className="dropdown-item">Cash</SelectItem>
                      <SelectItem value="phonepe" className="dropdown-item">PhonePe</SelectItem>
                      <SelectItem value="paytm" className="dropdown-item">Paytm</SelectItem>
                      <SelectItem value="card" className="dropdown-item">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Date Range filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Date Range</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-gray-50 border-gray-200 rounded-lg w-full justify-start text-left font-normal"
                      >
                        <CalendarRange className="mr-2 h-4 w-4 text-gray-500" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                            </>
                          ) : (
                            format(dateRange.from, "MMM d, yyyy")
                          )
                        ) : (
                          "Select date range"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        initialFocus
                      />
                      <div className="p-2 border-t border-gray-200 flex justify-between">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setDateRange({ from: undefined, to: undefined })}
                        >
                          Clear
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => document.body.click()} // close the popover
                        >
                          Apply
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Filter summary */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium text-gray-900">{filteredTransactions.length}</span> of {transactions.length} transactions
              </div>
              
              {activeFilters > 0 && (
                <div className="flex flex-wrap gap-2 ml-auto">
                  {filterCategory !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Category: {filterCategory}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterCategory('all')} />
                    </Badge>
                  )}
                  {filterPaymentMethod !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Payment: {filterPaymentMethod}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterPaymentMethod('all')} />
                    </Badge>
                  )}
                  {transactionType !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Type: {transactionType === 'expense' ? 'Expenses' : 'Income'}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setTransactionType('all')} />
                    </Badge>
                  )}
                  {(dateRange.from || dateRange.to) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Date Filter
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setDateRange({ from: undefined, to: undefined })} />
                    </Badge>
                  )}
                </div>
              )}
              
              <Button 
                className="ml-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md rounded-lg transition-all" 
                disabled={filteredTransactions.length === 0 || isExporting}
                onClick={handleExport}
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="bg-white shadow-md rounded-xl border border-gray-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-800 font-display">Transaction History</CardTitle>
          {transactions.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-16 bg-white/5">
              <div className="w-12 h-12 relative">
                <div className="absolute inset-0 rounded-full border-t-2 border-white/20 animate-spin"></div>
                <div className="absolute inset-0 rounded-full border-l-2 border-blue-500 animate-spin"></div>
              </div>
              <p className="mt-4 text-white/60 text-sm">Loading your transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 bg-white/5">
              <div className="p-4 rounded-full bg-white/5 inline-flex mb-4">
                <PlusCircle className="mx-auto h-12 w-12 text-white/30" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Transactions Yet</h3>
              <p className="text-white/70 max-w-md mx-auto px-6">
                You haven't added any transactions yet. Start tracking your expenses by adding your first transaction.
              </p>
              <Button 
                variant="outline" 
                className="mt-6 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => window.dispatchEvent(new CustomEvent('open-add-transaction'))}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Your First Transaction
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 bg-white/5">
                    <TableHead className="text-white/80 font-semibold">Date</TableHead>
                    <TableHead className="text-white/80 font-semibold">Purpose</TableHead>
                    <TableHead className="text-white/80 font-semibold">Category</TableHead>
                    <TableHead className="text-white/80 font-semibold">Payment Method</TableHead>
                    <TableHead className="text-white/80 font-semibold">Amount</TableHead>
                    <TableHead className="text-white/80 font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-white/60">
                        No transactions match your current filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow 
                        key={transaction.id} 
                        className="border-white/10 backdrop-blur-sm transition-colors"
                      >
                        <TableCell className="text-white/90 font-medium">
                          <div className="flex flex-col">
                            <span>{new Date(transaction.date).toLocaleDateString('en-US', {day: 'numeric', month: 'short'})}</span>
                            <span className="text-xs text-white/50">{new Date(transaction.date).toLocaleDateString('en-US', {year: 'numeric'})}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-white font-medium">{transaction.purpose}</p>
                            {transaction.notes && (
                              <p className="text-white/60 text-sm line-clamp-1">{transaction.notes}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white backdrop-blur-sm border border-white/5">
                              {getCategoryIcon(transaction.category)}
                              <span className="ml-1">{transaction.category}</span>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md" style={{
                              backgroundColor: getPaymentMethodColor(transaction.paymentMethod) + '20'
                            }}>
                              {getPaymentIcon(transaction.paymentMethod)}
                            </div>
                            <span className="text-white/90">{transaction.paymentMethod}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold ${
                            transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            <div className="flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full mr-1.5" 
                                style={{
                                  backgroundColor: transaction.type === 'income' ? '#34D399' : '#F87171'
                                }}
                              ></span>
                              {transaction.type === 'income' ? '+' : '-'}₹{parseFloat(transaction.amount).toFixed(2)}
                            </div>
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="rounded-full h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                              onClick={() => handleEditTransaction(transaction)}
                            >
                              <Edit className="w-4 h-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="rounded-full h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => setDeletingTransactionId(transaction.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {filteredTransactions.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/5">
                  <div className="text-sm text-white/60">
                    Showing <span className="font-medium text-white">{filteredTransactions.length}</span> transactions
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-white/10 bg-white/5 text-white hover:bg-white/10 text-xs px-3"
                      disabled
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-white/10 bg-white/5 text-white hover:bg-white/10 text-xs px-3"
                      disabled
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTransactionId} onOpenChange={(open) => !open && setDeletingTransactionId(null)}>
        <AlertDialogContent className="bg-white text-gray-800 border border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete this transaction? 
              This action cannot be undone and the transaction will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={handleDeleteTransaction}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <AddTransactionModal
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          transactionToEdit={editingTransaction}
          onUpdate={handleUpdateTransaction}
        />
      )}

      {/* Delete All Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete All Transactions
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              Are you sure you want to delete all transactions? This action cannot be undone and all your transaction history will be permanently lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeletingAll}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteAllTransactions}
              disabled={isDeletingAll}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {isDeletingAll ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete All"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper functions to add category icons and payment method colors
const getCategoryIcon = (category: string) => {
  const categoryIcons = {
    'food & dining': <Utensils className="w-3 h-3 text-orange-400" />,
    'transportation': <Car className="w-3 h-3 text-blue-400" />,
    'entertainment': <Film className="w-3 h-3 text-purple-400" />,
    'healthcare': <Heart className="w-3 h-3 text-pink-400" />,
    'salary': <Briefcase className="w-3 h-3 text-green-400" />,
    // Add more category icons as needed
  };
  
  return categoryIcons[category?.toLowerCase()] || <Tag className="w-3 h-3 text-gray-400" />;
};

const getPaymentMethodColor = (method: string) => {
  const colors = {
    'cash': '#22c55e',
    'phonepe': '#7c3aed',
    'paytm': '#3b82f6',
    'card': '#f97316',
    'debit/credit card': '#f97316'
  };
  
  return colors[method?.toLowerCase()] || '#6B7280';
};
