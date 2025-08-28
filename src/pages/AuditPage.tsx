import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { runAudit } from '../api';
import ExcelUpload from '../components/ExcelUpload';
import { StudentRecord } from '../types';
import * as XLSX from 'xlsx';
import './AuditPage.css';

type AuditOutcome = {
  applicationNo: string;
  name: string;
  program: string;
  passed: boolean;
  missing: string[];
};

const YEAR_GROUP_OPTIONS = Array.from({ length: 16 }, (_, i) => 2020 + i);

const YEAR_OPTIONS = [1, 2, 3, 4] as const;

const SEMESTERS_BY_YEAR: Record<(typeof YEAR_OPTIONS)[number], string[]> = {
  1: ['Y1S1', 'Y1S2'],
  2: ['Y2S1', 'Y2S2'],
  3: ['Y3S1', 'Y3S2'],
  4: ['Y4S1', 'Y4S2'],
};

const AuditPage: React.FC = () => {
  const { token } = useAuth();

  const [yearGroup, setYearGroup] = useState<number>(2026);
  const [year, setYear] = useState<number>(1);
  const [semester, setSemester] = useState<string>(SEMESTERS_BY_YEAR[1][0]);

  // Data from Excel + results
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [results, setResults] = useState<AuditOutcome[]>([]);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'info' | 'error'>('info');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const allowed = SEMESTERS_BY_YEAR[year as keyof typeof SEMESTERS_BY_YEAR];
    if (!allowed.includes(semester)) {
      setSemester(allowed[0]);
    }
  }, [year]);

  // Filter to show only students not on track
  const notOnTrackStudents = useMemo(() => {
    return results.filter((r) => !r.passed);
  }, [results]);

  // Summary stats
  const summary = useMemo(() => {
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;
    return { total, passed, failed };
  }, [results]);

  const handleParsed = (parsed: StudentRecord[]) => {
    setStudents(parsed);
    setResults([]);
    setMessage(`Loaded ${parsed.length} student${parsed.length === 1 ? '' : 's'} from Excel`);
    setMessageType('info');
  };

  const handleClearStudents = () => {
    setStudents([]);
    setResults([]);
    setMessage('');
  };

  const handleRunAudit = async () => {
    if (!token) {
      setMessage('You must be logged in.');
      setMessageType('error');
      return;
    }
    if (students.length === 0) {
      setMessage('Please upload an Excel sheet first.');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('');
    setResults([]);
    try {
      const payload: AuditOutcome[] | { results: AuditOutcome[] } = await runAudit(
        token,
        yearGroup,
        semester,
        students
      );
      const normalized: AuditOutcome[] = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as { results?: AuditOutcome[] })?.results)
        ? (payload as { results: AuditOutcome[] }).results
        : [];
      setResults(normalized);
      setMessage(normalized.length === 0 ? 'No results returned.' : 'Audit completed successfully.');
      setMessageType('info');
    } catch (err: any) {
      console.error(err);
      setMessage(err?.response?.data?.message || 'Audit failed.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportNotOnTrack = () => {
    if (notOnTrackStudents.length === 0) {
      setMessage('No students not on track to export.');
      setMessageType('error');
      return;
    }

    // Prepare data for export
    const exportData = notOnTrackStudents.map((student) => ({
      'Application No': student.applicationNo,
      'Name': student.name,
      'Program': student.program,
      'Status': 'NOT ON TRACK',
      'Missing Requirements': student.missing.join('; '),
      'Year Group': yearGroup,
      'Semester': semester,
      'Audit Date': new Date().toLocaleDateString()
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const columnWidths = [
      { wch: 15 }, // Application No
      { wch: 25 }, // Name
      { wch: 30 }, // Program
      { wch: 15 }, // Status
      { wch: 50 }, // Missing Requirements
      { wch: 12 }, // Year Group
      { wch: 10 }, // Semester
      { wch: 12 }  // Audit Date
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Not On Track Students');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `not_on_track_students_${yearGroup}_${semester}_${timestamp}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);

    setMessage(`Exported ${notOnTrackStudents.length} students not on track to ${filename}`);
    setMessageType('info');
  };

  return (
    <div className="audit-page">
      <h2>Run Degree Audit</h2>

      {/* Audit Parameters */}
      <div className="parameters-grid">
        <div className="parameter-card">
          <label className="parameter-label">Year Group</label>
          <select
            value={yearGroup}
            onChange={(e) => setYearGroup(parseInt(e.target.value, 10))}
            className="parameter-select"
          >
            {YEAR_GROUP_OPTIONS.map((yg) => (
              <option key={yg} value={yg}>
                {yg}
              </option>
            ))}
          </select>
          <div className="parameter-hint">
            Audits are evaluated against criteria saved for this year group.
          </div>
        </div>

        <div className="parameter-card">
          <label className="parameter-label">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="parameter-select"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {`Year ${y}`}
              </option>
            ))}
          </select>
        </div>

        <div className="parameter-card">
          <label className="parameter-label">Semester</label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="parameter-select"
          >
            {SEMESTERS_BY_YEAR[year as keyof typeof SEMESTERS_BY_YEAR].map((sem) => (
              <option key={sem} value={sem}>
                {sem}
              </option>
            ))}
          </select>
          <div className="parameter-hint">
            Must match the saved criteria's semester key (e.g., Y2S1).
          </div>
        </div>
      </div>

      {/* Excel Upload */}
      <div className="excel-upload-section">
        <h3>Upload Student Excel</h3>
        <ExcelUpload onParsed={handleParsed} />
        {students.length > 0 && (
          <div className="students-info">
            <span className="students-count">
              Loaded <strong>{students.length}</strong> student{students.length === 1 ? '' : 's'}.
            </span>
            <button onClick={handleClearStudents} className="clear-button">
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="actions-section">
        <button
          onClick={handleRunAudit}
          disabled={loading || !token || students.length === 0}
          className="run-audit-button"
        >
          {loading ? 'Running Audit...' : 'Run Audit'}
        </button>

        {notOnTrackStudents.length > 0 && (
          <button
            onClick={handleExportNotOnTrack}
            className="export-button"
          >
            Export Not On Track ({notOnTrackStudents.length})
          </button>
        )}
      </div>

      {message && (
        <div className={`message-box ${messageType === 'error' ? 'error' : ''}`}>
          {message}
        </div>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <div className="summary-stats">
          <div className="stat-card total">
            Total: <strong>{summary.total}</strong>
          </div>
          <div className="stat-card passed">
            On Track: <strong>{summary.passed}</strong>
          </div>
          <div className="stat-card failed">
            Not On Track: <strong>{summary.failed}</strong>
          </div>
        </div>
      )}

      {/* Results Table - Only showing students not on track */}
      {notOnTrackStudents.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h3 className="results-title">Students Not On Track</h3>
            <p className="results-subtitle">
              Showing {notOnTrackStudents.length} of {results.length} students who are not meeting degree requirements
            </p>
          </div>
          
          <div className="filter-info">
            <strong>Note:</strong> Only displaying students who are not on track. 
            {summary.passed > 0 && ` ${summary.passed} students who are on track are hidden from this view.`}
          </div>

          <div className="table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Application No.</th>
                  <th>Name</th>
                  <th>Program</th>
                  <th>Status</th>
                  <th>Missing Requirements</th>
                </tr>
              </thead>
              <tbody>
                {notOnTrackStudents.map((r) => (
                  <tr key={r.applicationNo}>
                    <td>{r.applicationNo}</td>
                    <td>{r.name}</td>
                    <td>{r.program}</td>
                    <td className="status-cell not-on-track">
                      NOT ON TRACK
                    </td>
                    <td>
                      {r.missing && r.missing.length > 0 ? (
                        <ul className="missing-list">
                          {r.missing.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="no-data">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Show message when no students are not on track */}
      {results.length > 0 && notOnTrackStudents.length === 0 && (
        <div className="results-section">
          <div className="results-header">
            <h3 className="results-title">Great News! 🎉</h3>
            <p className="results-subtitle">
              All {results.length} students are on track to meet their degree requirements.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditPage;