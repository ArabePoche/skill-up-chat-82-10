import React from 'react';
import { useBoutiqueSalesHistory, useCancelBoutiqueSale } from '@/hooks/shop/useBoutiqueSales';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    History,
    XCircle,
    RefreshCcw,
    Search,
    Calendar,
    User,
    CreditCard,
    Banknote,
    Package,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

interface BoutiqueSalesHistoryProps {
    shopId: string;
}

const BoutiqueSalesHistory: React.FC<BoutiqueSalesHistoryProps> = ({ shopId }) => {
    const { data: sales, isLoading, refetch } = useBoutiqueSalesHistory(shopId);
    const cancelSale = useCancelBoutiqueSale();
    const [searchTerm, setSearchTerm] = React.useState('');

    const filteredSales = sales?.filter(sale => {
        const productName = sale.product?.name?.toLowerCase() || '';
        const customerName = sale.customer_name?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return productName.includes(search) || customerName.includes(search);
    });

    const handleCancel = async (sale: any) => {
        await cancelSale.mutateAsync({
            id: sale.id,
            shop_id: shopId,
            product_id: sale.product_id,
            quantity: sale.quantity
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
                <RefreshCcw className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-slate-500 font-medium">Chargement de l'historique...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Rechercher un produit ou client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-white border-slate-200 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <History className="w-4 h-4" />
                    <span className="font-medium">{filteredSales?.length || 0} ventes affichées</span>
                </div>
            </div>

            <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                    {(!filteredSales || filteredSales.length === 0) ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Aucune vente trouvée</p>
                        </div>
                    ) : (
                        filteredSales.map((sale) => (
                            <Card key={sale.id} className={`overflow-hidden border-slate-200 transition-all hover:shadow-md ${sale.status === 'canceled' ? 'opacity-60 grayscale' : ''}`}>
                                <CardContent className="p-0">
                                    <div className="flex items-center p-4 gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200">
                                            {sale.product?.image_url ? (
                                                <img src={sale.product.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-6 h-6 text-slate-400" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <h4 className="font-bold text-slate-900 truncate">
                                                    {sale.product?.name || 'Produit inconnu'}
                                                </h4>
                                                <span className="font-black text-blue-600 whitespace-nowrap">
                                                    {sale.total_amount.toLocaleString()} FCFA
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {format(new Date(sale.sold_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                                                </div>

                                                {sale.customer_name && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <User className="w-3.5 h-3.5" />
                                                        {sale.customer_name}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    {(sale.payment_method?.startsWith('{') || sale.payment_method === 'split') ? (
                                                        <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-purple-500" /> Mixte</span>
                                                    ) : sale.payment_method === 'cash' ? (
                                                        <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                                                    ) : (
                                                        <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                                                    )}
                                                    <span>•</span>
                                                    {sale.quantity} unité(s)
                                                </div>

                                                {sale.agent && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-blue-600 bg-blue-50 border-blue-100 italic">
                                                            Par {sale.agent.first_name}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            {sale.status === 'canceled' ? (
                                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                                    Annulée
                                                </Badge>
                                            ) : (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full">
                                                            <XCircle className="w-5 h-5" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="rounded-3xl border-slate-200">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                                                <AlertCircle className="w-5 h-5" />
                                                                Annuler cette vente ?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-600">
                                                                Cette action marquera la vente comme annulée et restaurera <strong>{sale.quantity} unité(s)</strong> de {sale.product?.name} au stock de la boutique.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="gap-2 sm:gap-0">
                                                            <AlertDialogCancel className="rounded-2xl border-slate-200 hover:bg-slate-50 font-bold">Conserver</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleCancel(sale)}
                                                                className="rounded-2xl bg-red-600 hover:bg-red-700 font-bold"
                                                            >
                                                                Confirmer l'annulation
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default BoutiqueSalesHistory;
