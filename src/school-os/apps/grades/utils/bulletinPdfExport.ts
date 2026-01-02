/**
 * Utilitaire pour exporter les bulletins en PDF avec support RTL/Arabe
 * 
 * Fonctionnalités:
 * - Export de tous les bulletins d'une classe
 * - Export individuel d'un bulletin élève
 * - Support complet de l'arabe avec la police Amiri
 * - Inclusion des notes de classe dans le PDF
 */
import { jsPDF } from 'jspdf';
import { BulletinTemplate } from '../hooks/useBulletins';

// Interface pour les données du bulletin
export interface BulletinPdfData {
  studentId: string;
  studentName: string;
  studentCode: string;
  photoUrl?: string;
  grades: {
    subjectId: string;
    subjectName: string;
    score: number | null;
    maxScore: number;
    coefficient: number;
    isAbsent?: boolean;
    classGradeScore?: number | null;
  }[];
  average: number | null;
  totalPoints: number;
  totalMaxPoints: number;
  rank: number;
  totalStudents: number;
  classAverage: number;
  firstAverage: number;
  appreciation?: string;
  mention?: string;
  hasClassGrades?: boolean;
}

export interface BulletinPdfOptions {
  className: string;
  evaluationTitle: string;
  schoolName?: string;
  schoolYearName?: string;
  schoolAddress?: string;
  schoolCity?: string;
  schoolCountry?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolLogoUrl?: string;
  template?: BulletinTemplate | null;
  bulletins: BulletinPdfData[];
}

// Helper function to detect if text contains Arabic characters
const containsArabic = (text: string): boolean => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
};

// Get appreciation based on score - normalized to percentage
const getSubjectAppreciation = (score: number | null, maxScore: number, isAbsent: boolean): string => {
  if (isAbsent) return 'Absent';
  if (score === null) return '-';
  // Normaliser le score en pourcentage pour l'appréciation
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 80) return 'Très bien';
  if (percentage >= 70) return 'Bien';
  if (percentage >= 60) return 'Assez bien';
  if (percentage >= 50) return 'Passable';
  if (percentage >= 40) return 'Insuffisant';
  return 'Très insuffisant';
};

// Convert hex color to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

/**
 * Convertit un ArrayBuffer en base64 de façon performante (évite les erreurs sur gros fichiers)
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x2000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    let chunkStr = '';
    const end = Math.min(i + chunkSize, bytes.length);
    for (let j = i; j < end; j++) {
      chunkStr += String.fromCharCode(bytes[j]);
    }
    binary += chunkStr;
  }

  return btoa(binary);
};

// Load Arabic font (Noto Sans Arabic) as base64
const loadArabicFont = async (): Promise<{ base64: string; fontName: string } | null> => {
  // Try multiple font options in order of preference
  const fontOptions = [
    { path: '/fonts/Amiri-Regular.ttf', name: 'Amiri' },
    { path: '/fonts/NotoSansArabic-Regular.ttf', name: 'NotoSansArabic' },
  ];

  for (const font of fontOptions) {
    try {
      const response = await fetch(font.path);
      if (!response.ok) continue;

      const arrayBuffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      return { base64, fontName: font.name };
    } catch (error) {
      console.warn(`Failed to load font ${font.name}:`, error);
      continue;
    }
  }

  console.warn('No Arabic font available, falling back to default');
  return null;
};

/**
 * Génère un PDF de bulletins et retourne le document et blob
 */
const generateBulletinPdfCore = async ({
  className,
  evaluationTitle,
  schoolName,
  schoolYearName,
  schoolAddress,
  schoolCity,
  schoolCountry,
  schoolPhone,
  schoolEmail,
  template,
  bulletins,
}: BulletinPdfOptions): Promise<{ doc: jsPDF; blob: Blob }> => {
  if (bulletins.length === 0) {
    throw new Error('Aucun bulletin à exporter');
  }

  const doc = new jsPDF();
  
  // Check if any bulletin has Arabic content
  const hasArabicContent = bulletins.some(b => 
    containsArabic(b.studentName) || 
    b.grades.some(g => containsArabic(g.subjectName))
  );

  // Load and register Arabic font if needed
  let arabicFontLoaded = false;
  let arabicFontName = 'Amiri';
  if (hasArabicContent) {
    const fontData = await loadArabicFont();
    if (fontData) {
      try {
        const fileName = `${fontData.fontName}-Regular.ttf`;
        doc.addFileToVFS(fileName, fontData.base64);
        doc.addFont(fileName, fontData.fontName, 'normal');

        // Validation: certaines polices sans Unicode cmap font planter jsPDF (widths undefined)
        doc.setFont(fontData.fontName, 'normal');
        doc.getTextWidth('ا');

        arabicFontName = fontData.fontName;
        arabicFontLoaded = true;
      } catch (fontError) {
        console.warn('Failed to register Arabic font:', fontError);
        arabicFontLoaded = false;
      }
    }
  }
  
  // Get template colors or use defaults
  const primaryColor = template?.primary_color 
    ? hexToRgb(template.primary_color) 
    : { r: 59, g: 130, b: 246 };
  const secondaryColor = template?.secondary_color 
    ? hexToRgb(template.secondary_color) 
    : { r: 100, g: 116, b: 139 };

  const layoutType = template?.layout_type || 'classic';
  const includeClassGrades = bulletins.some(b => b.hasClassGrades && b.grades.some(g => g.classGradeScore !== null && g.classGradeScore !== undefined));

  bulletins.forEach((student, index) => {
    if (index > 0) doc.addPage();

    let y = 15;

    const setFont = (text: string, style: 'normal' | 'bold' = 'normal') => {
      if (arabicFontLoaded && containsArabic(text)) {
        doc.setFont(arabicFontName, 'normal');
      } else {
        doc.setFont('helvetica', style);
      }
    };

    // Header with school info
    if (layoutType === 'modern') {
      doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      setFont('BULLETIN DE NOTES', 'bold');
      doc.text('BULLETIN DE NOTES', 105, 18, { align: 'center' });
      y = 40;
      doc.setTextColor(0, 0, 0);
    } else if (layoutType === 'compact') {
      doc.setFontSize(14);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      setFont('BULLETIN DE NOTES', 'bold');
      doc.text('BULLETIN DE NOTES', 105, y, { align: 'center' });
      y += 8;
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setFontSize(18);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      setFont('BULLETIN DE NOTES', 'bold');
      doc.text('BULLETIN DE NOTES', 105, y, { align: 'center' });
      y += 5;
      doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.setLineWidth(0.5);
      doc.line(60, y, 150, y);
      y += 10;
      doc.setTextColor(0, 0, 0);
    }

    // School and class info - Section enrichie avec plus d'informations
    doc.setFontSize(11);
    doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
    setFont(schoolName || '');
    
    // Ligne 1: Nom de l'école (en gras)
    if (schoolName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.text(schoolName, 105, y, { align: 'center' });
      y += 6;
    }
    
    // Ligne 2: Adresse de l'école
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
    const addressParts: string[] = [];
    if (schoolAddress) addressParts.push(schoolAddress);
    if (schoolCity) addressParts.push(schoolCity);
    if (schoolCountry) addressParts.push(schoolCountry);
    if (addressParts.length > 0) {
      doc.text(addressParts.join(', '), 105, y, { align: 'center' });
      y += 5;
    }
    
    // Ligne 3: Contact (téléphone et email)
    const contactParts: string[] = [];
    if (schoolPhone) contactParts.push(`Tél: ${schoolPhone}`);
    if (schoolEmail) contactParts.push(`Email: ${schoolEmail}`);
    if (contactParts.length > 0) {
      doc.text(contactParts.join(' | '), 105, y, { align: 'center' });
      y += 5;
    }
    
    // Ligne séparatrice
    y += 2;
    doc.setDrawColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
    doc.setLineWidth(0.2);
    doc.line(20, y, 190, y);
    y += 6;

    // Ligne 4: Classe, Période et Année scolaire
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Classe: ${className}`, 20, y);
    doc.text(`Période: ${evaluationTitle}`, 80, y);
    if (schoolYearName) {
      doc.text(`Année: ${schoolYearName}`, 150, y);
    }
    y += 8;

    // Student info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    setFont(student.studentName);
    doc.text(`Eleve: ${student.studentName}`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`Code: ${student.studentCode}`, 150, y);
    y += 10;

    // Table header
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(15, y - 5, 180, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    const hasArabicSubjects = student.grades.some(g => containsArabic(g.subjectName));
    
    if (includeClassGrades) {
      if (hasArabicSubjects) {
        doc.text('Appreciation', 17, y);
        doc.text('Moy.', 48, y);
        doc.text('Examen', 65, y);
        doc.text('Classe', 85, y);
        doc.text('Coef.', 105, y);
        doc.text('Matiere', 175, y, { align: 'right' });
      } else {
        doc.text('Matiere', 17, y);
        doc.text('Coef.', 60, y);
        doc.text('Classe', 78, y);
        doc.text('Examen', 98, y);
        doc.text('Bareme', 118, y);
        doc.text('Appreciation', 145, y);
      }
    } else {
      if (hasArabicSubjects) {
        doc.text('Appreciation', 17, y);
        doc.text('Bareme', 55, y);
        doc.text('Coef.', 70, y);
        doc.text('Note', 90, y);
        doc.text('Matiere', 175, y, { align: 'right' });
      } else {
        doc.text('Matiere', 17, y);
        doc.text('Note', 78, y);
        doc.text('Coef.', 98, y);
        doc.text('Bareme', 118, y);
        doc.text('Appreciation', 145, y);
      }
    }

    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Grades rows
    let rowIndex = 0;
    student.grades.forEach((grade) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y - 4, 180, 7, 'F');
      }

      const subjectAppreciation = getSubjectAppreciation(grade.score, grade.maxScore, !!grade.isAbsent);
      const examScoreText = grade.isAbsent ? 'ABS' : (grade.score !== null ? grade.score.toString() : '-');
      const classScoreText = grade.classGradeScore !== null && grade.classGradeScore !== undefined 
        ? grade.classGradeScore.toString() 
        : '-';
      const baremeText = `/${grade.maxScore}`;
      
      let avgScoreText = '-';
      if (includeClassGrades && grade.score !== null && grade.classGradeScore !== null && grade.classGradeScore !== undefined) {
        const avg = (grade.score + grade.classGradeScore) / 2;
        avgScoreText = avg.toFixed(1);
      } else if (!includeClassGrades && grade.score !== null) {
        avgScoreText = grade.score.toString();
      }
      
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      if (includeClassGrades) {
        if (hasArabicSubjects && containsArabic(grade.subjectName)) {
          doc.text(subjectAppreciation, 17, y);
          doc.text(avgScoreText, 50, y);
          doc.text(`${examScoreText}${baremeText}`, 68, y);
          doc.text(classScoreText, 88, y);
          doc.text(grade.coefficient.toString(), 108, y);
          setFont(grade.subjectName);
          doc.text(grade.subjectName.substring(0, 25), 175, y, { align: 'right' });
        } else {
          setFont(grade.subjectName);
          doc.text(grade.subjectName.substring(0, 22), 17, y);
          doc.setFont('helvetica', 'normal');
          doc.text(grade.coefficient.toString(), 63, y);
          doc.text(classScoreText, 82, y);
          doc.text(examScoreText, 100, y);
          doc.text(baremeText, 118, y);
          doc.text(subjectAppreciation, 145, y);
        }
      } else {
        if (hasArabicSubjects && containsArabic(grade.subjectName)) {
          doc.text(subjectAppreciation, 17, y);
          doc.text(baremeText, 57, y);
          doc.text(grade.coefficient.toString(), 73, y);
          doc.text(examScoreText, 92, y);
          setFont(grade.subjectName);
          doc.text(grade.subjectName.substring(0, 30), 175, y, { align: 'right' });
        } else {
          setFont(grade.subjectName);
          doc.text(grade.subjectName.substring(0, 25), 17, y);
          doc.setFont('helvetica', 'normal');
          doc.text(examScoreText, 82, y);
          doc.text(grade.coefficient.toString(), 100, y);
          doc.text(baremeText, 118, y);
          doc.text(subjectAppreciation, 145, y);
        }
      }
      
      y += 7;
      rowIndex++;
    });

    // Summary section
    y += 5;
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.3);
    doc.line(15, y, 195, y);
    y += 8;

    // Results box
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.roundedRect(15, y - 3, 180, 25, 3, 3, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    
    const avgText = student.average !== null ? student.average.toFixed(2) : '-';
    doc.text(`Moyenne: ${avgText}`, 25, y + 5);
    doc.text(`Rang: ${student.rank}/${student.totalStudents}`, 80, y + 5);
    doc.text(`Mention: ${student.mention || '-'}`, 130, y + 5);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Moyenne de classe: ${student.classAverage.toFixed(2)}`, 25, y + 15);
    doc.text(`Meilleure moyenne: ${student.firstAverage.toFixed(2)}`, 110, y + 15);
    
    y += 30;

    // Global appreciation
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, y, 180, 20, 2, 2, 'F');
    
    doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
    doc.text('Appreciation generale:', 20, y + 6);
    doc.setTextColor(0, 0, 0);
    doc.text(student.appreciation || '-', 20, y + 14);

    // Footer
    y += 30;
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
    const today = new Date().toLocaleDateString('fr-FR');
    doc.text(`Document genere le ${today}`, 105, 285, { align: 'center' });
  });

  const blob = doc.output('blob');
  return { doc, blob };
};

/**
 * Télécharge un blob côté navigateur (compatible iframe / PWA)
 */
const downloadBlob = (blob: Blob, fileName: string) => {
  if (!blob) throw new Error('PDF blob introuvable');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'bulletin.pdf';

  document.body.appendChild(link);
  try {
    link.click();
  } catch (err) {
    // Fallback (Safari / environnements bridés): ouvrir le PDF dans un nouvel onglet
    window.open(url, '_blank', 'noopener,noreferrer');
  } finally {
    link.remove();
    // Laisser le temps au navigateur de démarrer le download avant de révoquer
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

/**
 * Exporte un bulletin individuel en PDF
 * @param returnBlob Si true, retourne le blob au lieu de télécharger
 */
export const exportSingleBulletinToPdf = async ({
  className,
  evaluationTitle,
  schoolName,
  schoolYearName,
  schoolAddress,
  schoolCity,
  schoolCountry,
  schoolPhone,
  schoolEmail,
  schoolLogoUrl,
  template,
  bulletin,
  returnBlob = false,
}: {
  className: string;
  evaluationTitle: string;
  schoolName?: string;
  schoolYearName?: string;
  schoolAddress?: string;
  schoolCity?: string;
  schoolCountry?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolLogoUrl?: string;
  template?: BulletinTemplate | null;
  bulletin: BulletinPdfData;
  returnBlob?: boolean;
}): Promise<{ blob: Blob; fileName: string } | void> => {
  const { blob } = await generateBulletinPdfCore({
    className,
    evaluationTitle,
    schoolName,
    schoolYearName,
    schoolAddress,
    schoolCity,
    schoolCountry,
    schoolPhone,
    schoolEmail,
    // schoolLogoUrl est gardé en option (pas encore dessiné dans le PDF)
    template,
    bulletins: [bulletin],
  });

  const fileName = `Bulletin_${bulletin.studentName.replace(/\s+/g, '_')}_${evaluationTitle.replace(/\s+/g, '_')}.pdf`
    .replace(/[^\w.-]/g, '');

  if (returnBlob) {
    return { blob, fileName };
  }

  downloadBlob(blob, fileName);
};

/**
 * Exporte tous les bulletins d'une classe en PDF
 */
export const exportBulletinsToPdf = async (options: BulletinPdfOptions): Promise<void> => {
  const { className, evaluationTitle } = options;
  const { blob } = await generateBulletinPdfCore(options);

  const fileName = `Bulletins_${className}_${evaluationTitle}.pdf`
    .replace(/\s+/g, '_')
    .replace(/[^\w.-]/g, '');

  downloadBlob(blob, fileName);
};
