import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ArrowUpRight, ArrowDownRight, PlusCircle } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export const RecentTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    setIsLoading(true);
    const q = query(
      collection(db, 'users', userId, 'transactions'), 
      orderBy('date', 'desc'),
      limit(5)
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const transactionsData: any[] = [];
      querySnapshot.forEach((doc) => {
        transactionsData.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      setTransactions(transactionsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Card className="glass-card floating-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
      <CardHeader>
        <CardTitle className="text-gray-900 font-display flex items-center gap-2">
          <Clock className="w-6 h-6 text-expense-accent" />
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <PlusCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-900 font-medium">No transactions yet</p>
            <p className="text-gray-600 text-sm mt-1">
              Add your first transaction to see it here
            </p>
          </div>
        ) : (
          transactions.map((transaction, index) => (
            <div 
              key={transaction.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-white/40 hover:bg-white/60 transition-all duration-300 group cursor-pointer"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  transaction.type === 'income' 
                    ? 'bg-green-500/20 text-green-600' 
                    : 'bg-red-500/20 text-red-600'
                }`}>
                  {transaction.type === 'income' ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-gray-900">
                    {transaction.purpose}
                  </p>
                  <p className="text-sm text-gray-600">
                    {transaction.category} • {new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}₹{parseFloat(transaction.amount).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(transaction.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
