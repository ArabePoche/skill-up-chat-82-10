/**
 * Utilitaire pour exporter les notes en Excel
 */
import * as XLSX from 'xlsx';
import { StudentGrade } from '../hooks/useGrades';

interface ExportGradesOptions {
  className: string;
  subjectName: string;
  evaluationName: string;
  maxScore: number;
  grades: StudentGrade[];
}

export const exportGradesToExcel = ({
  className,
  subjectName,
  evaluationName,
  maxScore,
  grades,
}: ExportGradesOptions) => {
  // Préparer les données
  const data = grades.map((grade, index) => ({
    'N°': index + 1,
    'Code': grade.student.student_code,
    'Nom': grade.student.last_name,
    'Prénom': grade.student.first_name,
    'Note': grade.is_absent ? 'Absent' : (grade.score !== null ? grade.score : '-'),
    [`/${maxScore}`]: maxScore,
    'Excusé': grade.is_excused ? 'Oui' : '',
    'Commentaire': grade.comment || '',
  }));

  // Calculer les statistiques
  const validGrades = grades.filter(g => g.score !== null && !g.is_absent);
  const average = validGrades.length > 0
    ? validGrades.reduce((sum, g) => sum + (g.score || 0), 0) / validGrades.length
    : 0;
  const max = validGrades.length > 0 ? Math.max(...validGrades.map(g => g.score || 0)) : 0;
  const min = validGrades.length > 0 ? Math.min(...validGrades.map(g => g.score || 0)) : 0;
  const absentCount = grades.filter(g => g.is_absent).length;

  // Ajouter les statistiques
  data.push({} as any); // Ligne vide
  data.push({
    'N°': '',
    'Code': '',
    'Nom': 'Statistiques',
    'Prénom': '',
    'Note': '',
    [`/${maxScore}`]: '',
    'Excusé': '',
    'Commentaire': '',
  } as any);
  data.push({
    'N°': '',
    'Code': '',
    'Nom': 'Moyenne',
    'Prénom': '',
    'Note': average.toFixed(2),
    [`/${maxScore}`]: '',
    'Excusé': '',
    'Commentaire': '',
  } as any);
  data.push({
    'N°': '',
    'Code': '',
    'Nom': 'Note max',
    'Prénom': '',
    'Note': max,
    [`/${maxScore}`]: '',
    'Excusé': '',
    'Commentaire': '',
  } as any);
  data.push({
    'N°': '',
    'Code': '',
    'Nom': 'Note min',
    'Prénom': '',
    'Note': min,
    [`/${maxScore}`]: '',
    'Excusé': '',
    'Commentaire': '',
  } as any);
  data.push({
    'N°': '',
    'Code': '',
    'Nom': 'Absents',
    'Prénom': '',
    'Note': absentCount,
    [`/${maxScore}`]: '',
    'Excusé': '',
    'Commentaire': '',
  } as any);

  // Créer le workbook
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  // Ajuster les colonnes
  worksheet['!cols'] = [
    { wch: 5 },  // N°
    { wch: 15 }, // Code
    { wch: 20 }, // Nom
    { wch: 20 }, // Prénom
    { wch: 10 }, // Note
    { wch: 8 },  // /20
    { wch: 8 },  // Excusé
    { wch: 30 }, // Commentaire
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Notes');

  // Générer le nom de fichier
  const fileName = `Notes_${className}_${subjectName}_${evaluationName}.xlsx`
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '');

  // Télécharger
  XLSX.writeFile(workbook, fileName);
};

interface ExportClassGradesOptions {
  className: string;
  evaluations: {
    name: string;
    subjectName: string;
    maxScore: number;
    grades: StudentGrade[];
  }[];
}

export const exportClassGradesToExcel = ({
  className,
  evaluations,
}: ExportClassGradesOptions) => {
  const workbook = XLSX.utils.book_new();

  // Collecter tous les élèves uniques
  const studentsMap = new Map<string, StudentGrade['student']>();
  evaluations.forEach(evaluation => {
    evaluation.grades.forEach(grade => {
      if (!studentsMap.has(grade.student_id)) {
        studentsMap.set(grade.student_id, grade.student);
      }
    });
  });

  const students = Array.from(studentsMap.values()).sort((a, b) => 
    a.last_name.localeCompare(b.last_name)
  );

  // Créer une feuille récapitulative
  const summaryData = students.map((student, index) => {
    const row: any = {
      'N°': index + 1,
      'Code': student.student_code,
      'Nom': student.last_name,
      'Prénom': student.first_name,
    };

    evaluations.forEach(evaluation => {
      const grade = evaluation.grades.find(g => g.student_id === student.id);
      const key = `${evaluation.subjectName} - ${evaluation.name}`;
      row[key] = grade?.is_absent 
        ? 'Absent' 
        : (grade?.score !== null && grade?.score !== undefined ? grade.score : '-');
    });

    return row;
  });

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Récapitulatif');

  // Créer une feuille par matière
  const subjectGroups = new Map<string, typeof evaluations>();
  evaluations.forEach(evaluation => {
    const key = evaluation.subjectName;
    if (!subjectGroups.has(key)) {
      subjectGroups.set(key, []);
    }
    subjectGroups.get(key)!.push(evaluation);
  });

  subjectGroups.forEach((evals, subjectName) => {
    const subjectData = students.map((student, index) => {
      const row: any = {
        'N°': index + 1,
        'Nom': student.last_name,
        'Prénom': student.first_name,
      };

      evals.forEach(evaluation => {
        const grade = evaluation.grades.find(g => g.student_id === student.id);
        row[evaluation.name] = grade?.is_absent 
          ? 'Abs' 
          : (grade?.score !== null && grade?.score !== undefined ? grade.score : '-');
      });

      return row;
    });

    const sheetName = subjectName.substring(0, 31); // Excel limite à 31 caractères
    const sheet = XLSX.utils.json_to_sheet(subjectData);
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  });

  // Télécharger
  const fileName = `Notes_${className}_${new Date().toISOString().split('T')[0]}.xlsx`
    .replace(/\s+/g, '_');

  XLSX.writeFile(workbook, fileName);
};
