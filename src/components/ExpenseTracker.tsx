import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Wallet, TrendingDown, TrendingUp, LogOut, Settings, Bell, Mail, InfoIcon } from 'lucide-react';
import { TransactionSheet } from './TransactionSheet';
import { AddTransactionModal } from './AddTransactionModal';
import { DashboardStats } from './DashboardStats';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';

export const ExpenseTracker = () => {
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userName, setUserName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.username || '');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-gray-900">Expense Tracker</h1>
                <p className="text-gray-600 text-sm">
                  {userName ? `Welcome back, ${userName}` : 'Manage your finances smartly'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => setShowAddTransaction(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Transaction
              </Button>
              <Button 
                variant="ghost"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-3 rounded-xl"
              >
                <Bell className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-3 rounded-xl"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button 
                onClick={handleLogout}
                variant="ghost"
                className="text-gray-600 hover:text-red-600 hover:bg-red-50 p-3 rounded-xl"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-8">
        <div className="flex flex-wrap gap-2 mb-8 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg">
          { [
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'transactions', label: 'Transactions', icon: Wallet }
          ].map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-8 pb-8">
          {activeTab === 'dashboard' && <DashboardStats />}
          {activeTab === 'transactions' && <TransactionSheet />}
        </div>
      </div>

      {/* Getting Started Card - Shows initially when no transactions */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mb-8">
        <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-3xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-blue-100">
                <InfoIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Getting Started with Expense Tracker</h3>
                <p className="text-gray-600">
                  Click the "Add Transaction" button in the header to record your first expense or income.
                  Track all your spending and earnings in one place!
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <footer className="mt-16 bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-bold text-gray-900">Expense Tracker</h3>
                  <p className="text-gray-600 text-sm">Smart Finance Management</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Take complete control of your personal finances with our comprehensive expense tracking solution. 
                Monitor, analyze, and optimize your spending habits.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 text-lg">Core Features</h4>
              <ul className="space-y-3">
                {['Smart Transaction Tracking', 'Budget Management', 'Payment Method Analysis', 'Financial Insights & Reports'].map((feature) => (
                  <li key={feature} className="text-gray-700 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 text-lg">Support & Help</h4>
              <ul className="space-y-3">
                {['Help Center & Tutorials', 'Customer Support', 'Privacy & Security', 'Terms of Service'].map((item) => (
                  <li key={item} className="text-gray-700 hover:text-blue-600 cursor-pointer transition-colors">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 text-lg">Get in Touch</h4>
              <div className="space-y-3 text-gray-700">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <a href="mailto:pnsssanand@gmail.com" className="hover:text-blue-600 transition-colors">
                    pnsssanand@gmail.com
                  </a>
                </p>
                <div className="flex gap-3 pt-2">
                  <a href="#" className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors">
                    <span className="text-blue-600 font-semibold text-sm">Li</span>
                  </a>
                  <a href="#" className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors">
                    <span className="text-blue-600 font-semibold text-sm">Tw</span>
                  </a>
                  <a href="#" className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors">
                    <span className="text-blue-600 font-semibold text-sm">Gh</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-12 pt-8 text-center">
            <p className="text-gray-600">
              © 2025 Expense Tracker Pro. Designed and developed with ❤️ by{' '}
              <span className="text-gray-900 font-semibold">Mr. Anand Pinisetty</span>
            </p>
          </div>
        </div>
      </footer>

      <AddTransactionModal 
        isOpen={showAddTransaction} 
        onClose={() => setShowAddTransaction(false)} 
      />
    </div>
  );
};
