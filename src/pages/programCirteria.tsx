import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getSemesterData, saveSemesterData } from '../api';
import { SemesterData, Slot, Rule } from '../types';
import { nanoid } from 'nanoid';
import './ProgramCriteria.css';

const SEMESTERS = ['Y1S1','Y1S2','Y2S1','Y2S2','Y3S1','Y3S2','Y4S1','Y4S2'];
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => 2025 + i);

// We can make this dynamic later
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

  const AddButtons = () => (
    <>
      <button className="btn btnChip" onClick={addRequired}>Add Required</button>
      <button className="btn btnChip" onClick={() => addElective('Major Elective', 10)}>Add Major Elective</button>
      <button className="btn btnChip" onClick={() => addElective('Non-Major Elective', 20)}>Add Non-Major Elective</button>
      <button className="btn btnChip" onClick={() => addElective('Africana Elective', 30)}>Add Africana Elective</button>
      <button className="btn btnChip" onClick={() => addElective('Elective', 50)}>Add Elective</button>
    </>
  );

  return (
    <div className="pcContainer">
      <h2 className="pcTitle">{title}</h2>

      {msg && <div className="pcMsg">{msg}</div>}

      <div className="controlsGrid">
        <div className="controlGroup">
          <label className="fieldLabel">Year Group</label>
          <select
            className="selectInput"
            value={yearGroup}
            onChange={(e) => setYearGroup(parseInt(e.target.value, 10))}
          >
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="controlGroup">
          <label className="fieldLabel">Program (must match Excel “Program”)</label>
          <select
            className="selectInput"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
          >
            {PROGRAM_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="controlGroup">
          <label className="fieldLabel">Semester</label>
          <select
            className="selectInput"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="controlsActions">
          <button className="btn btnSecondary" onClick={() => load(undefined)} disabled={loading}>
            {loading ? 'Loading…' : 'Reload'}
          </button>
          <button className="btn btnPrimary" onClick={save} disabled={loading || !token || !program.trim()}>
            Save
          </button>
        </div>
      </div>

      {/* Slots */}
      <section className="section">
        <div className="sectionHeader">
          <h3 className="sectionTitle">Slots</h3>

          {/* Show add buttons at the TOP only when there are NO slots yet */}
          {data.slots.length === 0 && (
            <div className="toolbar">
              <AddButtons />
            </div>
          )}
        </div>

        {data.slots.length === 0 && <div className="emptyText">No slots yet.</div>}

        {data.slots.map(s => (
          <div key={s.id} className="slotCard">
            <div className="slotGrid">
              <div className="field">
                <label className="fieldLabel">Title</label>
                <input
                  className="textInput"
                  value={s.title}
                  onChange={(e) => updateSlot(s.id, { title: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="fieldLabel">Kind</label>
                <select
                  className="selectInput"
                  value={s.kind}
                  onChange={(e) => updateSlot(s.id, { kind: e.target.value as any })}
                >
                  <option value="required">required</option>
                  <option value="elective">elective</option>
                </select>
              </div>
              <div className="field">
                <label className="fieldLabel">Min Grade</label>
                <select
                  className="selectInput"
                  value={s.minGrade || 'D'}
                  onChange={(e) => updateSlot(s.id, { minGrade: e.target.value })}
                >
                  {['A+','A','B+','B','C+','C','D+','D','E','P'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="fieldLabel">Priority</label>
                <input
                  className="textInput"
                  type="number"
                  value={s.priority ?? (s.kind === 'required' ? 0 : 50)}
                  onChange={(e) => updateSlot(s.id, { priority: parseInt(e.target.value, 10) })}
                />
              </div>
              <div className="field">
                <label className="fieldLabel">Tag</label>
                <input
                  className="textInput"
                  value={s.tag || ''}
                  onChange={(e) => updateSlot(s.id, { tag: e.target.value })}
                />
              </div>
              <div className="field fieldActions">
                <button className="btn btnDanger btnSmall" onClick={() => removeSlot(s.id)}>Delete Slot</button>
              </div>
            </div>

            {s.kind === 'required' ? (
              <div className="fieldRow">
                <label className="fieldLabel">Course Name</label>
                <input
                  className="textInput"
                  value={s.courseName || ''}
                  onChange={(e) => updateSlot(s.id, { courseName: e.target.value })}
                  placeholder='e.g., "Circuits and Electronics"'
                />
              </div>
            ) : (
              <div className="fieldRow">
                <label className="fieldLabel">Allowed Courses (comma-separated; ONE will satisfy this slot)</label>
                <input
                  className="textInput"
                  value={(s.allowedCourses || []).join(', ')}
                  onChange={(e) =>
                    updateSlot(s.id, {
                      allowedCourses: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                    })
                  }
                  placeholder='e.g., "Embedded Systems, Digital Control, ..."'
                />
              </div>
            )}
          </div>
        ))}

        {/* Add buttons at the BOTTOM when there ARE slots */}
        {data.slots.length > 0 && (
          <div className="toolbar toolbarBottom">
            <AddButtons />
          </div>
        )}
      </section>

      {/* Rules */}
      <section className="section">
        <div className="sectionHeader">
          <h3 className="sectionTitle">Rules (Math Tracks, Waivers, Adds)</h3>
          <div className="toolbar">
            <button className="btn btnChip" onClick={addRule}>Add Rule</button>
          </div>
        </div>

        {data.rules.length === 0 && <div className="emptyText">No rules.</div>}

        {data.rules.map(r => (
          <div key={r.id} className="ruleCard">
            <div className="ruleHeaderGrid">
              <div className="field">
                <label className="fieldLabel">Name</label>
                <input
                  className="textInput"
                  value={r.name}
                  onChange={(e) => updateRule(r.id, { name: e.target.value })}
                  placeholder="e.g., 'If Calculus I passed → require Calculus II; waive Applied Calculus'"
                />
              </div>
              <div className="field fieldActions">
                <button className="btn btnDanger btnSmall" onClick={() => removeRule(r.id)}>Delete Rule</button>
              </div>
            </div>

            <div className="twoColGrid">
              <div className="field">
                <label className="fieldLabel">When: anyPassed (comma list)</label>
                <input
                  className="textInput"
                  value={(r.when?.anyPassed || []).join(', ')}
                  onChange={(e) =>
                    updateRule(r.id, {
                      when: { ...(r.when || {}), anyPassed: e.target.value.split(',').map(x => x.trim()).filter(Boolean) },
                    })
                  }
                />
              </div>
              <div className="field">
                <label className="fieldLabel">When: allPassed (comma list)</label>
                <input
                  className="textInput"
                  value={(r.when?.allPassed || []).join(', ')}
                  onChange={(e) =>
                    updateRule(r.id, {
                      when: { ...(r.when || {}), allPassed: e.target.value.split(',').map(x => x.trim()).filter(Boolean) },
                    })
                  }
                />
              </div>
            </div>

            <div className="twoColGrid">
              <div className="field">
                <label className="fieldLabel">Then: waiveSlotsByTitle (comma list)</label>
                <input
                  className="textInput"
                  value={(r.then?.waiveSlotsByTitle || []).join(', ')}
                  onChange={(e) =>
                    updateRule(r.id, {
                      then: { ...(r.then || {}), waiveSlotsByTitle: e.target.value.split(',').map(x => x.trim()).filter(Boolean) },
                    })
                  }
                />
              </div>
              <div className="field">
                <label className="fieldLabel">Then: waiveCourses (rare) (comma list)</label>
                <input
                  className="textInput"
                  value={(r.then?.waiveCourses || []).join(', ')}
                  onChange={(e) =>
                    updateRule(r.id, {
                      then: { ...(r.then || {}), waiveCourses: e.target.value.split(',').map(x => x.trim()).filter(Boolean) },
                    })
                  }
                />
              </div>
            </div>

            <div className="jsonBlock">
              <details>
                <summary className="jsonSummary">Then: addSlots (inline JSON)</summary>
                <textarea
                  className="jsonArea"
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
                <div className="hint">
                  Use Slot objects: id/title/kind/courseName/allowedCourses/minGrade/priority/tag.
                </div>
              </details>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default ProgramCriteria;
