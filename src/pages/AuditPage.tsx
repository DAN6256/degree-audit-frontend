import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { runAudit } from '../api';
import ExcelUpload from '../components/ExcelUpload';
import { StudentRecord } from '../types';

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
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const allowed = SEMESTERS_BY_YEAR[year as keyof typeof SEMESTERS_BY_YEAR];
    if (!allowed.includes(semester)) {
      setSemester(allowed[0]);
    }
  }, [year]); 

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
  };

  const handleClearStudents = () => {
    setStudents([]);
    setResults([]);
    setMessage('');
  };

  const handleRunAudit = async () => {
    if (!token) {
      setMessage('You must be logged in.');
      return;
    }
    if (students.length === 0) {
      setMessage('Please upload an Excel sheet first.');
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
      setMessage(normalized.length === 0 ? 'No results returned.' : 'Audit completed.');
    } catch (err: any) {
      console.error(err);
      setMessage(err?.response?.data?.message || 'Audit failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem' }}>
      <h2>Run Degree Audit</h2>

      {/* Audit Parameters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <label style={{ display: 'block', fontWeight: 600 }}>Year Group</label>
          <select
            value={yearGroup}
            onChange={(e) => setYearGroup(parseInt(e.target.value, 10))}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            {YEAR_GROUP_OPTIONS.map((yg) => (
              <option key={yg} value={yg}>
                {yg}
              </option>
            ))}
          </select>
          <small>Audits are evaluated against criteria saved for this year group.</small>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600 }}>Year</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {`Year ${y}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600 }}>Semester</label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            {SEMESTERS_BY_YEAR[year as keyof typeof SEMESTERS_BY_YEAR].map((sem) => (
              <option key={sem} value={sem}>
                {sem}
              </option>
            ))}
          </select>
          <small>Must match the saved criteria’s semester key (e.g., Y2S1).</small>
        </div>
      </div>

      {/* Excel Upload */}
      <div
        style={{
          marginBottom: '1rem',
          padding: '1rem',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Upload Student Excel</h3>
        <ExcelUpload onParsed={handleParsed} />
        {students.length > 0 && (
          <div
            style={{
              marginTop: '0.5rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span>
              Loaded <strong>{students.length}</strong> student{students.length === 1 ? '' : 's'}.
            </span>
            <button onClick={handleClearStudents} style={{ padding: '0.35rem 0.6rem' }}>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <button
          onClick={handleRunAudit}
          disabled={loading || !token || students.length === 0}
          style={{
            padding: '0.6rem 1rem',
            background: '#111827',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Running…' : 'Run Audit'}
        </button>
      </div>

      {message && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
          }}
        >
          {message}
        </div>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <div
          style={{
            marginBottom: '1rem',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ padding: '0.5rem 0.75rem', background: '#eef2ff', borderRadius: 6 }}>
            Total: <strong>{summary.total}</strong>
          </div>
          <div style={{ padding: '0.5rem 0.75rem', background: '#ecfdf5', borderRadius: 6 }}>
            Passed: <strong>{summary.passed}</strong>
          </div>
          <div style={{ padding: '0.5rem 0.75rem', background: '#fef2f2', borderRadius: 6 }}>
            Failed: <strong>{summary.failed}</strong>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={th}>App No.</th>
                <th style={th}>Name</th>
                <th style={th}>Program</th>
                <th style={th}>Status</th>
                <th style={th}>Missing / Notes</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.applicationNo}>
                  <td style={td}>{r.applicationNo}</td>
                  <td style={td}>{r.name}</td>
                  <td style={td}>{r.program}</td>
                  <td style={{ ...td, fontWeight: 700, color: r.passed ? '#065f46' : '#991b1b' }}>
                    {r.passed ? 'PASS' : 'INCOMPLETE'}
                  </td>
                  <td style={td}>
                    {r.missing && r.missing.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                        {r.missing.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Simple table cell styles
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.6rem',
  borderBottom: '1px solid #e5e7eb',
  fontWeight: 700,
  fontSize: 14,
};

const td: React.CSSProperties = {
  padding: '0.6rem',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'top',
  fontSize: 14,
};

export default AuditPage;
