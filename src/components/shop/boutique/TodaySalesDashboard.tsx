/**
 * Tableau de bord des ventes du jour - Boutique physique
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Banknote,
  Package,
  Clock,
  Receipt,
} from 'lucide-react';
import { useTodaySalesStats } from '@/hooks/shop/useTodaySalesStats';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TodaySalesDashboardProps {
  shopId: string;
}

const TodaySalesDashboard: React.FC<TodaySalesDashboardProps> = ({ shopId }) => {
  const { data: stats, isLoading, error } = useTodaySalesStats(shopId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Erreur lors du chargement des statistiques
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const paymentMethodLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    cash: { label: 'Espèces', icon: <Banknote size={16} />, color: 'bg-emerald-500' },
    card: { label: 'Carte', icon: <CreditCard size={16} />, color: 'bg-blue-500' },
    mobile: { label: 'Mobile', icon: <CreditCard size={16} />, color: 'bg-purple-500' },
    transfer: { label: 'Virement', icon: <CreditCard size={16} />, color: 'bg-orange-500' },
  };

  const maxHourRevenue = Math.max(...stats.salesByHour.map(h => h.revenue), 1);

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Ventes du jour</h2>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <p className="text-xs text-muted-foreground">Chiffre d'affaires</p>
        </div>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-200/50">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
              <Receipt size={20} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">{stats.totalSales}</div>
            <p className="text-xs text-emerald-600/80">Ventes</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
              <Package size={20} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700">{stats.totalItems}</div>
            <p className="text-xs text-blue-600/80">Articles</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
              <TrendingUp size={20} className="text-purple-600" />
            </div>
            <div className="text-xl font-bold text-purple-700">
              {formatCurrency(stats.averageTicket)}
            </div>
            <p className="text-xs text-purple-600/80">Panier moyen</p>
          </CardContent>
        </Card>
      </div>

      {/* Ventes par heure */}
      {stats.salesByHour.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              Activité par heure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.salesByHour.map((hourData) => (
                <div key={hourData.hour} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-12">
                    {hourData.hour.toString().padStart(2, '0')}h
                  </span>
                  <div className="flex-1">
                    <Progress
                      value={(hourData.revenue / maxHourRevenue) * 100}
                      className="h-6"
                      indicatorClassName="bg-gradient-to-r from-primary/80 to-primary"
                    />
                  </div>
                  <span className="text-xs font-medium w-20 text-right">
                    {formatCurrency(hourData.revenue)}
                  </span>
                  <span className="text-xs text-muted-foreground w-8">
                    ({hourData.count})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top produits */}
      {stats.topProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingBag size={16} className="text-muted-foreground" />
              Top produits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topProducts.map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.quantity} vendu{product.quantity > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Méthodes de paiement */}
      {stats.paymentMethods.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign size={16} className="text-muted-foreground" />
              Répartition des paiements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {stats.paymentMethods.map((pm) => {
                const method = paymentMethodLabels[pm.method] || {
                  label: pm.method,
                  icon: <CreditCard size={16} />,
                  color: 'bg-gray-500',
                };
                const percentage = stats.totalRevenue > 0
                  ? Math.round((pm.total / stats.totalRevenue) * 100)
                  : 0;

                return (
                  <div
                    key={pm.method}
                    className="p-3 rounded-xl border bg-card flex items-center gap-3"
                  >
                    <div className={`w-8 h-8 rounded-full ${method.color} flex items-center justify-center text-white`}>
                      {method.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{method.label}</p>
                      <p className="text-sm font-semibold">{formatCurrency(pm.total)}</p>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {percentage}%
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message si aucune vente */}
      {stats.totalSales === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ShoppingBag size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Aucune vente aujourd'hui</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les ventes apparaîtront ici au fur et à mesure
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TodaySalesDashboard;
