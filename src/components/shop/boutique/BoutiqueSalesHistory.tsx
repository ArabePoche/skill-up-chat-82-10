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
    AlertCircle,
    ScanBarcode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

interface BoutiqueSalesHistoryProps {
    shopId: string;
}

const BoutiqueSalesHistory: React.FC<BoutiqueSalesHistoryProps> = ({ shopId }) => {
    const { data: sales, isLoading, refetch } = useBoutiqueSalesHistory(shopId);
    const cancelSale = useCancelBoutiqueSale();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [saleToReturn, setSaleToReturn] = React.useState<any>(null);
    const [returnQuantity, setReturnQuantity] = React.useState(1);
    const [isScanning, setIsScanning] = React.useState(false);

    // Utiliser le scanner de code-barres pour scanner les tickets
    useBarcodeScanner((barcode) => {
        if (isScanning) {
            setSearchTerm(barcode);
            setIsScanning(false);
        }
    }, isScanning);

    const filteredSales = sales?.filter(sale => {
        const search = searchTerm.trim().toLowerCase();
        if (!search) return true;

        const productName = sale.product?.name?.toLowerCase() || '';
        const customerName = sale.customer_name?.toLowerCase() || '';
        const receiptId = String(sale.receipt_id || '').toLowerCase();
        
        let dateMatched = false;
        try {
            if (sale.sold_at) {
                const saleDate1 = format(new Date(sale.sold_at), 'dd/MM/yyyy HH:mm').toLowerCase();
                const saleDate2 = format(new Date(sale.sold_at), 'dd/MM/yyyy').toLowerCase();
                dateMatched = saleDate1.includes(search) || saleDate2.includes(search);
            }
        } catch(e) {}

        return productName.includes(search) || 
               customerName.includes(search) || 
               receiptId.includes(search) ||
               dateMatched;
    });

    const handleConfirmReturn = async () => {
        if (!saleToReturn) return;
        
        await cancelSale.mutateAsync({
            id: saleToReturn.id,
            shop_id: shopId,
            product_id: saleToReturn.product_id,
            quantityToReturn: returnQuantity,
            originalQuantity: saleToReturn.quantity,
            originalTotalAmount: saleToReturn.total_amount
        });
        
        setSaleToReturn(null);
        setReturnQuantity(1);
    };

    const handleOpenReturnDialog = (sale: any) => {
        setSaleToReturn(sale);
        setReturnQuantity(sale.quantity); // Default to full cancellation
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
                <div className="flex gap-2 w-full sm:max-w-xs">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Rechercher un produit ou client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-white border-slate-200 focus:ring-blue-500"
                        />
                    </div>
                    <Button
                        onClick={() => setIsScanning(!isScanning)}
                        variant={isScanning ? "default" : "outline"}
                        className={isScanning ? "bg-blue-600 hover:bg-blue-700" : ""}
                        title={isScanning ? "Arrêter le scan" : "Scanner le code-barres du ticket"}
                    >
                        <ScanBarcode className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <History className="w-4 h-4" />
                    <span className="font-medium">{filteredSales?.length || 0} ventes affichées</span>
                </div>
            </div>
            
            {isScanning && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <ScanBarcode className="w-4 h-4 animate-pulse" />
                    Scannez le code-barres du ticket...
                </div>
            )}

            <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                    {(!filteredSales || filteredSales.length === 0) ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Aucune vente trouvée</p>
                        </div>
                    ) : (
                        filteredSales.map((sale) => (
                            <Card 
                                key={sale.id} 
                                onClick={() => sale.status !== 'canceled' && handleOpenReturnDialog(sale)}
                                className={`group overflow-hidden border-slate-200 transition-all hover:shadow-md ${sale.status === 'canceled' ? 'opacity-60 grayscale' : 'cursor-pointer hover:border-red-300'}`}
                            >
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
                                            {sale.receipt_id && (
                                                <Badge variant="outline" className="text-slate-500 mb-1">
                                                    {sale.receipt_id}
                                                </Badge>
                                            )}
                                            {sale.status === 'canceled' ? (
                                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                                    Annulée
                                                </Badge>
                                            ) : (
                                                <div className="h-8 w-8 text-slate-400 group-hover:text-red-500 group-hover:bg-red-50 rounded-full flex items-center justify-center transition-colors">
                                                    <XCircle className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>

            <Dialog open={!!saleToReturn} onOpenChange={(open) => !open && setSaleToReturn(null)}>
                <DialogContent className="max-w-sm rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="w-5 h-5" />
                            {returnQuantity === saleToReturn?.quantity ? 'Annuler la vente ?' : 'Retour partiel ?'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 space-y-3">
                            <p>Vous êtes sur le point de retourner une quantité de <strong>{saleToReturn?.product?.name}</strong>.</p>
                            <div className="bg-slate-50 p-3 rounded-xl space-y-2">
                                <div>
                                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Quantité vendue</Label>
                                    <div className="font-bold text-slate-700">{saleToReturn?.quantity} unité(s)</div>
                                </div>
                                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                                    <Label htmlFor="returnQuantity" className="font-medium text-slate-700">
                                        Quantité à retourner
                                    </Label>
                                    <Input 
                                        id="returnQuantity"
                                        type="number"
                                        min={1}
                                        max={saleToReturn?.quantity || 1}
                                        value={returnQuantity}
                                        onChange={(e) => setReturnQuantity(Math.max(1, Math.min(saleToReturn?.quantity || 1, parseInt(e.target.value) || 1)))}
                                        className="text-lg font-bold"
                                    />
                                    <p className="text-xs text-slate-500 leading-tight">
                                        Pensez à retourner la valeur équivalente au client ({(saleToReturn ? (saleToReturn.total_amount / saleToReturn.quantity) * returnQuantity : 0).toLocaleString()} FCFA).
                                    </p>
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-2">
                        <Button 
                            variant="outline" 
                            onClick={() => setSaleToReturn(null)}
                            className="rounded-2xl border-slate-200 hover:bg-slate-50 font-bold"
                        >
                            Conserver
                        </Button>
                        <Button
                            onClick={handleConfirmReturn}
                            disabled={cancelSale.isPending}
                            className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold"
                        >
                            {cancelSale.isPending ? 'Traitement...' : 'Confirmer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BoutiqueSalesHistory;
