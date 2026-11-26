import { request } from "@/api/cashierApi";

/** School structure settings (API contract rows 52–64). Dates are Y-m-d strings in Asia/Manila. */
export interface ExamPeriod {
  id: string;
  termId: string;
  name: string;
  startsOn: string;
  endsOn: string | null;
}

export interface Term {
  id: string;
  schoolYearId: string;
  name: string;
  sequence: number;
  startsOn: string | null;
  endsOn: string | null;
  examPeriods: ExamPeriod[];
}

export interface SchoolYear {
  id: string;
  label: string;
  current: boolean;
  startsOn: string;
  endsOn: string;
  /** True once a billing account exists for the year: year and term dates can no longer change. */
  datesLocked: boolean;
  archivedAt: string | null;
  terms: Term[];
}

export interface Section {
  id: string;
  gradeLevelId: string;
  name: string;
  active: boolean;
  archivedAt: string | null;
}

export interface GradeLevel {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  sections: Section[];
}

/** Request bodies use the API's snake_case field names. */
export type StructurePayload = Record<string, string | number | boolean | null>;

const id = encodeURIComponent;
export type ArchiveView = "active" | "archived";

async function send(path: string, method: "POST" | "PATCH", body: StructurePayload): Promise<void> {
  await request(path, { method, body: JSON.stringify(body) });
}

export async function listSchoolYears(view: ArchiveView = "active"): Promise<SchoolYear[]> {
  return (await request<{ data: SchoolYear[] }>(`/settings/school-years?view=${view}`)).data;
}

export async function listGradeLevels(view: ArchiveView = "active"): Promise<GradeLevel[]> {
  return (await request<{ data: GradeLevel[] }>(`/settings/grade-levels?section_view=${view}`)).data;
}

export const createSchoolYear = (body: StructurePayload) => send("/settings/school-years", "POST", body);
export const updateSchoolYear = (yearId: string, body: StructurePayload) => send(`/settings/school-years/${id(yearId)}`, "PATCH", body);
export const archiveSchoolYear = async (yearId: string): Promise<void> => { await request(`/settings/school-years/${id(yearId)}/archive`, { method: "POST" }); };
export const restoreSchoolYear = async (yearId: string): Promise<void> => { await request(`/settings/school-years/${id(yearId)}/restore`, { method: "POST" }); };
export const makeSchoolYearCurrent = (yearId: string, reason: string) => send(`/settings/school-years/${id(yearId)}/make-current`, "POST", { reason });
export const createTerm = (yearId: string, body: StructurePayload) => send(`/settings/school-years/${id(yearId)}/terms`, "POST", body);
export const updateTerm = (termId: string, body: StructurePayload) => send(`/settings/terms/${id(termId)}`, "PATCH", body);
export const createExamPeriod = (termId: string, body: StructurePayload) => send(`/settings/terms/${id(termId)}/exam-periods`, "POST", body);
export const updateExamPeriod = (periodId: string, body: StructurePayload) => send(`/settings/exam-periods/${id(periodId)}`, "PATCH", body);
export const createSection = (gradeId: string, body: StructurePayload) => send(`/settings/grade-levels/${id(gradeId)}/sections`, "POST", body);
export const updateSection = (sectionId: string, body: StructurePayload) => send(`/settings/sections/${id(sectionId)}`, "PATCH", body);
export const archiveSection = async (sectionId: string): Promise<void> => { await request(`/settings/sections/${id(sectionId)}/archive`, { method: "POST" }); };
export const restoreSection = async (sectionId: string): Promise<void> => { await request(`/settings/sections/${id(sectionId)}/restore`, { method: "POST" }); };
