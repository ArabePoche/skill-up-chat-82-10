/**
 * Génération des PDF de transfert élève pour la famille et l'école de destination.
 */
import jsPDF from 'jspdf';

export type TransferPdfAction = 'download' | 'print' | 'share';

export interface TransferPdfParty {
  name: string;
  city?: string | null;
  country?: string | null;
}

export interface TransferPdfStudent {
  firstName: string;
  lastName: string;
  studentCode?: string | null;
  className?: string | null;
  dateOfBirth?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
}

export interface TransferPdfOptions {
  audience: 'family' | 'destination-school';
  student: TransferPdfStudent;
  sourceSchool: TransferPdfParty;
  targetSchool: TransferPdfParty;
  comment?: string | null;
  transferDate?: string;
}

export interface GeneratedTransferPdf {
  audience: TransferPdfOptions['audience'];
  blob: Blob;
  fileName: string;
}

const formatDate = (date?: string | null) => {
  if (!date) {
    return 'Non renseignée';
  }

  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const sanitizeFileSegment = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

const writeLabelValue = (doc: jsPDF, label: string, value: string, x: number, y: number) => {
  doc.setFont('helvetica', 'bold');
  doc.text(label, x, y);
  doc.setFont('helvetica', 'normal');
  doc.text(value, x + 42, y);
};

const createTransferPdfDocument = ({
  audience,
  student,
  sourceSchool,
  targetSchool,
  comment,
  transferDate,
}: TransferPdfOptions): { doc: jsPDF; fileName: string } => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const issueDate = formatDate(transferDate ?? new Date().toISOString());
  const title =
    audience === 'family'
      ? 'Fiche de transfert eleve'
      : 'Dossier de transfert a destination de l\'ecole d\'accueil';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, 20, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date d'emission : ${issueDate}`, 20, 30);

  doc.setDrawColor(220, 224, 230);
  doc.line(20, 34, 190, 34);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Informations de l\'eleve', 20, 44);

  doc.setFontSize(10);
  writeLabelValue(doc, 'Nom complet :', `${student.firstName} ${student.lastName}`, 20, 52);
  writeLabelValue(doc, 'Matricule :', student.studentCode || 'Non renseigne', 20, 59);
  writeLabelValue(doc, 'Classe actuelle :', student.className || 'Non renseignee', 20, 66);
  writeLabelValue(doc, 'Date de naissance :', formatDate(student.dateOfBirth), 20, 73);
  writeLabelValue(doc, 'Parent / tuteur :', student.parentName || 'Non renseigne', 20, 80);
  writeLabelValue(doc, 'Telephone :', student.parentPhone || 'Non renseigne', 20, 87);
  writeLabelValue(doc, 'Email :', student.parentEmail || 'Non renseigne', 20, 94);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Transfert', 20, 108);

  doc.setFontSize(10);
  writeLabelValue(doc, 'Ecole source :', sourceSchool.name, 20, 116);
  writeLabelValue(doc, 'Localisation source :', [sourceSchool.city, sourceSchool.country].filter(Boolean).join(', ') || 'Non renseignee', 20, 123);
  writeLabelValue(doc, 'Ecole destination :', targetSchool.name, 20, 130);
  writeLabelValue(doc, 'Localisation destination :', [targetSchool.city, targetSchool.country].filter(Boolean).join(', ') || 'Non renseignee', 20, 137);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Observations', 20, 151);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const commentLines = doc.splitTextToSize(comment?.trim() || 'Aucun commentaire complementaire.', 170);
  doc.text(commentLines, 20, 159);

  const footerY = Math.max(215, 159 + commentLines.length * 5 + 12);
  doc.line(20, footerY, 85, footerY);
  doc.line(125, footerY, 190, footerY);
  doc.text('Signature ecole source', 20, footerY + 8);
  doc.text(
    audience === 'family' ? 'Signature parent / tuteur' : 'Signature ecole destination',
    125,
    footerY + 8
  );

  const filePrefix = audience === 'family' ? 'transfert-eleve' : 'transfert-ecole-destination';
  const studentFileName = sanitizeFileSegment(`${student.firstName}_${student.lastName}`) || 'eleve';
  const fileName = `${filePrefix}-${studentFileName}.pdf`;

  return { doc, fileName };
};

export const generateTransferPdf = async (options: TransferPdfOptions): Promise<GeneratedTransferPdf> => {
  const { doc, fileName } = createTransferPdfDocument(options);

  return {
    audience: options.audience,
    blob: doc.output('blob'),
    fileName,
  };
};

export const downloadTransferPdf = async (options: TransferPdfOptions): Promise<void> => {
  const { doc, fileName } = createTransferPdfDocument(options);
  doc.save(fileName);
};

export const printTransferPdf = async (options: TransferPdfOptions): Promise<void> => {
  const { doc } = createTransferPdfDocument(options);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank', 'noopener,noreferrer');
};

export const shareTransferPdfs = async (documents: GeneratedTransferPdf[]): Promise<boolean> => {
  if (!navigator.share || documents.length === 0) {
    return false;
  }

  const files = documents.map(
    (document) => new File([document.blob], document.fileName, { type: 'application/pdf' })
  );

  if (navigator.canShare && !navigator.canShare({ files })) {
    return false;
  }

  await navigator.share({
    title: 'Documents de transfert',
    text: 'Documents de transfert de l\'eleve',
    files,
  });

  return true;
};