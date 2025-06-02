
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, Wallet, Target, Calendar } from 'lucide-react';
import { ExpenseChart } from './ExpenseChart';
import { QuickStats } from './QuickStats';
import { RecentTransactions } from './RecentTransactions';
import { AddExpenseModal } from './AddExpenseModal';

export const Dashboard = () => {
  const [showAddExpense, setShowAddExpense] = useState(false);

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">
              Welcome back, <span className="gradient-text">Anand</span>
            </h1>
            <p className="text-white/70 text-lg">
              Track your expenses with style and precision
            </p>
          </div>
          <Button 
            onClick={() => setShowAddExpense(true)}
            className="premium-button group"
          >
            <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Add Expense
          </Button>
        </div>

        {/* Quick Stats */}
        <QuickStats />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card floating-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle className="text-white font-display flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-expense-accent" />
                  Spending Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ExpenseChart />
              </CardContent>
            </Card>

            {/* Budget Progress */}
            <Card className="glass-card floating-card animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <CardHeader>
                <CardTitle className="text-white font-display flex items-center gap-2">
                  <Target className="w-6 h-6 text-expense-success" />
                  Budget Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: 'Food & Dining', spent: 450, budget: 600, color: 'bg-red-500' },
                    { category: 'Transportation', spent: 120, budget: 200, color: 'bg-blue-500' },
                    { category: 'Entertainment', spent: 80, budget: 150, color: 'bg-purple-500' },
                    { category: 'Shopping', spent: 230, budget: 300, color: 'bg-green-500' },
                  ].map((item, index) => (
                    <div key={item.category} className="space-y-2" style={{ animationDelay: `${0.1 * index}s` }}>
                      <div className="flex justify-between text-white/90">
                        <span className="font-medium">{item.category}</span>
                        <span>${item.spent} / ${item.budget}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${item.color} rounded-full transition-all duration-1000 ease-out`}
                          style={{ width: `${(item.spent / item.budget) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <div className="space-y-6">
            <RecentTransactions />
            
            {/* Quick Actions */}
            <Card className="glass-card floating-card animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <CardHeader>
                <CardTitle className="text-white font-display flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-expense-warning" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: Wallet, label: 'Add Income', color: 'text-green-400' },
                  { icon: TrendingDown, label: 'Add Expense', color: 'text-red-400' },
                  { icon: Target, label: 'Set Budget', color: 'text-blue-400' },
                ].map((action, index) => (
                  <Button
                    key={action.label}
                    variant="ghost"
                    className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300"
                    style={{ animationDelay: `${0.1 * index}s` }}
                  >
                    <action.icon className={`w-5 h-5 mr-3 ${action.color}`} />
                    {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <p className="text-white/60 text-sm">
            This website is designed and developed by <span className="text-white font-medium">Mr. Anand Pinisetty</span>
          </p>
        </div>
      </div>

      <AddExpenseModal 
        isOpen={showAddExpense} 
        onClose={() => setShowAddExpense(false)} 
      />
    </div>
  );
};
