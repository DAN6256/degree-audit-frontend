import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { listYearGroups, upsertYearGroup, listPrograms, upsertProgram } from '../api';
import { ProgramMeta, YearGroupSummary } from '../types';
import { Link } from 'react-router-dom';

const YearGroupManager: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<YearGroupSummary[]>([]);
  const [selectedYG, setSelectedYG] = useState<number | null>(null);
  const [programs, setPrograms] = useState<ProgramMeta[]>([]);
  const [ygInput, setYgInput] = useState<number>(2026);
  const [progName, setProgName] = useState<string>('');
  const [progPass, setProgPass] = useState<string>('D');
  const [msg, setMsg] = useState<string>('');

  const selectedItem = useMemo(
    () => items.find(i => i.yearGroup === selectedYG) || null,
    [items, selectedYG]
  );

  const loadAll = async () => {
    if (!token) return;
    try {
      const ygs = await listYearGroups(token);
      setItems(ygs);
      if (ygs.length && selectedYG === null) {
        setSelectedYG(ygs[0].yearGroup);
      }
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to load year groups');
    }
  };

  const loadPrograms = async (yg: number) => {
    if (!token) return;
    try {
      const progs = await listPrograms(token, yg);
      setPrograms(progs);
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to load programs');
    }
  };

  useEffect(() => { loadAll(); }, [token]);
  useEffect(() => { if (selectedYG != null) loadPrograms(selectedYG); }, [selectedYG, token]);

  const handleCreateYG = async () => {
    if (!token) return;
    try {
      await upsertYearGroup(token, ygInput);
      setMsg('Year group saved.');
      setYgInput(ygInput);
      loadAll();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to save year group');
    }
  };

  const handleAddProgram = async () => {
    if (!token || selectedYG == null || !progName.trim()) return;
    try {
      await upsertProgram(token, selectedYG, { displayName: progName.trim(), defaultPassGrade: progPass });
      setMsg('Program saved.');
      setProgName('');
      setProgPass('D');
      loadPrograms(selectedYG);
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to save program');
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem' }}>
      <h2>Year Groups & Programs</h2>

      {msg && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: 8, borderRadius: 6, marginBottom: 12 }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Year Groups</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="number" value={ygInput} onChange={(e) => setYgInput(parseInt(e.target.value, 10))}
              placeholder="e.g., 2026" />
            <button onClick={handleCreateYG}>Save Year Group</button>
          </div>
          <ul>
            {items.map(i => (
              <li key={i.yearGroup} style={{ marginBottom: 6 }}>
                <button
                  onClick={() => setSelectedYG(i.yearGroup)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                    background: selectedYG === i.yearGroup ? '#eef2ff' : 'white',
                    cursor: 'pointer'
                  }}
                >
                  {i.yearGroup}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>
            Programs {selectedItem ? `for ${selectedItem.yearGroup}` : ''}
          </h3>

          {selectedYG != null && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Program display name (must match Excel Program)"
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <select value={progPass} onChange={(e) => setProgPass(e.target.value)}>
                  {['A+','A','B+','B','C+','C','D+','D','E'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <button onClick={handleAddProgram}>Add Program</button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={th}>Program</th>
                    <th style={th}>Default Pass</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map(p => (
                    <tr key={p.displayName}>
                      <td style={td}>{p.displayName}</td>
                      <td style={td}>{p.defaultPassGrade || 'D'}</td>
                      <td style={td}>
                        <Link to={`/criteria?yearGroup=${selectedYG}&program=${encodeURIComponent(p.displayName)}`}>
                          Open Criteria
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const th: React.CSSProperties = { textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' };
const td: React.CSSProperties = { padding: 8, borderBottom: '1px solid #f3f4f6' };

export default YearGroupManager;
