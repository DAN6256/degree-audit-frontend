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
import './CriteriaManager.css';

const semesters = ['Y1S1','Y1S2','Y2S1','Y2S2','Y3S1','Y3S2','Y4S1','Y4S2'];
const grades = ['A+','A','B+','B','C+','C','D+','D','E','P'];

const uid = () => Math.random().toString(36).slice(2, 10);

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
  const [msgType, setMsgType] = useState<'error' | 'success' | 'info'>('info');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const header = useMemo(() => {
    const yg = yearGroup != null ? `Year Group ${yearGroup}` : '';
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
      setMsgType('error');
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
      setMsgType('error');
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
        setMsg('Empty semester: add slots and/or rules to get started.');
        setMsgType('info');
      }
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to load semester data');
      setMsgType('error');
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
      setMsg(`Year group ${ygInput} created successfully.`);
      setMsgType('success');
      await loadYearGroups();
      setYearGroup(ygInput);
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to save year group');
      setMsgType('error');
    }
  };

  const handleAddProgram = async () => {
    if (!token || yearGroup == null || !progName.trim()) return;
    try {
      await upsertProgram(token, yearGroup, { displayName: progName.trim(), defaultPassGrade: progPass });
      setMsg(`Program "${progName.trim()}" added successfully.`);
      setMsgType('success');
      setProgName('');
      setProgPass('D');
      await loadPrograms(yearGroup);
      setProgram(progName.trim());
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to save program');
      setMsgType('error');
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

  const addRule = () => {
    const r = {
      id: uid(),
      description: '',
      minCredits: 0,
      maxCredits: undefined,
      tags: [],
      courseNames: [],
      priority: 100,
    } as unknown as Rule;
    setData(prev => ({ ...prev, rules: [...prev.rules, r] }));
  };

  const updateSlot = (id: string, field: keyof Slot, value: any) => {
    setData(prev => ({
      ...prev,
      slots: prev.slots.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const updateRule = (id: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      rules: prev.rules.map(r => r.id === id ? { ...r, [field]: value } : r)
    }));
  };

  const removeSlot = (id: string) => {
    setData(prev => ({ ...prev, slots: prev.slots.filter(s => s.id !== id) }));
  };

  const removeRule = (id: string) => {
    setData(prev => ({ ...prev, rules: prev.rules.filter(r => r.id !== id) }));
  };

  const handleSave = async () => {
    if (!token || yearGroup == null || !program || !semester) return;
    setSaving(true);
    try {
      await saveSemesterData(token, yearGroup, program, semester, data);
      setMsg('Criteria saved successfully!');
      setMsgType('success');
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to save criteria');
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  };

  const canSave = yearGroup != null && program && semester && (data.slots.length > 0 || data.rules.length > 0);

  return (
    <div className="criteria-manager">
      <h2 className="criteria-header">Criteria Manager</h2>

      {msg && (
        <div className={`message-box ${msgType}`}>
          {msg}
        </div>
      )}

      <div className="controls-section">
        <div className="controls-grid">
          <div className="control-group">
            <label className="control-label">Year Group</label>
            <select
              className="control-select"
              value={yearGroup ?? ''}
              onChange={e => setYearGroup(Number(e.target.value))}
            >
              <option value="">Select Year Group</option>
              {yearGroups.map(yg => (
                <option key={yg} value={yg}>{yg}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">Program</label>
            <select
              className="control-select"
              value={program}
              onChange={e => setProgram(e.target.value)}
            >
              <option value="">Select Program</option>
              {programs.map(p => (
                <option key={p.displayName} value={p.displayName}>{p.displayName}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">Semester</label>
            <select
              className="control-select"
              value={semester}
              onChange={e => setSemester(e.target.value)}
            >
              {semesters.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="quick-actions">
          <h4>Quick Actions</h4>
          <div className="quick-action-row">
            <div className="quick-input">
              <label>New Year Group</label>
              <input
                type="number"
                value={ygInput}
                onChange={e => setYgInput(Number(e.target.value))}
                placeholder="e.g., 2026"
              />
            </div>
            <button onClick={handleCreateYG} className="btn btn-primary" disabled={!token}>
              Create Year Group
            </button>
          </div>

          <div className="quick-action-row">
            <div className="quick-input">
              <label>Program Name</label>
              <input
                type="text"
                value={progName}
                onChange={e => setProgName(e.target.value)}
                placeholder="e.g., Computer Science"
              />
            </div>
            <div className="quick-input">
              <label>Default Pass Grade</label>
              <select
                value={progPass}
                onChange={e => setProgPass(e.target.value)}
              >
                {grades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleAddProgram} 
              className="btn btn-secondary" 
              disabled={!token || yearGroup == null || !progName.trim()}
            >
              Add Program
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading semester data...</div>
      ) : (
        <div className="content-section">
          <div className="content-header">
            <h3 className="content-title">{header}</h3>
            <p className="content-subtitle">
              Define degree requirements and graduation criteria for this semester
            </p>
          </div>

          <div className="content-body">
            <div className="checkpoint-section">
              <h4>Checkpoint Label</h4>
              <input
                type="text"
                className="checkpoint-input"
                value={data.checkpointLabel}
                onChange={e => setData(prev => ({ ...prev, checkpointLabel: e.target.value }))}
                placeholder="e.g., First Year Requirements, Core Courses Complete, etc."
              />
            </div>

            {/* Slots Section */}
            <div className="slots-section">
              <div className="section-title">
                <h4>Course Slots ({data.slots.length})</h4>
              </div>

              {data.slots.length === 0 ? (
                <div className="empty-state">
                  <h3>No course slots defined</h3>
                  <p>Add required courses or elective categories to get started</p>
                </div>
              ) : (
                <div className="slots-grid">
                  {data.slots.map(slot => (
                    <div key={slot.id} className={`slot-card ${slot.kind}`}>
                      <div className="slot-header">
                        <div className={`slot-type-badge ${slot.kind}`}>
                          {slot.kind}
                        </div>
                        <button 
                          onClick={() => removeSlot(slot.id)}
                          className="btn-remove"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="slot-fields">
                        <div className="field-group">
                          <label className="field-label">Title</label>
                          <input
                            type="text"
                            className="field-input"
                            value={slot.title || ''}
                            onChange={e => updateSlot(slot.id, 'title', e.target.value)}
                            placeholder="Slot title"
                          />
                        </div>

                        {slot.kind === 'required' && (
                          <div className="field-group">
                            <label className="field-label">Course Name</label>
                            <input
                              type="text"
                              className="field-input"
                              value={slot.courseName || ''}
                              onChange={e => updateSlot(slot.id, 'courseName', e.target.value)}
                              placeholder="e.g., MATH 101"
                            />
                          </div>
                        )}

                        {slot.kind === 'elective' && (
                          <div className="field-group">
                            <label className="field-label">Tag</label>
                            <input
                              type="text"
                              className="field-input"
                              value={slot.tag || ''}
                              onChange={e => updateSlot(slot.id, 'tag', e.target.value)}
                              placeholder="e.g., Core Elective, Math Elective"
                            />
                          </div>
                        )}

                        <div className="field-group">
                          <label className="field-label">Min Grade</label>
                          <select
                            className="field-input"
                            value={slot.minGrade || 'D'}
                            onChange={e => updateSlot(slot.id, 'minGrade', e.target.value)}
                          >
                            {grades.map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>

                        <div className="field-group">
                          <label className="field-label">Priority</label>
                          <input
                            type="number"
                            className="field-input"
                            value={slot.priority || 0}
                            onChange={e => updateSlot(slot.id, 'priority', Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rules Section */}
            <div className="rules-section">
              <div className="section-title">
                <h4>Credit Rules ({data.rules.length})</h4>
              </div>

              {data.rules.length === 0 ? (
                <div className="empty-state">
                  <h3>No credit rules defined</h3>
                  <p>Add credit requirements and validation rules</p>
                </div>
              ) : (
                <div>
                  {data.rules.map(rule => (
                    <div key={rule.id} className="rule-card">
                      <div className="slot-header">
                        <div className="slot-type-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                          RULE
                        </div>
                        <button 
                          onClick={() => removeRule(rule.id)}
                          className="btn-remove"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="slot-fields">
                        <div className="field-group">
                          <label className="field-label">Description</label>
                          <input
                            type="text"
                            className="field-input"
                            value={(rule as any).description || ''}
                            onChange={e => updateRule(rule.id, 'description', e.target.value)}
                            placeholder="e.g., Minimum core credits required"
                          />
                        </div>

                        <div className="field-group">
                          <label className="field-label">Min Credits</label>
                          <input
                            type="number"
                            className="field-input"
                            value={(rule as any).minCredits ?? 0}
                            onChange={e => updateRule(rule.id, 'minCredits', Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>

                        <div className="field-group">
                          <label className="field-label">Max Credits</label>
                          <input
                            type="number"
                            className="field-input"
                            value={(rule as any).maxCredits ?? ''}
                            onChange={e => updateRule(rule.id, 'maxCredits', e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="Optional"
                          />
                        </div>

                        <div className="field-group">
                          <label className="field-label">Priority</label>
                          <input
                            type="number"
                            className="field-input"
                            value={(rule as any).priority || 100}
                            onChange={e => updateRule(rule.id, 'priority', Number(e.target.value))}
                            placeholder="100"
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: '1rem' }}>
                        <div className="field-group">
                          <label className="field-label">Tags (comma-separated)</label>
                          <input
                            type="text"
                            className="field-input"
                            value={(rule as any).tags?.join(', ') || ''}
                            onChange={e => updateRule(rule.id, 'tags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                            placeholder="e.g., Core, Elective, Math"
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: '1rem' }}>
                        <div className="field-group">
                          <label className="field-label">Course Names (comma-separated)</label>
                          <input
                            type="text"
                            className="field-input"
                            value={(rule as any).courseNames?.join(', ') || ''}
                            onChange={e => updateRule(rule.id, 'courseNames', e.target.value.split(',').map(c => c.trim()).filter(c => c))}
                            placeholder="e.g., MATH 101, PHYS 201"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Add Buttons */}
      <div className="add-slot-buttons">
        <div className="add-buttons-row">
          <button onClick={addRequired} className="btn-add">
            + Add Required Course
          </button>
          <button onClick={() => addElective('Core Elective', 25)} className="btn-add">
            + Add Core Elective
          </button>
          <button onClick={() => addElective('General Elective', 75)} className="btn-add">
            + Add General Elective
          </button>
          <button onClick={() => addElective('Free Elective', 90)} className="btn-add">
            + Add Free Elective
          </button>
          <button onClick={addRule} className="btn-add">
            + Add Credit Rule
          </button>
        </div>
      </div>

      {/* Sticky Save Button */}
      {(data.slots.length > 0 || data.rules.length > 0) && (
        <div className="save-section">
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="save-button"
          >
            {saving ? 'Saving Criteria...' : 'Save All Changes'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CriteriaManager;