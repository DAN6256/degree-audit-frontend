import axios from 'axios';
import {
  SemesterData,
  ProgramMeta,
  YearGroupSummary,
  StudentRecord,
  AuditOutcome,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

const authHeaders = (token: string | null | undefined) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {};

export async function login(email: string, password: string) {
  const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
  return res.data;
}
export async function signup(email: string, password: string, name?: string) {
  const res = await axios.post(`${API_BASE}/auth/signup`, { email, password , name});
  return res.data;
}

export async function listYearGroups(token: string | null): Promise<YearGroupSummary[]> {
  const res = await axios.get(`${API_BASE}/year-groups`, authHeaders(token));
  return res.data;
}
export async function upsertYearGroup(token: string | null, yearGroup: number) {
  const res = await axios.post(`${API_BASE}/year-groups`, { yearGroup }, authHeaders(token));
  return res.data;
}

export async function listPrograms(
  token: string | null,
  yearGroup: number
): Promise<ProgramMeta[]> {
  const res = await axios.get(`${API_BASE}/programs/${yearGroup}`, authHeaders(token));
  return res.data;
}
export async function upsertProgram(
  token: string | null,
  yearGroup: number,
  meta: ProgramMeta
) {
  const res = await axios.post(
    `${API_BASE}/programs/${yearGroup}`,
    meta,
    authHeaders(token)
  );
  return res.data;
}

export async function getSemesterData(
  token: string | null,
  yearGroup: number,
  program: string,
  semester: string
): Promise<SemesterData> {
  const res = await axios.get(
    `${API_BASE}/criteria/${yearGroup}/${encodeURIComponent(program)}/${encodeURIComponent(
      semester
    )}`,
    authHeaders(token)
  );
  return res.data;
}

export async function saveSemesterData(
  token: string | null,
  yearGroup: number,
  program: string,
  semester: string,
  data: SemesterData
) {
  const res = await axios.post(
    `${API_BASE}/criteria/${yearGroup}/${encodeURIComponent(program)}/${encodeURIComponent(
      semester
    )}`,
    data,
    authHeaders(token)
  );
  return res.data;
}

// -------- Audit ----------
export async function runAudit(
  token: string | null,
  yearGroup: number,
  semester: string,
  students: StudentRecord[]
): Promise<AuditOutcome[]> {
  const res = await axios.post(
    `${API_BASE}/audit/run`,
    { yearGroup, semester, students },
    authHeaders(token)
  );
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.results)) return res.data.results;
  return [];
}
