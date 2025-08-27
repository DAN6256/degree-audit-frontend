import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getSemesterData, saveSemesterData } from '../api';
import { SemesterData, Slot, Rule } from '../types';
import { nanoid } from 'nanoid';

const SEMESTERS = ['Y1S1','Y1S2','Y2S1','Y2S2','Y3S1','Y3S2','Y4S1','Y4S2'];

const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => 2025 + i);

//We can make this dynamic later
const PROGRAM_OPTIONS = [
  'B.Sc - Computer Engineering',
  'B.Sc - Mechanical Engineering',
  'B.Sc - Mechatronics Engineering',
  'B.Sc - Electrical and Electronic Engineering',
  'B.Sc - Law with Public Policy',
  'B.Sc - Business Administration',
  'B.Sc - Computer Science',
  'B.Sc - Management Information Systems',
  'B.Sc - Economics',
];

function deepCloneData(d: SemesterData | undefined | null): SemesterData {
  if (!d) return { slots: [], rules: [] };
  return {
    slots: Array.isArray(d.slots) ? d.slots.map(s => ({ ...s })) : [],
    rules: Array.isArray(d.rules)
      ? d.rules.map(r => ({ ...r, when: { ...(r.when || {}) }, then: { ...(r.then || {}) } }))
      : [],
  };
}

function hasContent(d: SemesterData | undefined | null): boolean {
  return !!(d && ((Array.isArray(d.slots) && d.slots.length) || (Array.isArray(d.rules) && d.rules.length)));
}

function getPrevSemester(current: string): string | null {
  const idx = SEMESTERS.indexOf(current);
  if (idx > 0) return SEMESTERS[idx - 1];
  return null;
}

const ProgramCriteria: React.FC = () => {
  const { token } = useAuth();
  const [sp] = useSearchParams();

  // Track previous program to support program-change prefill
  const prevProgramRef = useRef<string | null>(null);

  const [yearGroup, setYearGroup] = useState<number>(() => {
    const yg = parseInt(sp.get('yearGroup') || '', 10);
    return Number.isFinite(yg) ? yg : 2026;
  });

  const [program, setProgram] = useState<string>(() => {
    const p = sp.get('program');
    if (p) return decodeURIComponent(p);
    return PROGRAM_OPTIONS[0];
  });

  const [semester, setSemester] = useState<string>(() => {
    const s = sp.get('semester');
    return s && SEMESTERS.includes(s) ? s : SEMESTERS[0];
  });

  const [data, setData] = useState<SemesterData>({ slots: [], rules: [] });
  const [msg, setMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const title = useMemo(() => {
    const yg = `YearGroup ${yearGroup}`;
    const pr = program ? ` • ${program}` : ' • (set Program)';
    const sm = ` • ${semester}`;
    return `Program Criteria — ${yg}${pr}${sm}`;
  }, [program, yearGroup, semester]);

  
  const load = async (fromProgram?: string | null) => {
    if (!token || !program.trim() || !semester || !Number.isFinite(yearGroup)) {
      setData({ slots: [], rules: [] });
      setMsg(program.trim() ? '' : 'Select a Program to load.');
      return;
    }

    setLoading(true);
    setMsg('');
    try {
      
      const current = await getSemesterData(token, yearGroup, program.trim(), semester);
      if (hasContent(current)) {
        setData(deepCloneData(current));
        return;
      }

      if (fromProgram && fromProgram.trim() && fromProgram !== program) {
        const fromProgData = await getSemesterData(token, yearGroup, fromProgram.trim(), semester);
        if (hasContent(fromProgData)) {
          setData(deepCloneData(fromProgData));
          setMsg(`Prefilled from program "${fromProgram}" (${semester}). Review and click Save to persist.`);
          return;
        }
      }

      const prevSem = getPrevSemester(semester);
      if (prevSem) {
        const prevSemData = await getSemesterData(token, yearGroup, program.trim(), prevSem);
        if (hasContent(prevSemData)) {
          setData(deepCloneData(prevSemData));
          setMsg(`Prefilled from ${prevSem}. Review and click Save to persist.`);
          return;
        }
      }

      const prevYearGroup = yearGroup - 1;
      if (prevYearGroup >= Math.min(...YEAR_OPTIONS)) {
        const prevYearData = await getSemesterData(token, prevYearGroup, program.trim(), semester);
        if (hasContent(prevYearData)) {
          setData(deepCloneData(prevYearData));
          setMsg(`Prefilled from YearGroup ${prevYearGroup}, ${semester}. Review and click Save to persist.`);
          return;
        }
      }

      setData({ slots: [], rules: [] });
      setMsg('No criteria yet for this selection. Start adding slots and rules.');
    } catch (e: any) {
      setData({ slots: [], rules: [] });
      setMsg(e?.response?.data?.message || 'Failed to load semester data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    prevProgramRef.current = program;
  }, []);

  useEffect(() => { load(undefined);  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(undefined); }, [yearGroup, semester]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fromProg = prevProgramRef.current;
    load(fromProg);
    prevProgramRef.current = program;
  }, [program]);

  const addRequired = () => {
    const s: Slot = {
      id: nanoid(),
      title: '',
      kind: 'required',
      courseName: '',
      minGrade: 'D',
      priority: 0,
    };
    setData(prev => ({ ...prev, slots: [...prev.slots, s] }));
  };

  const addElective = (tag = 'Elective', priority = 50) => {
    const count = (data.slots.filter(x => x.tag === tag).length) + 1;
    const s: Slot = {
      id: nanoid(),
      title: `${tag} #${count}`,
      kind: 'elective',
      allowedCourses: [],
      minGrade: 'D',
      tag,
      priority,
    };
    setData(prev => ({ ...prev, slots: [...prev.slots, s] }));
  };

  const removeSlot = (id: string) => {
    setData(prev => ({ ...prev, slots: prev.slots.filter(s => s.id !== id) }));
  };

  const updateSlot = (id: string, patch: Partial<Slot>) => {
    setData(prev => ({
      ...prev,
      slots: prev.slots.map(s => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const addRule = () => {
    const r: Rule = { id: nanoid(), name: '', when: {}, then: {} };
    setData(prev => ({ ...prev, rules: [...prev.rules, r] }));
  };

  const removeRule = (id: string) => {
    setData(prev => ({ ...prev, rules: prev.rules.filter(r => r.id !== id) }));
  };

  const updateRule = (id: string, patch: Partial<Rule>) => {
    setData(prev => ({
      ...prev,
      rules: prev.rules.map(r => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const save = async () => {
    if (!token) return;
    if (!program.trim()) {
      setMsg('Please select a Program before saving.');
      return;
    }
    try {
      await saveSemesterData(token, yearGroup, program.trim(), semester, data);
      setMsg('Saved.');
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Save failed.');
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>

      {msg && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: 10, borderRadius: 8, marginBottom: 12 }}>
          {msg}
        </div>
      )}

      
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr 1fr auto',
          gap: 12,
          alignItems: 'end',
          marginBottom: 12,
        }}
      >
        <div>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Year Group</label>
          <select value={yearGroup} onChange={(e) => setYearGroup(parseInt(e.target.value, 10))}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
            Program (must match Excel “Program”)
          </label>
          <select
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            style={{ width: '100%', padding: 6 }}
          >
            {PROGRAM_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Semester</label>
          <select value={semester} onChange={(e) => setSemester(e.target.value)}>
            {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => load(undefined)} disabled={loading}>Reload</button>
          <button onClick={save} disabled={loading || !token || !program.trim()}>Save</button>
        </div>
      </div>

      {/* Slots */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Slots</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <button onClick={addRequired}>Add Required</button>
          <button onClick={() => addElective('Major Elective', 10)}>Add Major Elective</button>
          <button onClick={() => addElective('Non-Major Elective', 20)}>Add Non-Major Elective</button>
          <button onClick={() => addElective('Africana Elective', 30)}>Add Africana Elective</button>
          <button onClick={() => addElective('Elective', 50)}>Add Elective</button>
        </div>

        {data.slots.length === 0 && <div style={{ color: '#6b7280' }}>No slots yet.</div>}

        {data.slots.map(s => (
          <div key={s.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, marginBottom: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>
              <div>
                <label>Title</label>
                <input value={s.title} onChange={(e) => updateSlot(s.id, { title: e.target.value })} />
              </div>
              <div>
                <label>Kind</label>
                <select value={s.kind} onChange={(e) => updateSlot(s.id, { kind: e.target.value as any })}>
                  <option value="required">required</option>
                  <option value="elective">elective</option>
                </select>
              </div>
              <div>
                <label>Min Grade</label>
                <select value={s.minGrade || 'D'} onChange={(e) => updateSlot(s.id, { minGrade: e.target.value })}>
                  {['A+','A','B+','B','C+','C','D+','D','E','P'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label>Priority</label>
                <input
                  type="number"
                  value={s.priority ?? (s.kind === 'required' ? 0 : 50)}
                  onChange={(e) => updateSlot(s.id, { priority: parseInt(e.target.value, 10) })}
                />
              </div>
              <div>
                <label>Tag</label>
                <input value={s.tag || ''} onChange={(e) => updateSlot(s.id, { tag: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => removeSlot(s.id)}>Delete Slot</button>
              </div>
            </div>

            {s.kind === 'required' ? (
              <div style={{ marginTop: 8 }}>
                <label>Course Name</label>
                <input
                  value={s.courseName || ''}
                  onChange={(e) => updateSlot(s.id, { courseName: e.target.value })}
                  placeholder='e.g., "Circuits and Electronics"'
                  style={{ width: '100%' }}
                />
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <label>Allowed Courses (comma-separated; ONE will satisfy this slot)</label>
                <input
                  value={(s.allowedCourses || []).join(', ')}
                  onChange={(e) =>
                    updateSlot(s.id, {
                      allowedCourses: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                    })
                  }
                  placeholder='e.g., "Embedded Systems, Digital Control, ..."'
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rules */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Rules (Math Tracks, Waivers, Adds)</h3>
        <button onClick={addRule}>Add Rule</button>
        {data.rules.length === 0 && <div style={{ marginTop: 8, color: '#6b7280' }}>No rules.</div>}

        {data.rules.map(r => (
          <div key={r.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <div>
                <label>Name</label>
                <input
                  value={r.name}
                  onChange={(e) => updateRule(r.id, { name: e.target.value })}
                  placeholder="e.g., 'If Calculus I passed → require Calculus II; waive Applied Calculus'"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => removeRule(r.id)}>Delete Rule</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div>
                <label>When: anyPassed (comma list)</label>
                <input
                  value={(r.when?.anyPassed || []).join(', ')}
                  onChange={(e) =>
                    updateRule(r.id, {
                      when: { ...(r.when || {}), anyPassed: e.target.value.split(',').map(x => x.trim()).filter(Boolean) },
                    })
                  }
                />
              </div>
              <div>
                <label>When: allPassed (comma list)</label>
                <input
                  value={(r.when?.allPassed || []).join(', ')}
                  onChange={(e) =>
                    updateRule(r.id, {
                      when: { ...(r.when || {}), allPassed: e.target.value.split(',').map(x => x.trim()).filter(Boolean) },
                    })
                  }
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div>
                <label>Then: waiveSlotsByTitle (comma list)</label>
                <input
                  value={(r.then?.waiveSlotsByTitle || []).join(', ')}
                  onChange={(e) =>
                    updateRule(r.id, {
                      then: { ...(r.then || {}), waiveSlotsByTitle: e.target.value.split(',').map(x => x.trim()).filter(Boolean) },
                    })
                  }
                />
              </div>
              <div>
                <label>Then: waiveCourses (rare) (comma list)</label>
                <input
                  value={(r.then?.waiveCourses || []).join(', ')}
                  onChange={(e) =>
                    updateRule(r.id, {
                      then: { ...(r.then || {}), waiveCourses: e.target.value.split(',').map(x => x.trim()).filter(Boolean) },
                    })
                  }
                />
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <details>
                <summary style={{ cursor: 'pointer' }}>Then: addSlots (inline JSON)</summary>
                <textarea
                  style={{ width: '100%', minHeight: 140, fontFamily: 'monospace' }}
                  value={JSON.stringify(r.then?.addSlots || [], null, 2)}
                  onChange={(e) => {
                    try {
                      const arr = JSON.parse(e.target.value);
                      updateRule(r.id, { then: { ...(r.then || {}), addSlots: Array.isArray(arr) ? arr : [] } });
                    } catch {
                      // ignore parse errors while typing
                    }
                  }}
                />
                <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                  Use Slot objects: id/title/kind/courseName/allowedCourses/minGrade/priority/tag.
                </div>
              </details>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgramCriteria;
