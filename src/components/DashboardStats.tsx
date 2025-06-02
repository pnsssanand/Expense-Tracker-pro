import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Edit } from 'lucide-react';
import { 
  collection, query, where, getDocs, doc, getDoc, setDoc, 
  updateDoc, serverTimestamp, orderBy, Timestamp, onSnapshot
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const DashboardStats = () => {
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [savings, setSavings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for edit dialogs
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const { toast } = useToast();
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();
  
  useEffect(() => {
    fetchFinancialData();
    calculateMonthlyExpenses();
    
    // Listen for transaction changes to update balance in real-time
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    const unsubscribe = onSnapshot(
      collection(db, 'users', userId, 'transactions'),
      () => {
        fetchFinancialData();
        calculateMonthlyExpenses();
      }
    );
    
    return () => unsubscribe();
  }, []);
  
  const fetchFinancialData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      // Get financial profile document
      const financialDoc = await getDoc(doc(db, 'users', userId, 'financialProfile', 'stats'));
      
      if (financialDoc.exists()) {
        const data = financialDoc.data();
        setTotalBalance(data.totalBalance || 0);
        setSavings(data.savings || 0);
        
        // Get monthly income for current month
        const currentMonthKey = `${currentYear}-${new Date().getMonth() + 1}`;
        setMonthlyIncome(data.monthlyIncome?.[currentMonthKey] || 0);
      } else {
        // Initialize the financial profile with default values
        await setDoc(doc(db, 'users', userId, 'financialProfile', 'stats'), {
          totalBalance: 0,
          savings: 0,
          monthlyIncome: {},
          updatedAt: serverTimestamp()
        });
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast({
        title: "Failed to load financial data",
        description: "Please try refreshing the page.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };
  
  const calculateMonthlyExpenses = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      // Calculate start and end of current month
      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const expensesQuery = query(
        collection(db, 'users', userId, 'transactions'),
        where('type', '==', 'expense'),
        where('date', '>=', Timestamp.fromDate(startMonth)),
        where('date', '<=', Timestamp.fromDate(endMonth))
      );
      
      const expenseDocs = await getDocs(expensesQuery);
      
      let totalExpenses = 0;
      expenseDocs.forEach((doc) => {
        const expense = doc.data();
        totalExpenses += expense.amount || 0;
      });
      
      setMonthlyExpenses(totalExpenses);
    } catch (error) {
      console.error('Error calculating monthly expenses:', error);
    }
  };
  
  const handleSaveFinancialData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const value = parseFloat(editValue);
      if (isNaN(value) || value < 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid positive number.",
          variant: "destructive",
        });
        return;
      }
      
      const docRef = doc(db, 'users', userId, 'financialProfile', 'stats');
      const financialDoc = await getDoc(docRef);
      const currentData = financialDoc.exists() ? financialDoc.data() : {};
      
      let updatedData = {};
      
      switch (editingCard) {
        case 'balance':
          updatedData = { totalBalance: value };
          setTotalBalance(value);
          break;
          
        case 'income':
          const currentMonthKey = `${currentYear}-${new Date().getMonth() + 1}`;
          updatedData = { 
            monthlyIncome: { 
              ...currentData.monthlyIncome,
              [currentMonthKey]: value 
            }
          };
          setMonthlyIncome(value);
          break;
          
        case 'savings':
          updatedData = { savings: value };
          setSavings(value);
          break;
      }
      
      await updateDoc(docRef, {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      
      toast({
        title: "Updated successfully",
        description: `Your financial information has been updated.`,
      });
      
      setEditingCard(null);
    } catch (error) {
      console.error('Error saving financial data:', error);
      toast({
        title: "Update failed",
        description: "There was a problem updating your information.",
        variant: "destructive",
      });
    }
  };
  
  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };
  
  if (isLoading) {
    return <div className="flex justify-center p-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
    </div>;
  }
  
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Balance */}
        <Card 
          className="bg-white/90 backdrop-blur-sm border-0 rounded-3xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => {
            setEditingCard('balance');
            setEditValue(totalBalance.toString());
          }}
        >
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">BALANCE</p>
                <h3 className="text-2xl font-bold text-gray-900">Current Balance</h3>
                <p className="text-3xl font-bold mt-2">{formatCurrency(totalBalance)}</p>
              </div>
              <div className="relative group">
                <div className="p-3 rounded-2xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
                <div className="absolute top-0 right-0 p-1 rounded-full bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit className="h-3 w-3 text-gray-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Income */}
        <Card 
          className="bg-white/90 backdrop-blur-sm border-0 rounded-3xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => {
            setEditingCard('income');
            setEditValue(monthlyIncome.toString());
          }}
        >
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">THIS MONTH ({currentMonth})</p>
                <h3 className="text-2xl font-bold text-gray-900">Monthly Income</h3>
                <p className="text-3xl font-bold mt-2">{formatCurrency(monthlyIncome)}</p>
              </div>
              <div className="relative group">
                <div className="p-3 rounded-2xl bg-green-100 group-hover:bg-green-200 transition-colors">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="absolute top-0 right-0 p-1 rounded-full bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit className="h-3 w-3 text-gray-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Expenses */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 rounded-3xl shadow-lg overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">THIS MONTH ({currentMonth})</p>
                <h3 className="text-2xl font-bold text-gray-900">Monthly Expenses</h3>
                <p className="text-3xl font-bold mt-2">{formatCurrency(monthlyExpenses)}</p>
              </div>
              <div className="p-3 rounded-2xl bg-red-100">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Savings */}
        <Card 
          className="bg-white/90 backdrop-blur-sm border-0 rounded-3xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => {
            setEditingCard('savings');
            setEditValue(savings.toString());
          }}
        >
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">TOTAL</p>
                <h3 className="text-2xl font-bold text-gray-900">Savings</h3>
                <p className="text-3xl font-bold mt-2">{formatCurrency(savings)}</p>
              </div>
              <div className="relative group">
                <div className="p-3 rounded-2xl bg-purple-100 group-hover:bg-purple-200 transition-colors">
                  <PiggyBank className="h-6 w-6 text-purple-600" />
                </div>
                <div className="absolute top-0 right-0 p-1 rounded-full bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit className="h-3 w-3 text-gray-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editingCard !== null} onOpenChange={() => setEditingCard(null)}>
        <DialogContent className="bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editingCard === 'balance' && 'Edit Current Balance'}
              {editingCard === 'income' && `Edit ${currentMonth} Income`}
              {editingCard === 'savings' && 'Edit Savings'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-gray-700">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                <Input 
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="pl-7 bg-gray-50 border-gray-200"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCard(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFinancialData}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
