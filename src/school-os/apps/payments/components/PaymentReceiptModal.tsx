// Modal pour afficher et partager un reçu de paiement
import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Printer, Mail, MessageCircle, Download, X } from 'lucide-react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  received_by_profile?: {
    first_name?: string;
    last_name?: string;
  };
}

interface PaymentReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment;
  studentName: string;
  studentCode?: string;
  className?: string;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  open,
  onOpenChange,
  payment,
  studentName,
  studentCode,
  className,
}) => {
  const { school } = useSchoolYear();
  const receiptRef = useRef<HTMLDivElement>(null);

  const receiptNumber = `REC-${payment.id.slice(0, 8).toUpperCase()}`;
  const paymentDate = new Date(payment.payment_date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getPaymentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      monthly: 'Paiement mensuel',
      quarterly: 'Paiement trimestriel',
      annual: 'Paiement annuel',
      registration: "Frais d'inscription",
      other: 'Autre paiement',
    };
    return types[type] || type;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Espèces',
      check: 'Chèque',
      bank_transfer: 'Virement bancaire',
      mobile_money: 'Mobile Money',
      card: 'Carte bancaire',
    };
    return methods[method] || method;
  };

  const generateReceiptText = () => {
    return `
REÇU DE PAIEMENT
${school?.name || 'École'}

N° Reçu: ${receiptNumber}
Date: ${paymentDate}

Élève: ${studentName}
${studentCode ? `Matricule: ${studentCode}` : ''}
${className ? `Classe: ${className}` : ''}

Type: ${getPaymentTypeLabel(payment.payment_type)}
Mode: ${getPaymentMethodLabel(payment.payment_method)}
${payment.reference_number ? `Référence: ${payment.reference_number}` : ''}

MONTANT: ${payment.amount.toLocaleString('fr-FR')} FCFA

${payment.received_by_profile ? `Reçu par: ${payment.received_by_profile.first_name || ''} ${payment.received_by_profile.last_name || ''}` : ''}
${payment.notes ? `Notes: ${payment.notes}` : ''}

---
Ce reçu constitue une preuve de paiement.
    `.trim();
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Impossible d\'ouvrir la fenêtre d\'impression');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reçu - ${receiptNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .school-name { font-size: 18px; font-weight: bold; }
            .receipt-number { font-size: 12px; color: #666; }
            .section { margin: 15px 0; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .label { color: #666; }
            .amount { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; }
            .separator { border-top: 1px dashed #ccc; margin: 15px 0; }
            .footer { font-size: 10px; color: #666; text-align: center; margin-top: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 150], // Format ticket
    });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(school?.name || 'École', 40, 10, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    doc.setFontSize(10);
    doc.text(`Reçu N°: ${receiptNumber}`, 40, 20, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`Date: ${paymentDate}`, 40, 25, { align: 'center' });

    doc.line(5, 30, 75, 30);

    let y = 37;
    doc.setFontSize(9);
    doc.text(`Élève: ${studentName}`, 5, y);
    y += 5;
    if (studentCode) {
      doc.text(`Matricule: ${studentCode}`, 5, y);
      y += 5;
    }
    if (className) {
      doc.text(`Classe: ${className}`, 5, y);
      y += 5;
    }

    y += 3;
    doc.line(5, y, 75, y);
    y += 7;

    doc.text(`Type: ${getPaymentTypeLabel(payment.payment_type)}`, 5, y);
    y += 5;
    doc.text(`Mode: ${getPaymentMethodLabel(payment.payment_method)}`, 5, y);
    y += 5;
    if (payment.reference_number) {
      doc.text(`Réf: ${payment.reference_number}`, 5, y);
      y += 5;
    }

    y += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${payment.amount.toLocaleString('fr-FR')} FCFA`, 40, y, { align: 'center' });

    y += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (payment.received_by_profile) {
      const receiverName = `${payment.received_by_profile.first_name || ''} ${payment.received_by_profile.last_name || ''}`.trim();
      doc.text(`Reçu par: ${receiverName}`, 5, y);
      y += 5;
    }

    y += 5;
    doc.line(5, y, 75, y);
    y += 5;
    doc.setFontSize(7);
    doc.text('Ce reçu constitue une preuve de paiement.', 40, y, { align: 'center' });

    doc.save(`recu-${receiptNumber}.pdf`);
    toast.success('Reçu téléchargé');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateReceiptText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Reçu de paiement - ${receiptNumber}`);
    const body = encodeURIComponent(generateReceiptText());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Reçu de paiement</span>
          </DialogTitle>
        </DialogHeader>

        {/* Receipt Preview */}
        <div 
          ref={receiptRef}
          className="bg-white text-black p-4 rounded-lg border shadow-inner"
        >
          <div className="header text-center mb-4">
            <p className="school-name text-lg font-bold">{school?.name || 'École'}</p>
          </div>

          <Separator className="my-3" />

          <div className="text-center mb-3">
            <p className="receipt-number text-xs text-gray-500">Reçu N° {receiptNumber}</p>
            <p className="text-sm">{paymentDate}</p>
          </div>

          <Separator className="my-3" />

          <div className="section space-y-1">
            <div className="row flex justify-between text-sm">
              <span className="label text-gray-600">Élève:</span>
              <span className="font-medium">{studentName}</span>
            </div>
            {studentCode && (
              <div className="row flex justify-between text-sm">
                <span className="label text-gray-600">Matricule:</span>
                <span>{studentCode}</span>
              </div>
            )}
            {className && (
              <div className="row flex justify-between text-sm">
                <span className="label text-gray-600">Classe:</span>
                <span>{className}</span>
              </div>
            )}
          </div>

          <Separator className="my-3" />

          <div className="section space-y-1">
            <div className="row flex justify-between text-sm">
              <span className="label text-gray-600">Type:</span>
              <span>{getPaymentTypeLabel(payment.payment_type)}</span>
            </div>
            <div className="row flex justify-between text-sm">
              <span className="label text-gray-600">Mode:</span>
              <span>{getPaymentMethodLabel(payment.payment_method)}</span>
            </div>
            {payment.reference_number && (
              <div className="row flex justify-between text-sm">
                <span className="label text-gray-600">Référence:</span>
                <span>{payment.reference_number}</span>
              </div>
            )}
          </div>

          <div className="amount text-center my-4">
            <p className="text-2xl font-bold text-green-700">
              {payment.amount.toLocaleString('fr-FR')} FCFA
            </p>
          </div>

          {payment.received_by_profile && (
            <div className="text-xs text-gray-600 text-center">
              Reçu par: {payment.received_by_profile.first_name || ''} {payment.received_by_profile.last_name || ''}
            </div>
          )}

          {payment.notes && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <span className="text-gray-600">Notes:</span> {payment.notes}
            </div>
          )}

          <Separator className="my-3" />

          <p className="footer text-[10px] text-gray-500 text-center">
            Ce reçu constitue une preuve de paiement officielle.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Imprimer
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Télécharger
          </Button>
          <Button onClick={handleShareWhatsApp} variant="outline" className="flex items-center gap-2 text-green-600 hover:text-green-700">
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </Button>
          <Button onClick={handleShareEmail} variant="outline" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
