import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useShopActivityLogs } from '@/hooks/shop/useShopActivityLogs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RefreshCcw, Search, Activity, ShoppingCart, XCircle, ArrowRightLeft, User, Box } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  shopId?: string;
}

export const ShopActivityJournal: React.FC<Props> = ({ shopId }) => {
  const { data: logs, isLoading } = useShopActivityLogs(shopId);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs?.filter((log) => {
    const term = searchTerm.toLowerCase();
    const action = log.action_type.toLowerCase();
    const details = log.details.toLowerCase();
    const agentName = `${log.agent?.first_name || ''} ${log.agent?.last_name || ''}`.toLowerCase();
    const dateFormatted = format(new Date(log.created_at), 'dd/MM/yyyy HH:mm').toLowerCase();

    return action.includes(term) || details.includes(term) || agentName.includes(term) || dateFormatted.includes(term);
  });

  const getActionConfig = (type: string) => {
    switch (type) {
      case 'SALE':
        return { icon: <ShoppingCart size={14} />, color: 'bg-emerald-100 text-emerald-700', label: 'Vente' };
      case 'CANCEL_SALE':
        return { icon: <XCircle size={14} />, color: 'bg-red-100 text-red-700', label: 'Annulation Vente' };
      case 'TRANSFER':
        return { icon: <ArrowRightLeft size={14} />, color: 'bg-blue-100 text-blue-700', label: 'Transfert Stock' };
      case 'PRODUCT':
        return { icon: <Box size={14} />, color: 'bg-purple-100 text-purple-700', label: 'Produit' };
      case 'AUTH':
        return { icon: <User size={14} />, color: 'bg-orange-100 text-orange-700', label: 'Connexion' };
      default:
        return { icon: <Activity size={14} />, color: 'bg-slate-100 text-slate-700', label: 'Activité' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <RefreshCcw className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-500 text-sm font-medium">Chargement du journal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-blue-500" />
            Journal des activités
          </h2>
          <p className="text-sm text-slate-500">Historique complet des actions effectuées dans la boutique.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Chercher (ex: Vente, Annulation...)"
            className="pl-9 mr-2"
          />
        </div>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        {(!filteredLogs || filteredLogs.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
            <Activity className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Aucune activité enregistrée.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pb-4">
            {filteredLogs.map((log) => {
              const config = getActionConfig(log.action_type);
              
              return (
                <div key={log.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className={`absolute -left-[13px] top-1.5 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center ${config.color}`}>
                    {config.icon}
                  </div>
                  
                  <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={`${config.color} border-transparent font-semibold uppercase text-[10px]`}>
                              {config.label}
                            </Badge>
                            {log.agent && (
                              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                <User size={12} />
                                {log.agent.first_name} {log.agent.last_name}
                              </span>
                            )}
                          </div>
                          <p className="text-base text-slate-800 leading-snug font-medium">
                            {log.details}
                          </p>
                        </div>
                        
                        <div className="text-xs font-medium text-slate-500 whitespace-nowrap bg-slate-100 px-3 py-1 rounded-full">
                          {format(new Date(log.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};