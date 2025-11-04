
import React from 'react';
import { Wallet, TrendingUp, Clock, Euro } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeacherWallet, useTeacherTransactions } from '@/hooks/useTeacherWallet';

interface TeacherWalletProps {
  teacherId: string;
}

const TeacherWallet: React.FC<TeacherWalletProps> = ({ teacherId }) => {
  const { data: wallet, isLoading: walletLoading } = useTeacherWallet(teacherId);
  const { data: transactions, isLoading: transactionsLoading } = useTeacherTransactions(teacherId);

  if (walletLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet size={20} />
            Portefeuille Enseignant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet size={20} />
            Portefeuille Enseignant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Aucun portefeuille trouvé</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet size={20} />
            Portefeuille Enseignant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                <Euro size={20} />
                <span className="font-semibold">Solde Actuel</span>
              </div>
              <p className="text-2xl font-bold text-green-700">
                {wallet.balance?.toFixed(2) || '0.00'}€
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                <TrendingUp size={20} />
                <span className="font-semibold">Total Gagné</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {wallet.total_earned?.toFixed(2) || '0.00'}€
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions récentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} />
            Transactions Récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <p className="text-gray-500">Chargement des transactions...</p>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {transaction.transaction_type === 'interview_payment' && '💬 Entretien'}
                      {transaction.transaction_type === 'exercise_validation' && '✅ Exercice validé'}
                      {transaction.transaction_type === 'withdrawal' && '💳 Retrait'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.amount >= 0 ? '+' : ''}{transaction.amount}€
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Aucune transaction trouvée</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherWallet;
