import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';

export const QuickStats = () => {
  const stats = [
    {
      title: 'Total Balance',
      amount: '$12,450',
      change: '+8.2%',
      icon: Wallet,
      color: 'from-blue-500 to-cyan-400',
      isPositive: true,
    },
    {
      title: 'Monthly Income',
      amount: '$8,200',
      change: '+12.5%',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-400',
      isPositive: true,
    },
    {
      title: 'Monthly Expenses',
      amount: '$3,840',
      change: '-2.1%',
      icon: TrendingDown,
      color: 'from-red-500 to-pink-400',
      isPositive: false,
    },
    {
      title: 'Savings Goal',
      amount: '$5,000',
      change: '84% complete',
      icon: PiggyBank,
      color: 'from-purple-500 to-violet-400',
      isPositive: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card 
          key={stat.title} 
          className="glass-card floating-card animate-fade-in-up group cursor-pointer"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className={`text-sm font-medium ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900 group-hover:scale-105 transition-transform duration-300">
                {stat.amount}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
