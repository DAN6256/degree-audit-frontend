import React from 'react';
import * as XLSX from 'xlsx';
import { StudentRecord } from '../types';

interface ExcelUploadProps {
  onParsed: (students: StudentRecord[]) => void;
}

/**
 * Component for uploading and parsing a student data Excel file.  
 */
const ExcelUpload: React.FC<ExcelUploadProps> = ({ onParsed }) => {
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      const studentsMap: Record<string, StudentRecord> = {};
      rows.forEach((row) => {
        const appNo = row['Application No'] ? String(row['Application No']).trim() : undefined;
        const name = row['Name'] ? String(row['Name']).trim() : undefined;
        const program = row['Program'] ? String(row['Program']).trim() : undefined;
        const courseCode = row['Course'] ? String(row['Course']).trim() : undefined;
        const category = row['Category'] ? String(row['Category']).trim() : undefined;
        const subCategory = row['Sub-Category'] ? String(row['Sub-Category']).trim() : undefined;
        const courseCreditsRaw = row['Course Credits'];
        const courseCredits = typeof courseCreditsRaw === 'number' ? courseCreditsRaw : parseFloat(courseCreditsRaw);
        const earnedCreditsRaw = row['Student Earned Credits'];
        const earnedCredits = typeof earnedCreditsRaw === 'number' ? earnedCreditsRaw : parseFloat(earnedCreditsRaw);
        const grade = row['Grade'] ? String(row['Grade']).trim() : '';
        if (!appNo || !courseCode) return;
        if (!studentsMap[appNo]) {
          studentsMap[appNo] = {
            applicationNo: appNo,
            name: name || '',
            program: program || '',
            courses: [],
          };
        }
        studentsMap[appNo].courses.push({
          code: courseCode,
          category: category || '',
          subCategory: subCategory || '',
          credits: isNaN(courseCredits) ? 0 : courseCredits,
          earnedCredits: isNaN(earnedCredits) ? 0 : earnedCredits,
          grade,
        });
      });
      onParsed(Object.values(studentsMap));
    } catch (err) {
      console.error('Failed to parse Excel:', err);
    }
  };
  return <input type="file" accept=".xlsx" onChange={handleFileChange} />;
};

export default ExcelUpload;