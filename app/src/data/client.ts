/**
 * Reads the generated dataset over HTTP.
 *
 * `emit.py` shards the data deliberately: reference and district files are read
 * once and shared by every view, while student profiles are one file each so a
 * profile can be fetched without parsing the district. This client honours that
 * split — small files load eagerly and stay cached for the session; profiles and
 * their evidence companions load on demand, per student.
 *
 * The cache stores the in-flight promise rather than the resolved value, so two
 * components asking for the same file during the same render produce one request.
 */

import type {
  CurriculumUnit,
  Guardian,
  InterruptionRecord,
  ResearchCitation,
  Section,
  Staff,
  Standard,
  Student,
  User,
} from '../types/supernova'
import type {
  Aggregates,
  EvidenceFile,
  Manifest,
  School,
  SchoolCalendar,
  StudentProfile,
} from '../types/profile'

const DATA_ROOT = '/data'

const cache = new Map<string, Promise<unknown>>()

export class DataError extends Error {
  readonly path: string
  readonly status: number

  constructor(path: string, status: number) {
    super(`Could not load ${path} (HTTP ${status})`)
    this.name = 'DataError'
    this.path = path
    this.status = status
  }
}

function loadJson<T>(path: string): Promise<T> {
  const existing = cache.get(path)
  if (existing) return existing as Promise<T>

  const request = fetch(`${DATA_ROOT}${path}`).then((response) => {
    if (!response.ok) {
      // Drop the failure so a retry can succeed rather than replaying the error.
      cache.delete(path)
      throw new DataError(path, response.status)
    }
    return response.json()
  })

  cache.set(path, request)
  return request as Promise<T>
}

// --- Reference and district -------------------------------------------------

export const loadManifest = () => loadJson<Manifest>('/manifest.json')
export const loadAggregates = () => loadJson<Aggregates>('/aggregates/current-year.json')
export const loadSchools = () => loadJson<School[]>('/district/schools.json')
export const loadStudents = () => loadJson<Student[]>('/district/students.json')
export const loadStaff = () => loadJson<Staff[]>('/district/staff.json')
export const loadSections = () => loadJson<Section[]>('/district/sections.json')
export const loadGuardians = () => loadJson<Guardian[]>('/district/guardians.json')
export const loadUsers = () => loadJson<User[]>('/district/users.json')
export const loadCalendars = () => loadJson<SchoolCalendar[]>('/reference/calendars.json')
export const loadCurriculumUnits = () => loadJson<CurriculumUnit[]>('/district/curriculum-units.json')
export const loadInterruptions = () => loadJson<InterruptionRecord[]>('/district/interruptions.json')

export const loadDistrict = () =>
  loadJson<{
    id: string
    name: string
    state: string
    superintendent: string
    schools: string[]
    configuration: { dataSourcesConnected: string[]; standardsFrameworksInUse: string[] }
  }>('/district/district.json')

export const loadStandards = () =>
  loadJson<{ frameworks: unknown[]; standards: Standard[] }>('/reference/standards.json')

export const loadResearchCitations = () =>
  loadJson<{ reviewWarning: string; citations: ResearchCitation[] }>(
    '/reference/research-citations.json',
  )

// --- Students ---------------------------------------------------------------

export const loadStudentProfile = (schoolId: string, studentId: string) =>
  loadJson<StudentProfile>(`/students/${schoolId}/${studentId}.json`)

/**
 * Evidence artifacts are about three quarters of a student's data and are only
 * needed when someone opens a specific standard, so they are never fetched with
 * the profile. A student with no artifacts has no companion file at all — that is
 * a legitimate 404 and resolves to an empty record rather than an error.
 */
export const loadStudentEvidence = (schoolId: string, studentId: string) =>
  loadJson<EvidenceFile>(`/students/${schoolId}/${studentId}.evidence.json`).catch(
    (error: unknown): EvidenceFile => {
      if (error instanceof DataError && error.status === 404) {
        return { studentId, evidenceByYear: {} }
      }
      throw error
    },
  )

// --- Derived indexes --------------------------------------------------------

/** Student id -> record, so a route parameter can resolve to a school directory. */
export async function loadStudentIndex(): Promise<Map<string, Student>> {
  const students = await loadStudents()
  return new Map(students.map((student) => [student.id, student]))
}

export async function loadStandardIndex(): Promise<Map<string, Standard>> {
  const { standards } = await loadStandards()
  return new Map(standards.map((standard) => [standard.id, standard]))
}

export async function loadStaffIndex(): Promise<Map<string, Staff>> {
  const staff = await loadStaff()
  return new Map(staff.map((member) => [member.id, member]))
}

export async function loadSchoolIndex(): Promise<Map<string, School>> {
  const schools = await loadSchools()
  return new Map(schools.map((school) => [school.id, school]))
}

export async function loadCalendar(
  schoolId: string,
  schoolYear: string,
): Promise<SchoolCalendar | undefined> {
  const calendars = await loadCalendars()
  return calendars.find(
    (calendar) => calendar.schoolId === schoolId && calendar.schoolYear === schoolYear,
  )
}

/**
 * Loads a profile from a student id alone, resolving the school directory through
 * the district roster. Views hold a student id, not a file path.
 */
export async function loadProfileById(studentId: string): Promise<StudentProfile> {
  const index = await loadStudentIndex()
  const student = index.get(studentId)
  if (!student) throw new Error(`No student with id ${studentId}`)
  return loadStudentProfile(student.schoolId, studentId)
}
