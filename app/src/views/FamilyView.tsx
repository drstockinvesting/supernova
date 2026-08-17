/**
 * A parent or guardian's view of their own children.
 *
 * The same profile screen the school sees, narrowed by the account's actual
 * permissions. A guardian assignment carries `view_individual_students`,
 * `view_student_names`, `view_attendance_detail`, and `view_evidence_artifacts` —
 * and deliberately not behaviour, health, or special services. Those layers are
 * therefore absent here rather than empty, which is the point: what a family sees
 * is a decision the data records, not an accident of what was built.
 *
 * `hasEducationalRights` is per-link rather than per-guardian, because custody is
 * frequently asymmetric. A guardian without rights on a child sees that child not
 * at all — 60 of the district's guardians are in exactly that position.
 */

import { useEffect, useMemo, useState } from 'react'
import { loadGuardians, loadStudentIndex } from '../data/client'
import { useAsync } from '../data/useAsync'
import { useSession } from '../session/session'
import { ErrorState, Loading, Notice } from '../ui/primitives'
import { gradeLabel } from '../lib/dataset'
import { StudentProfileScreen } from './StudentView'

export function FamilyView() {
  const { session } = useSession()
  const guardiansState = useAsync(loadGuardians, [])
  const studentsState = useAsync(loadStudentIndex, [])
  const [activeChild, setActiveChild] = useState<string | null>(null)

  const guardian = useMemo(() => {
    if (!session || !guardiansState.value) return null
    return guardiansState.value.find((entry) => entry.id === session.user.principalId) ?? null
  }, [session, guardiansState.value])

  const children = useMemo(() => {
    if (!guardian || !studentsState.value) return []
    return guardian.studentLinks
      .filter((link) => link.hasEducationalRights)
      .map((link) => studentsState.value!.get(link.studentId))
      .filter((student): student is NonNullable<typeof student> => Boolean(student))
  }, [guardian, studentsState.value])

  useEffect(() => {
    if (!activeChild && children.length > 0) setActiveChild(children[0].id)
  }, [activeChild, children])

  if (guardiansState.status === 'error') {
    return (
      <div className="page">
        <ErrorState error={guardiansState.error} />
      </div>
    )
  }

  if (!session || !guardian) {
    return (
      <div className="page">
        <Loading what="family record" />
      </div>
    )
  }

  const withheld = guardian.studentLinks.filter((link) => !link.hasEducationalRights)

  if (children.length === 0) {
    return (
      <div className="page stack">
        <h1>Family</h1>
        <Notice tone="caution">
          This account is not currently recorded as holding educational rights for any
          student, so no student record is shown. If that is wrong, the school office
          maintains custody records.
        </Notice>
      </div>
    )
  }

  return (
    <div className="stack">
      {children.length > 1 ? (
        <div className="child-switch">
          <div className="page child-switch-inner">
            <span className="eyebrow">Your children</span>
            <div className="row">
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  className="button"
                  data-active={child.id === activeChild}
                  onClick={() => setActiveChild(child.id)}
                >
                  {child.firstName} {child.lastName}
                  <span className="subtle">{gradeLabel(child.currentGradeLevel)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeChild ? (
        <StudentProfileScreen studentId={activeChild} audience="family" />
      ) : (
        <div className="page">
          <Loading what="student profile" />
        </div>
      )}

      {withheld.length > 0 ? (
        <div className="page">
          <Notice>
            {withheld.length} additional student {withheld.length === 1 ? 'record is' : 'records are'}{' '}
            linked to this account without educational rights, and {withheld.length === 1 ? 'is' : 'are'}{' '}
            not shown.
          </Notice>
        </div>
      ) : null}
    </div>
  )
}
