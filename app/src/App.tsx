import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { PersonaPicker } from './session/PersonaPicker'
import { useSession } from './session/session'
import { Guard, ScopeNotice } from './session/Guard'
import { homePathFor } from './session/roles'
import { StudentView } from './views/StudentView'
import { FamilyView } from './views/FamilyView'
import { TeacherView } from './views/TeacherView'
import { SectionView } from './views/SectionView'
import { SchoolView } from './views/SchoolView'
import { DistrictView } from './views/DistrictView'
import { CommunityView } from './views/CommunityView'
import { DesignView } from './views/DesignView'
import { ResearchView } from './views/ResearchView'
import { AS_OF_LABEL } from './lib/dataset'
import { Loading } from './ui/primitives'
import { SupernovaMark, ThemeToggle } from './ui/ThemeToggle'
import './ui/theme.css'
import './ui/app.css'

function Header() {
  const { session } = useSession()
  const navigate = useNavigate()

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <button
          type="button"
          className="wordmark"
          onClick={() => session && navigate(homePathFor(session))}
        >
          <SupernovaMark />
          <span className="wordmark-text">
            <span className="wordmark-name">Supernova</span>
            <span className="wordmark-sub">Constellation Area School District</span>
          </span>
        </button>

        <div className="row">
          <span className="as-of subtle" title="Nothing in this dataset is dated later">
            as of {AS_OF_LABEL}
          </span>
          <ThemeToggle />
          <PersonaPicker />
        </div>
      </div>
    </header>
  )
}

function HomeRedirect() {
  const { session, loading } = useSession()
  if (loading || !session) {
    return (
      <div className="page">
        <Loading what="accounts" />
      </div>
    )
  }
  return <Navigate to={homePathFor(session)} replace />
}

export default function App() {
  return (
    <>
      <Header />
      <main>
        <ScopeNotice />

        {/* Every route is wrapped. A view that decides for itself whether the
            viewer belongs there is a view that will be written without the
            check one day; the boundary is one place, and it is here. */}
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route
            path="/student/:studentId"
            element={
              <Guard route="student">
                <StudentView />
              </Guard>
            }
          />
          <Route
            path="/family"
            element={
              <Guard route="family">
                <FamilyView />
              </Guard>
            }
          />
          <Route
            path="/teacher"
            element={
              <Guard route="classrooms">
                <TeacherView />
              </Guard>
            }
          />
          <Route
            path="/section/:sectionId"
            element={
              <Guard route="section">
                <SectionView />
              </Guard>
            }
          />
          <Route
            path="/school/:schoolId"
            element={
              <Guard route="school">
                <SchoolView />
              </Guard>
            }
          />
          <Route
            path="/district"
            element={
              <Guard route="district">
                <DistrictView />
              </Guard>
            }
          />
          <Route
            path="/community"
            element={
              <Guard route="public">
                <CommunityView />
              </Guard>
            }
          />
          {/* Outside the guard, and deliberately. It holds no district data —
              only the visual language the data is drawn in — so there is nothing
              here to scope to an account, and a design system every role can open
              is one that gets looked at. */}
          <Route path="/design" element={<DesignView />} />
          {/* Also outside the guard, and for a stronger reason than /design's.
              The library is published research plus the rules for showing it, so
              there is no district record in it to scope — and the addendum's
              case for storing citations as records was that the sourcing would
              be auditable, which is not true of an audit only insiders can open. */}
          <Route path="/research" element={<ResearchView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}
