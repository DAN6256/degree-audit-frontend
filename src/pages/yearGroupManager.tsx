import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { listYearGroups, upsertYearGroup, listPrograms, upsertProgram } from '../api';
import { ProgramMeta, YearGroupSummary } from '../types';
import { Link } from 'react-router-dom';
import './YearGroupManager.css';

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
    <div className="ygContainer">
      <h2 className="ygTitle">Year Groups & Programs</h2>

      {msg && <div className="ygMsg">{msg}</div>}

      <div className="ygGrid">
        {/* Left: Year groups */}
        <div className="panel">
          <h3 className="panelTitle">Year Groups</h3>

          <div className="inlineForm">
            <input
              className="textInput"
              type="number"
              value={ygInput}
              onChange={(e) => setYgInput(parseInt(e.target.value, 10))}
              placeholder="e.g., 2026"
            />
            <button className="btn btnPrimary" onClick={handleCreateYG}>Save Year Group</button>
          </div>

          <ul className="ygList">
            {items.map(i => (
              <li key={i.yearGroup} className="ygListItem">
                <button
                  className={`ygChip ${selectedYG === i.yearGroup ? 'isActive' : ''}`}
                  onClick={() => setSelectedYG(i.yearGroup)}
                >
                  {i.yearGroup}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Programs */}
        <div className="panel">
          <h3 className="panelTitle">
            Programs {selectedItem ? `for ${selectedItem.yearGroup}` : ''}
          </h3>

          {selectedYG != null && (
            <>
              <div className="inlineForm">
                <input
                  className="textInput grow"
                  type="text"
                  placeholder="Program display name (must match Excel Program)"
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                />
                <select
                  className="selectInput"
                  value={progPass}
                  onChange={(e) => setProgPass(e.target.value)}
                >
                  {['A+','A','B+','B','C+','C','D+','D','E'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <button className="btn btnSecondary" onClick={handleAddProgram}>Add Program</button>
              </div>

              <div className="tableWrap">
                <table className="ygTable">
                  <thead>
                    <tr>
                      <th className="th">Program</th>
                      <th className="th">Default Pass</th>
                      <th className="th">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map(p => (
                      <tr key={p.displayName}>
                        <td className="td">{p.displayName}</td>
                        <td className="td">{p.defaultPassGrade || 'D'}</td>
                        <td className="td">
                          <Link
                            className="tableLink"
                            to={`/criteria?yearGroup=${selectedYG}&program=${encodeURIComponent(p.displayName)}`}
                          >
                            Open Criteria
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {programs.length === 0 && (
                      <tr>
                        <td className="td tdEmpty" colSpan={3}>No programs yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default YearGroupManager;
