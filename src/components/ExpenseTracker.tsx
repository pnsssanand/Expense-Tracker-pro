import React, { useState, useEffect } from 'react';
import { TransactionSheet } from './TransactionSheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doc, getDoc, onSnapshot, collection, query, orderBy, limit, getDocs, updateDoc, addDoc, Timestamp, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { AddTransactionModal } from './AddTransactionModal';
import { 
  Wallet, TrendingUp, Bell, LogOut, Settings, Plus, PencilLine,
  CreditCard, ArrowUpRight, ArrowDownRight, Calendar, 
  DollarSign, BarChart3, PieChart, BellRing, Receipt, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Define proper transaction type
interface Transaction {
  id: string;
  purpose: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  paymentMethod: string;
  date: {
    toDate: () => Date;
  };
  notes?: string;
}

// Add these interfaces to define the data structures
interface FinancialReminder {
  id?: string;
  title: string;
  date: Date;
  description: string;
  isCompleted: boolean;
}

interface BudgetGoal {
  id?: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  endDate?: Date;
  category: string;
}

export const ExpenseTracker = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [userName, setUserName] = useState('');
  const [financialData, setFinancialData] = useState({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0
  });
  
  // States for editing financial data
  const [isEditing, setIsEditing] = useState({
    totalBalance: false,
    monthlyIncome: false,
    monthlyExpenses: false
  });
  const [editValues, setEditValues] = useState({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0
  });
  
  // State for financial data edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEditField, setCurrentEditField] = useState('');
  const [editModalValue, setEditModalValue] = useState('');
  
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [spendingInsights, setSpendingInsights] = useState({
    highestCategory: 'N/A',
    percentSpent: 0,
    prevMonthDiff: 0
  });
  const [quickTips] = useState([
    "Save 20% of your income for emergencies.",
    "Track daily expenses for better financial awareness.",
    "Set budget goals for different expense categories.",
    "Review your spending patterns monthly."
  ]);
  
  // Add new state variables for reminders and goals
  const [reminders, setReminders] = useState<FinancialReminder[]>([]);
  const [goals, setGoals] = useState<BudgetGoal[]>([
    {
      id: '1',
      title: 'Emergency Fund',
      targetAmount: 50000,
      currentAmount: 20000,
      category: 'savings'
    },
    {
      id: '2',
      title: 'Vacation Savings',
      targetAmount: 30000,
      currentAmount: 19500,
      category: 'travel'
    },
    {
      id: '3',
      title: 'New Laptop',
      targetAmount: 75000,
      currentAmount: 15000,
      category: 'tech'
    }
  ]);
  
  // Add state for modal visibility
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  
  // Add state for form values
  const [newReminder, setNewReminder] = useState<FinancialReminder>({
    title: '',
    date: new Date(),
    description: '',
    isCompleted: false
  });
  
  const [newGoal, setNewGoal] = useState<BudgetGoal>({
    title: '',
    targetAmount: 0,
    currentAmount: 0,
    category: ''
  });
  
  const { toast } = useToast();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName?.split(' ')[0] || '');
      
      // Setup listener for financial data
      const userId = user.uid;
      const financialRef = doc(db, 'users', userId, 'financialProfile', 'stats');
      
      const unsubscribe = onSnapshot(financialRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          // Ensure all financial values are proper numbers
          setFinancialData({
            totalBalance: parseFloat(data.totalBalance || 0),
            monthlyIncome: parseFloat(data.monthlyIncome || 0),
            monthlyExpenses: parseFloat(data.monthlyExpenses || 0)
          });
          
          // Initialize edit values
          setEditValues({
            totalBalance: parseFloat(data.totalBalance || 0),
            monthlyIncome: parseFloat(data.monthlyIncome || 0),
            monthlyExpenses: parseFloat(data.monthlyExpenses || 0)
          });
        }
      });
      
      return () => unsubscribe();
    }
  }, []);

  // Listen for custom event to open transaction modal
  useEffect(() => {
    const handleOpenAddTransaction = () => setShowAddTransaction(true);
    window.addEventListener('open-add-transaction', handleOpenAddTransaction);
    
    return () => {
      window.removeEventListener('open-add-transaction', handleOpenAddTransaction);
    };
  }, []);

  // Fetch recent transactions
  useEffect(() => {
    const fetchRecentTransactions = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      try {
        const q = query(
          collection(db, 'users', userId, 'transactions'),
          orderBy('date', 'desc'),
          limit(5)
        );
        
        const snapshot = await getDocs(q);
        const transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];
        
        setRecentTransactions(transactions);
        
        // Calculate spending insights
        if (transactions.length > 0) {
          // Group by category to find highest spending category
          const categoryTotals: Record<string, number> = {};
          transactions.forEach(t => {
            if (t.type === 'expense') {
              const category = t.category || 'Other';
              categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(t.amount.toString() || '0');
            }
          });
          
          let highestCategory = 'N/A';
          let highestAmount = 0;
          
          Object.entries(categoryTotals).forEach(([category, amount]) => {
            if (amount > highestAmount) {
              highestAmount = amount;
              highestCategory = category;
            }
          });
          
          // Calculate what percentage of monthly income is spent
          const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount.toString() || '0'), 0);
            
          const percentSpent = financialData.monthlyIncome > 0 
            ? (totalExpenses / financialData.monthlyIncome) * 100 
            : 0;
          
          setSpendingInsights({
            highestCategory,
            percentSpent: Math.min(percentSpent, 100), // Cap at 100%
            prevMonthDiff: Math.random() > 0.5 ? 5.2 : -3.8 // Just a placeholder for demo
          });
        }
      } catch (error) {
        console.error('Error fetching recent transactions:', error);
      }
    };
    
    fetchRecentTransactions();
  }, [financialData.monthlyIncome]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getCurrentMonth = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    return months[now.getMonth()];
  };
  
  // Open edit modal for financial data
  const openEditModal = (field: string) => {
    setCurrentEditField(field);
    
    // Use the proper display name for the field
    const fieldDisplayNames = {
      totalBalance: 'Balance',
      monthlyIncome: 'Monthly Income',
      monthlyExpenses: 'Monthly Expenses'
    };
    
    setEditModalValue(financialData[field as keyof typeof financialData].toString());
    setEditModalOpen(true);
  };
  
  // Save edited financial data
  const saveFinancialData = async () => {
    if (!editModalValue || isNaN(parseFloat(editModalValue))) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid number",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const financialDocRef = doc(db, 'users', userId, 'financialProfile', 'stats');
      
      // Create update object with only the changed field
      const updateData = {
        [currentEditField]: parseFloat(editModalValue)
      };
      
      await updateDoc(financialDocRef, updateData);
      
      // Update local state
      setFinancialData({
        ...financialData,
        [currentEditField]: parseFloat(editModalValue)
      });
      
      toast({
        title: "Updated successfully",
        description: `Your financial data has been updated.`
      });
      
      // Close modal
      setEditModalOpen(false);
    } catch (error) {
      console.error("Error updating financial data:", error);
      toast({
        title: "Update failed",
        description: "There was a problem saving your changes.",
        variant: "destructive"
      });
    }
  };

  // Helper function to safely format currency values
  const formatCurrency = (value: any): string => {
    // Ensure the value is a proper number
    const numValue = typeof value === 'number' ? value : parseFloat(value || 0);
    
    // Check if it's a valid number (not NaN)
    if (isNaN(numValue)) {
      return '0.00';
    }
    
    return numValue.toFixed(2);
  };

  // Add these new functions to handle reminder and goal creation
  const handleAddReminder = async () => {
    try {
      if (!newReminder.title || !newReminder.date) {
        toast({
          title: "Missing information",
          description: "Please enter a title and date for the reminder.",
          variant: "destructive",
        });
        return;
      }
      
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const reminderData = {
        ...newReminder,
        date: Timestamp.fromDate(newReminder.date),
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'users', userId, 'reminders'), reminderData);
      
      // Update local state
      setReminders([...reminders, { ...newReminder, id: docRef.id }]);
      
      toast({
        title: "Reminder added",
        description: "Your financial reminder has been added successfully.",
      });
      
      // Reset form and close modal
      setNewReminder({
        title: '',
        date: new Date(),
        description: '',
        isCompleted: false
      });
      setReminderModalOpen(false);
      
    } catch (error) {
      console.error('Error adding reminder:', error);
      toast({
        title: "Error",
        description: "There was a problem adding your reminder.",
        variant: "destructive",
      });
    }
  };
  
  const handleAddGoal = async () => {
    try {
      if (!newGoal.title || newGoal.targetAmount <= 0) {
        toast({
          title: "Missing information",
          description: "Please enter a title and target amount for the goal.",
          variant: "destructive",
        });
        return;
      }
      
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const goalData = {
        ...newGoal,
        endDate: newGoal.endDate ? Timestamp.fromDate(newGoal.endDate) : null,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'users', userId, 'goals'), goalData);
      
      // Update local state
      setGoals([...goals, { ...newGoal, id: docRef.id }]);
      
      toast({
        title: "Goal added",
        description: "Your budget goal has been added successfully.",
      });
      
      // Reset form and close modal
      setNewGoal({
        title: '',
        targetAmount: 0,
        currentAmount: 0,
        category: ''
      });
      setGoalModalOpen(false);
      
    } catch (error) {
      console.error('Error adding goal:', error);
      toast({
        title: "Error",
        description: "There was a problem adding your goal.",
        variant: "destructive",
      });
    }
  };
  
  // Add a function to fetch existing reminders and goals
  useEffect(() => {
    const fetchRemindersAndGoals = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      try {
        // Fetch reminders
        const reminderQuery = query(
          collection(db, 'users', userId, 'reminders'),
          orderBy('date', 'asc')
        );
        
        const reminderSnapshot = await getDocs(reminderQuery);
        const reminderData = reminderSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate()
        })) as FinancialReminder[];
        
        setReminders(reminderData);
        
        // Fetch goals
        const goalQuery = query(
          collection(db, 'users', userId, 'goals'),
          orderBy('createdAt', 'asc')
        );
        
        const goalSnapshot = await getDocs(goalQuery);
        const goalData = goalSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          endDate: doc.data().endDate ? doc.data().endDate.toDate() : undefined
        })) as BudgetGoal[];
        
        if (goalData.length > 0) {
          setGoals(goalData);
        }
        
      } catch (error) {
        console.error('Error fetching reminders and goals:', error);
      }
    };
    
    fetchRemindersAndGoals();
  }, []);

  // Add these delete handler functions
  const handleDeleteReminder = async (reminderId: string) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId || !reminderId) return;
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', userId, 'reminders', reminderId));
      
      // Update local state
      setReminders(prev => prev.filter(reminder => reminder.id !== reminderId));
      
      toast({
        title: "Reminder deleted",
        description: "Financial reminder has been removed successfully.",
      });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({
        title: "Delete failed",
        description: "There was a problem deleting the reminder.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteGoal = async (goalId: string) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId || !goalId) return;
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', userId, 'goals', goalId));
      
      // Update local state
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
      
      toast({
        title: "Goal deleted",
        description: "Budget goal has been removed successfully.",
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: "Delete failed",
        description: "There was a problem deleting the goal.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header - Mobile optimized with improved typography */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="w-full mx-auto">
          <div className="flex items-center justify-between p-3 md:p-4 md:h-20">
            <div className="flex items-center">
              <div className="p-2 md:p-3 rounded-lg md:rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-md">
                <Wallet className="w-5 h-5 md:w-8 md:h-8 text-white" />
              </div>
              <div className="ml-2 md:ml-4">
                <h1 className="text-lg md:text-3xl font-bold text-gray-900 app-title">Expense Tracker</h1>
                <p className="text-xs md:text-sm text-gray-600">
                  {userName ? `Welcome back, ${userName}` : 'Manage your finances smartly'}
                </p>
              </div>
            </div>
            
            {/* Mobile-friendly Add Transaction Button with improved text */}
            <div className="flex items-center gap-2 md:gap-4">
              <Button 
                onClick={() => setShowAddTransaction(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full px-3 md:px-6 py-1.5 font-medium text-sm flex items-center button-text"
              >
                <Plus className="w-4 h-4 mr-1" /> 
                <span>Add Transaction</span>
              </Button>
              
              {/* Hide action buttons on mobile to save space */}
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                  <Bell className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                  <Settings className="w-5 h-5" />
                </Button>
                <Button 
                  onClick={handleLogout}
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-600 hover:text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Full-screen width on mobile */}
      <div className="w-full px-1 sm:px-4 md:px-6 lg:px-8 my-2 md:my-4 md:max-w-7xl md:mx-auto">
        <div className="w-full overflow-x-auto pb-1 no-scrollbar">
          <div className="flex-grow bg-white/80 backdrop-blur-sm p-1 md:p-2 rounded-xl shadow-md w-full">
            <Tabs 
              defaultValue="dashboard" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="w-full">
                <TabsTrigger 
                  value="dashboard" 
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Dashboard</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="transactions" 
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Transactions</span>
                </TabsTrigger>
              </TabsList>

              {/* Dashboard Content - Full width on mobile with improved typography */}
              <TabsContent value="dashboard" className="mt-3 md:mt-4 space-y-3 md:space-y-4">
                {/* Financial Cards - Adjusted for mobile */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  {/* Current Balance Card */}
                  <div className="bg-white rounded-xl shadow-md p-5 relative card-shadow">
                    <div className="absolute top-3 right-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => openEditModal('totalBalance')}
                      >
                        <PencilLine className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mb-1 text-xs uppercase tracking-wider text-gray-600">
                      BALANCE
                    </div>
                    <div className="flex justify-between items-start">
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 currency">
                        ₹{formatCurrency(financialData.totalBalance)}
                      </h2>
                      <div className="p-2 bg-blue-50 rounded-full">
                        <Wallet className="w-5 h-5 text-blue-500" />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Current Balance
                    </div>
                  </div>
                  
                  {/* Monthly Income Card */}
                  <div className="bg-white rounded-xl shadow-md p-5 relative card-shadow">
                    <div className="absolute top-3 right-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-gray-400 hover:text-green-600 hover:bg-green-50"
                        onClick={() => openEditModal('monthlyIncome')}
                      >
                        <PencilLine className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mb-1 text-xs uppercase tracking-wider text-gray-600">
                      THIS MONTH ({getCurrentMonth()})
                    </div>
                    <div className="flex justify-between items-start">
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 currency">
                        ₹{formatCurrency(financialData.monthlyIncome)}
                      </h2>
                      <div className="p-2 bg-green-50 rounded-full">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Monthly Income
                    </div>
                  </div>
                  
                  {/* Monthly Expenses Card */}
                  <div className="bg-white rounded-xl shadow-md p-5 relative card-shadow">
                    <div className="absolute top-3 right-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => openEditModal('monthlyExpenses')}
                      >
                        <PencilLine className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mb-1 text-xs uppercase tracking-wider text-gray-600">
                      THIS MONTH ({getCurrentMonth()})
                    </div>
                    <div className="flex justify-between items-start">
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 currency">
                        ₹{formatCurrency(financialData.monthlyExpenses)}
                      </h2>
                      <div className="p-2 bg-red-50 rounded-full">
                        <TrendingUp className="w-5 h-5 text-red-500 transform rotate-180" />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Monthly Expenses
                    </div>
                  </div>
                </div>
                
                {/* Added: New content sections to fill the empty space */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Recent Transactions Panel */}
                  <Card className="md:col-span-2 shadow-md rounded-xl card-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2 card-title">
                        <CreditCard className="w-5 h-5 text-indigo-500" /> Recent Transactions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {recentTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                          <div className="bg-gray-100 p-3 rounded-full mb-3">
                            <Receipt className="w-6 h-6 text-gray-400" />
                          </div>
                          <h3 className="text-sm font-medium text-gray-700">No Recent Transactions</h3>
                          <p className="text-xs text-gray-500 mt-1">Your recent transactions will appear here</p>
                          <Button 
                            variant="outline" 
                            className="mt-4 text-xs" 
                            onClick={() => window.dispatchEvent(new CustomEvent('open-add-transaction'))}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Your First Transaction
                          </Button>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {recentTransactions.map((transaction, idx) => (
                            <div key={transaction.id} className="flex items-center justify-between p-4">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-green-50' : 'bg-red-50'}`}>
                                  {transaction.type === 'income' ? (
                                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-sm text-gray-900">{transaction.purpose}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(transaction.date?.toDate()).toLocaleDateString('en-US', {
                                      day: 'numeric', month: 'short'
                                    })}
                                  </p>
                                </div>
                              </div>
                              <span className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {transaction.type === 'income' ? '+' : '-'}₹{formatCurrency(transaction.amount)}
                              </span>
                            </div>
                          ))}
                          {/* View all link */}
                          <div className="p-3 text-center">
                            <Button
                              variant="ghost" 
                              className="text-xs text-indigo-600 hover:text-indigo-800"
                              onClick={() => setActiveTab('transactions')}
                            >
                              View All Transactions →
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Spending Insights Panel */}
                  <Card className="shadow-md rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" /> Spending Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Monthly Budget Usage */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">Budget Usage</p>
                          <p className="text-sm font-medium">{spendingInsights.percentSpent.toFixed(0)}%</p>
                        </div>
                        <Progress 
                          value={spendingInsights.percentSpent} 
                          className="h-2"
                          indicatorClassName={
                            spendingInsights.percentSpent > 90 ? "bg-red-500" :
                            spendingInsights.percentSpent > 75 ? "bg-amber-500" : 
                            "bg-green-500"
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {spendingInsights.percentSpent > 90 
                            ? "You've almost used up your monthly budget!"
                            : spendingInsights.percentSpent > 75
                            ? "You're using your budget quickly this month."
                            : "You're managing your budget well this month."}
                        </p>
                      </div>
                      
                      {/* Top Spending Category */}
                      <div className="bg-indigo-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <PieChart className="w-5 h-5 text-indigo-600" />
                          <p className="text-sm font-medium text-indigo-900">Top Spending Category</p>
                        </div>
                        <p className="text-lg font-semibold text-indigo-700 mt-1">
                          {spendingInsights.highestCategory}
                        </p>
                        <p className="text-xs text-indigo-600 mt-1">
                          {spendingInsights.prevMonthDiff > 0 
                            ? `${spendingInsights.prevMonthDiff}% increase from last month` 
                            : `${Math.abs(spendingInsights.prevMonthDiff)}% decrease from last month`}
                        </p>
                      </div>
                      
                      {/* Finance Tip */}
                      <div className="bg-amber-50 rounded-lg p-3 flex gap-3">
                        <BellRing className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800">
                          {quickTips[Math.floor(Math.random() * quickTips.length)]}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Calendar and Budget Goals Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Monthly Calendar Card - with delete buttons */}
                  <Card className="shadow-md rounded-xl card-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" /> 
                        Financial Calendar
                      </CardTitle>
                      <CardDescription>
                        Important dates for your finances
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {reminders.length > 0 ? (
                        reminders.slice(0, 3).map((reminder) => (
                          <div key={reminder.id} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 relative group">
                            <div className="bg-indigo-100 text-indigo-700 font-bold text-xs p-2 rounded-md flex flex-col items-center h-12 w-12">
                              <span>{new Date(reminder.date).getDate()}</span>
                              <span>{getCurrentMonth().substring(0, 3)}</span>
                            </div>
                            <div className="flex-grow">
                              <p className="text-sm font-medium text-gray-800">{reminder.title}</p>
                              <p className="text-xs text-gray-600">{reminder.description}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteReminder(reminder.id as string)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 relative group">
                            <div className="bg-indigo-100 text-indigo-700 font-bold text-xs p-2 rounded-md flex flex-col items-center h-12 w-12">
                              <span>15</span>
                              <span>{getCurrentMonth().substring(0, 3)}</span>
                            </div>
                            <div className="flex-grow">
                              <p className="text-sm font-medium text-gray-800">Credit Card Payment Due</p>
                              <p className="text-xs text-gray-600">Remember to pay your credit card bill</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => toast({ title: "System Reminder", description: "This is a system reminder and cannot be deleted." })}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                          
                          <div className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 relative group">
                            <div className="bg-green-100 text-green-700 font-bold text-xs p-2 rounded-md flex flex-col items-center h-12 w-12">
                              <span>1</span>
                              <span>Next</span>
                            </div>
                            <div className="flex-grow">
                              <p className="text-sm font-medium text-gray-800">Salary Credit</p>
                              <p className="text-xs text-gray-600">Expected salary deposit date</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => toast({ title: "System Reminder", description: "This is a system reminder and cannot be deleted." })}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        </>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs"
                        onClick={() => setReminderModalOpen(true)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Financial Reminder
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Budget Goals Card - with delete buttons */}
                  <Card className="shadow-md rounded-xl card-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-indigo-500" /> 
                        Budget Goals
                      </CardTitle>
                      <CardDescription>
                        Track your financial targets
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {goals.map((goal) => {
                        const progressPercentage = goal.targetAmount > 0 
                          ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                          : 0;
                          
                        return (
                          <div key={goal.id} className="space-y-2 relative group">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-700">{goal.title}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-700">{progressPercentage.toFixed(0)}%</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDeleteGoal(goal.id as string)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
                            </div>
                            <Progress value={progressPercentage} className="h-2"/>
                            <p className="text-xs text-gray-500">Target: ₹{goal.targetAmount.toLocaleString()}</p>
                          </div>
                        );
                      })}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs"
                        onClick={() => setGoalModalOpen(true)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add New Goal
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="mt-3 md:mt-4">
                <TransactionSheet />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* Add Transaction Modal */}
      <AddTransactionModal 
        isOpen={showAddTransaction} 
        onClose={() => setShowAddTransaction(false)} 
      />
      
      {/* Financial Data Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 rounded-lg overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold">
              Edit {currentEditField === 'totalBalance' ? 'Balance' : 
                    currentEditField === 'monthlyIncome' ? 'Monthly Income' : 'Monthly Expenses'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Amount</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₹</span>
                <Input
                  value={editModalValue}
                  onChange={(e) => setEditModalValue(e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {currentEditField === 'totalBalance' 
                  ? 'This will update your current balance directly.'
                  : `This will update your ${currentEditField === 'monthlyIncome' ? 'income' : 'expense'} for the current month.`}
              </p>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveFinancialData} className="bg-blue-600 text-white hover:bg-blue-700">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Financial Reminder Modal */}
      <Dialog open={reminderModalOpen} onOpenChange={setReminderModalOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 rounded-lg overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold">
              Add Financial Reminder
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Title</label>
              <Input
                value={newReminder.title}
                onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                placeholder="E.g., Pay Credit Card Bill"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date</label>
              <Input
                type="date"
                value={newReminder.date.toISOString().split('T')[0]}
                onChange={(e) => setNewReminder({
                  ...newReminder, 
                  date: e.target.value ? new Date(e.target.value) : new Date()
                })}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Description (Optional)</label>
              <Textarea
                value={newReminder.description}
                onChange={(e) => setNewReminder({...newReminder, description: e.target.value})}
                placeholder="Add details about this reminder"
                className="h-20 resize-none"
              />
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReminderModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddReminder} className="bg-blue-600 text-white hover:bg-blue-700">
              Save Reminder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Add Budget Goal Modal */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 rounded-lg overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold">
              Add Budget Goal
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Goal Title</label>
              <Input
                value={newGoal.title}
                onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                placeholder="E.g., New Car Fund"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Target Amount</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">₹</span>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={newGoal.targetAmount || ''}
                  onChange={(e) => setNewGoal({...newGoal, targetAmount: parseFloat(e.target.value) || 0})}
                  className="pl-7 w-full"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Current Amount (Optional)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">₹</span>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={newGoal.currentAmount || ''}
                  onChange={(e) => setNewGoal({...newGoal, currentAmount: parseFloat(e.target.value) || 0})}
                  className="pl-7 w-full"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Target Date (Optional)</label>
              <Input
                type="date"
                value={newGoal.endDate ? newGoal.endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setNewGoal({
                  ...newGoal, 
                  endDate: e.target.value ? new Date(e.target.value) : undefined
                })}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Category (Optional)</label>
              <Input
                value={newGoal.category}
                onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}
                placeholder="E.g., Car, Travel, Tech"
                className="w-full"
              />
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setGoalModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGoal} className="bg-blue-600 text-white hover:bg-blue-700">
              Save Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Custom Footer with improved typography */}
      <footer className="bg-white mt-6 md:mt-8 py-6 md:py-8 border-t border-gray-200 w-full">
        <div className="w-full px-4 md:px-6 lg:px-8 md:max-w-7xl md:mx-auto">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center md:justify-start space-x-6">
              <a href="#" className="text-gray-400 hover:text-gray-500 font-medium">
                <span className="sr-only">Privacy Policy</span>
                <span className="text-sm">Privacy</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500 font-medium">
                <span className="sr-only">Terms of Service</span>
                <span className="text-sm">Terms</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500 font-medium">
                <span className="sr-only">Contact Us</span>
                <span className="text-sm">Contact</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500 font-medium">
                <span className="sr-only">Feedback</span>
                <span className="text-sm">Feedback</span>
              </a>
            </div>
            
            <p className="mt-4 md:mt-0 text-center md:text-right text-sm text-gray-500">
              <span className="block md:inline">Designed and Developed by</span>
              <span className="font-bold text-indigo-600 md:ml-1">Mr. Anand Pinisetty</span>
            </p>
          </div>
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>© 2025 <span className="app-title">Expense Tracker</span>. All rights reserved.</p>
            <p className="mt-1">A smart way to track and manage your personal finances.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
