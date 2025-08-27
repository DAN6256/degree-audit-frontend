import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  listYearGroups,
  upsertYearGroup,
  listPrograms,
  upsertProgram,
  getSemesterData,
  saveSemesterData,
} from '../api';
import { SemesterData, Slot, Rule } from '../types';

const semesters = ['Y1S1','Y1S2','Y2S1','Y2S2','Y3S1','Y3S2','Y4S1','Y4S2'];
const grades = ['A+','A','B+','B','C+','C','D+','D','E','P'];

const uid = () => Math.random().toString(36).slice(2, 10);

const box: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12 };
const th: React.CSSProperties = { textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' };
const td: React.CSSProperties = { padding: 8, borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' };
const label: React.CSSProperties = { fontWeight: 600, display: 'block', marginBottom: 4 };

const CriteriaManager: React.FC = () => {
  const { token } = useAuth();

  const [yearGroups, setYearGroups] = useState<number[]>([]);
  const [yearGroup, setYearGroup] = useState<number | null>(null);

  const [programs, setPrograms] = useState<{ displayName: string; defaultPassGrade?: string }[]>([]);
  const [program, setProgram] = useState<string>('');

  const [semester, setSemester] = useState<string>(semesters[0]);

  // Quick create controls
  const [ygInput, setYgInput] = useState<number>(2026);
  const [progName, setProgName] = useState<string>('');
  const [progPass, setProgPass] = useState<string>('D');

  const [data, setData] = useState<SemesterData>({ slots: [], rules: [], checkpointLabel: '' });

  const [msg, setMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const header = useMemo(() => {
    const yg = yearGroup != null ? `YearGroup ${yearGroup}` : '';
    const pr = program ? ` • ${program}` : '';
    const sm = semester ? ` • ${semester}` : '';
    return `Criteria Manager ${yg}${pr}${sm}`;
  }, [yearGroup, program, semester]);

  const loadYearGroups = async () => {
    if (!token) return;
    try {
      const ygs = await listYearGroups(token);
      const arr = (ygs || []).map((y: any) => y.yearGroup).filter((n: any) => typeof n === 'number');
      setYearGroups(arr);
      if (arr.length && yearGroup == null) {
        setYearGroup(arr[0]);
      }
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to load year groups');
    }
  };

  const loadPrograms = async (yg: number) => {
    if (!token) return;
    try {
      const progs = await listPrograms(token, yg);
      setPrograms(progs || []);
      if ((progs || []).length && !program) {
        setProgram(progs[0].displayName);
      }
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to load programs');
    }
  };

  useEffect(() => { loadYearGroups(); }, [token]);
  useEffect(() => { if (yearGroup != null) loadPrograms(yearGroup); }, [yearGroup, token]);

  const loadSemester = async () => {
    if (!token || yearGroup == null || !program || !semester) return;
    setLoading(true);
    setMsg('');
    try {
      const d = await getSemesterData(token, yearGroup, program, semester);
      setData({
        slots: d?.slots || [],
        rules: d?.rules || [],
        checkpointLabel: d?.checkpointLabel || '',
      });
      if ((!d?.slots || d.slots.length === 0) && (!d?.rules || d.rules.length === 0)) {
        setMsg('Empty semester: add slots and/or rules.');
      }
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to load semester data');
      setData({ slots: [], rules: [], checkpointLabel: '' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSemester(); }, [token]);
  useEffect(() => { loadSemester(); }, [yearGroup, program, semester]);

  const handleCreateYG = async () => {
    if (!token) return;
    try {
      await upsertYearGroup(token, ygInput);
      setMsg('Year group saved.');
      await loadYearGroups();
      setYearGroup(ygInput);
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to save year group');
    }
  };

  const handleAddProgram = async () => {
    if (!token || yearGroup == null || !progName.trim()) return;
    try {
      await upsertProgram(token, yearGroup, { displayName: progName.trim(), defaultPassGrade: progPass });
      setMsg('Program saved.');
      setProgName('');
      setProgPass('D');
      await loadPrograms(yearGroup);
      setProgram(progName.trim());
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to save program');
    }
  };

  const addRequired = () => {
    const s: Slot = {
      id: uid(),
      title: '',
      kind: 'required',
      courseName: '',
      minGrade: 'D',
      priority: 0,
    };
    setData(prev => ({ ...prev, slots: [...prev.slots, s] }));
  };

  const addElective = (tag = 'Elective', priority = 50) => {
    const count = data.slots.filter(x => x.tag === tag).length + 1;
    const s: Slot = {
      id: uid(),
      title: `${tag} #${count}`,
      kind: 'elective',
      priority,
      tag,
    };
    setData(prev => ({ ...prev, slots: [...prev.slots, s] }));
  };

  return (
    <div style={box}>
      <h2>{header}</h2>
      {msg && <div style={{ color: 'red', marginBottom: 8 }}>{msg}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {/* Render your UI here */}
          {/* Example: */}
          <div>
            <label style={label}>Year Group:</label>
            <select
              value={yearGroup ?? ''}
              onChange={e => setYearGroup(Number(e.target.value))}
            >
              {yearGroups.map(yg => (
                <option key={yg} value={yg}>{yg}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Program:</label>
            <select
              value={program}
              onChange={e => setProgram(e.target.value)}
            >
              {programs.map(p => (
                <option key={p.displayName} value={p.displayName}>{p.displayName}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Semester:</label>
            <select
              value={semester}
              onChange={e => setSemester(e.target.value)}
            >
              {semesters.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {/* if more UI needed */}
        </div>
      )}
    </div>
  );
}

export default CriteriaManager;
