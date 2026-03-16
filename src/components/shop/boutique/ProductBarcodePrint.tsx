/**
 * Composant pour imprimer le code-barres d'un produit
 * Génère une page d'impression avec le code-barres, le nom et le prix du produit
 */

import React, { useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import JsBarcode from 'jsbarcode';

interface ProductBarcodePrintProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    name: string;
    barcode?: string | null;
    price: number;
  };
  /** Nombre d'étiquettes à imprimer */
  copies?: number;
}

const ProductBarcodePrint: React.FC<ProductBarcodePrintProps> = ({
  isOpen,
  onClose,
  product,
  copies = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(price);

  // Générer le code-barres sur le canvas quand le dialog s'ouvre
  React.useEffect(() => {
    if (isOpen && product.barcode) {
      // Use a timeout to ensure canvas is mounted in the DOM (Dialog portal)
      const timer = setTimeout(() => {
        if (canvasRef.current) {
          try {
            JsBarcode(canvasRef.current, product.barcode!, {
              format: 'CODE128',
              width: 2,
              height: 60,
              displayValue: true,
              fontSize: 14,
              margin: 10,
              background: '#ffffff',
              lineColor: '#000000',
            });
          } catch (e) {
            console.error('Erreur génération code-barres:', e);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, product.barcode]);

  const handlePrint = () => {
    if (!canvasRef.current) return;

    const barcodeDataUrl = canvasRef.current.toDataURL('image/png');
    
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const labelsHtml = Array.from({ length: copies }, () => `
      <div style="
        display: inline-block;
        width: 58mm;
        padding: 4mm;
        margin: 2mm;
        border: 1px dashed #ccc;
        text-align: center;
        page-break-inside: avoid;
        font-family: Arial, sans-serif;
      ">
        <p style="margin: 0 0 2mm; font-size: 10pt; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${product.name}
        </p>
        <img src="${barcodeDataUrl}" style="max-width: 100%; height: auto;" />
        <p style="margin: 2mm 0 0; font-size: 12pt; font-weight: bold;">
          ${formatPrice(product.price)}
        </p>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Code-barres - ${product.name}</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 5mm; }
            }
            body {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              align-items: flex-start;
            }
          </style>
        </head>
        <body>${labelsHtml}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
    onClose();
  };

  if (!product.barcode) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Imprimer le code-barres</DialogTitle>
            <DialogDescription>
              Ce produit n'a pas de code-barres enregistré. Ajoutez-en un en modifiant le produit.
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" onClick={onClose} className="w-full mt-2">
            Fermer
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Imprimer le code-barres</DialogTitle>
          <DialogDescription>
            Aperçu de l'étiquette pour {product.name}
          </DialogDescription>
        </DialogHeader>

        {/* Aperçu */}
        <div className="flex flex-col items-center bg-muted rounded-lg p-4 gap-2">
          <p className="text-sm font-semibold text-foreground truncate max-w-full">
            {product.name}
          </p>
          <canvas ref={canvasRef} className="max-w-full" />
          <p className="text-base font-bold text-foreground">
            {formatPrice(product.price)}
          </p>
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handlePrint} className="flex-1 gap-2">
            <Printer size={16} />
            Imprimer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductBarcodePrint;
