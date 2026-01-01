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
  template?: BulletinTemplate | null;
  bulletins: BulletinPdfData[];
}

// Helper function to detect if text contains Arabic characters
const containsArabic = (text: string): boolean => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
};

// Get appreciation based on score
const getSubjectAppreciation = (score: number | null, isAbsent: boolean): string => {
  if (isAbsent) return 'Absent';
  if (score === null) return '-';
  if (score >= 18) return 'Excellent';
  if (score >= 16) return 'Très bien';
  if (score >= 14) return 'Bien';
  if (score >= 12) return 'Assez bien';
  if (score >= 10) return 'Passable';
  if (score >= 8) return 'Insuffisant';
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

// Load Arabic font (Amiri) as base64
const loadArabicFont = async (): Promise<string | null> => {
  try {
    const response = await fetch('/fonts/Amiri-Regular.ttf');
    if (!response.ok) {
      console.warn('Arabic font not found, falling back to default');
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.warn('Failed to load Arabic font:', error);
    return null;
  }
};

/**
 * Génère un PDF de bulletins et retourne le document et blob
 */
const generateBulletinPdfCore = async ({
  className,
  evaluationTitle,
  schoolName,
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
  if (hasArabicContent) {
    const amiriBase64 = await loadArabicFont();
    if (amiriBase64) {
      doc.addFileToVFS('Amiri-Regular.ttf', amiriBase64);
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
      arabicFontLoaded = true;
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
        doc.setFont('Amiri', 'normal');
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

    // School and class info
    doc.setFontSize(11);
    doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
    setFont(schoolName || '');
    
    if (schoolName) {
      doc.text(`Etablissement: ${schoolName}`, 20, y);
      y += 6;
    }
    
    doc.text(`Classe: ${className}`, 20, y);
    doc.text(`Periode: ${evaluationTitle}`, 110, y);
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
        doc.text('Coef.', 65, y);
        doc.text('Classe', 85, y);
        doc.text('Examen', 105, y);
        doc.text('Moy.', 125, y);
        doc.text('Appreciation', 145, y);
      }
    } else {
      if (hasArabicSubjects) {
        doc.text('Appreciation', 17, y);
        doc.text('/20', 55, y);
        doc.text('Coef.', 70, y);
        doc.text('Note', 90, y);
        doc.text('Matiere', 175, y, { align: 'right' });
      } else {
        doc.text('Matiere', 17, y);
        doc.text('Note', 85, y);
        doc.text('Coef.', 105, y);
        doc.text('/20', 125, y);
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

      const subjectAppreciation = getSubjectAppreciation(grade.score, !!grade.isAbsent);
      const examScoreText = grade.isAbsent ? 'ABS' : (grade.score !== null ? grade.score.toString() : '-');
      const classScoreText = grade.classGradeScore !== null && grade.classGradeScore !== undefined 
        ? grade.classGradeScore.toString() 
        : '-';
      
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
          doc.text(examScoreText, 68, y);
          doc.text(classScoreText, 88, y);
          doc.text(grade.coefficient.toString(), 108, y);
          setFont(grade.subjectName);
          doc.text(grade.subjectName.substring(0, 25), 175, y, { align: 'right' });
        } else {
          setFont(grade.subjectName);
          doc.text(grade.subjectName.substring(0, 25), 17, y);
          doc.setFont('helvetica', 'normal');
          doc.text(grade.coefficient.toString(), 68, y);
          doc.text(classScoreText, 88, y);
          doc.text(examScoreText, 108, y);
          doc.text(avgScoreText, 127, y);
          doc.text(subjectAppreciation, 145, y);
        }
      } else {
        if (hasArabicSubjects && containsArabic(grade.subjectName)) {
          doc.text(subjectAppreciation, 17, y);
          doc.text('20', 57, y);
          doc.text(grade.coefficient.toString(), 73, y);
          doc.text(examScoreText, 92, y);
          setFont(grade.subjectName);
          doc.text(grade.subjectName.substring(0, 30), 175, y, { align: 'right' });
        } else {
          setFont(grade.subjectName);
          doc.text(grade.subjectName.substring(0, 28), 17, y);
          doc.setFont('helvetica', 'normal');
          doc.text(examScoreText, 88, y);
          doc.text(grade.coefficient.toString(), 108, y);
          doc.text('20', 127, y);
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
    doc.text(`Moyenne: ${avgText}/20`, 25, y + 5);
    doc.text(`Rang: ${student.rank}/${student.totalStudents}`, 85, y + 5);
    doc.text(`Mention: ${student.mention || '-'}`, 140, y + 5);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Moyenne de classe: ${student.classAverage.toFixed(2)}/20`, 25, y + 15);
    doc.text(`Meilleure moyenne: ${student.firstAverage.toFixed(2)}/20`, 115, y + 15);
    
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
 * Exporte un bulletin individuel en PDF
 * @param returnBlob Si true, retourne le blob au lieu de télécharger
 */
export const exportSingleBulletinToPdf = async ({
  className,
  evaluationTitle,
  schoolName,
  schoolYearName,
  template,
  bulletin,
  returnBlob = false,
}: {
  className: string;
  evaluationTitle: string;
  schoolName?: string;
  schoolYearName?: string;
  template?: BulletinTemplate | null;
  bulletin: BulletinPdfData;
  returnBlob?: boolean;
}): Promise<{ blob: Blob; fileName: string } | void> => {
  const { blob } = await generateBulletinPdfCore({
    className,
    evaluationTitle,
    schoolName,
    schoolYearName,
    template,
    bulletins: [bulletin],
  });

  const fileName = `Bulletin_${bulletin.studentName.replace(/\s+/g, '_')}_${evaluationTitle.replace(/\s+/g, '_')}.pdf`
    .replace(/[^\w.-]/g, '');

  if (returnBlob) {
    return { blob, fileName };
  }
  
  // Download directly
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Exporte tous les bulletins d'une classe en PDF
 */
export const exportBulletinsToPdf = async ({
  className,
  evaluationTitle,
  schoolName,
  schoolYearName,
  template,
  bulletins,
}: BulletinPdfOptions): Promise<void> => {
  const { doc } = await generateBulletinPdfCore({
    className,
    evaluationTitle,
    schoolName,
    schoolYearName,
    template,
    bulletins,
  });

  const fileName = `Bulletins_${className}_${evaluationTitle}.pdf`
    .replace(/\s+/g, '_')
    .replace(/[^\w.-]/g, '');
  
  doc.save(fileName);
};
