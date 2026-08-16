# Supernova LMS: UI and UX Design

## Overview

This document outlines the user interface and user experience design for Supernova's community member and administrator dashboards. These interfaces embody the core principle of permission-aware drill-down: each stakeholder sees only what is relevant and permitted, but can descend to finer detail within their scope.

---

## Core UI/UX Principles

1. **Unified Login, Role-Based Adaptation** – Single login portal; the dashboard adapts based on user permissions
2. **Permission-Aware Drill-Down** – Users can only descend as far as their role permits
3. **Consistent Visual Language** – Same patterns repeat across all zoom levels and dashboards
4. **Context-Rich Dashboards** – Data layers (attendance, behavior, participation, interruptions) visible alongside mastery outcomes
5. **Narrative Storytelling** – Raw numbers are paired with research-backed context and analysis
6. **Minimal Friction** – Data flows automatically; no additional entry required from users
7. **Operational Clarity** – Primary view shows what matters most for that role's daily decisions

---

## Community Member Dashboard

### Purpose
Enable community transparency and engagement without compromising individual student privacy. Community members see school-level achievement trends and aggregate performance data.

### Entry Point and Primary View

**Header/Navigation:**
- School name and logo
- Current school year (e.g., "2024-2025")
- "Community" badge indicating user role
- Option to switch to a different school (if multi-school district)

**Hero Section:**
A welcoming narrative framing the school's performance. Example:
"[School Name] is focused on building mastery across all subjects and grade levels. Here's how we're doing."

**Mastery Overview Cards** (Below Hero)

Arranged by subject. Each card shows:
- Subject name (Math, ELA, Science, Social Studies, Arts, PE)
- Percentage of students across all grades demonstrating mastery
- Trend arrow (up, down, stable) showing year-over-year change
- Quick narrative: "Seventy-eight percent of students have demonstrated mastery in mathematics, up from seventy-two percent last year"

Clicking a subject card drills down to grade-level breakdown (see Drill-Down section).

**Attendance Snapshot**

A simple metric showing school-wide attendance this week:
- "Attendance This Week: 95.2%"
- Aggregated absence count: "142 total absences recorded this week"
- Trend sparkline showing attendance stability over past month
- Context: "Research shows consistent attendance is one of the strongest predictors of mastery growth"

**Achievement Milestones** (Optional)

A timeline or progress indicator showing recent achievements:
- "All eighth graders have now demonstrated mastery in linear equations"
- "Seventy-five percent of kindergarten students have met foundational literacy benchmarks"
- Dates and brief narrative for each milestone

### Drill-Down: Grade-Level Mastery Breakdown

Clicking into a subject (e.g., Mathematics) reveals:

**Grade-Level Grid** showing each grade and its mastery rate:
- Kindergarten: 82% mastery
- First Grade: 79% mastery
- Second Grade: 85% mastery
- (etc. through 12th grade)

**Visual:** Color-coded (green for high mastery, yellow for moderate, orange for developing) with no student names or identifying details.

**Narrative Context:**
"Upper elementary (grades 2-4) shows strong mastery in foundational numeracy skills. Middle school (grades 6-8) is still building toward proficiency in algebraic reasoning. This is consistent with research on skill progression."

**Ability to Return to Subject Overview or Home**

---

## Administrator Dashboard

### Purpose
Provide building or district leaders with operational clarity on mastery outcomes, attendance, behavior, and other contextual factors. Admins support teachers through data-informed decision-making.

### Permission Levels

**Building-Level Administrator:**
- Sees all classrooms within their building
- Can compare across teachers and grade levels within building
- Cannot see into other buildings' classrooms
- Can see individual student names and data for their own building

**District-Level Administrator:**
- Sees all buildings, all classrooms, all grade levels in district
- Can compare across buildings and grades
- Can drill into any classroom or building
- Can see individual student names and data across district

### Entry Point and Primary View (Building-Level)

**Header/Navigation:**
- Administrator name
- "Building Administrator" badge
- Building name and current school year
- Quick-access filters: "All Grades" or specific grade selection

**Classroom Grid/List View**

Each classroom card displays:

```
[Teacher Name] - [Grade] [Subject]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pacing: 73% (on track)
Current Unit Mastery: 68%
Class Attendance: 94%
Interruptions This Unit: 2
⚠ 3 students with >10% absences
⚠ 2 students with behavior concerns
```

**Visual Design:** Cards use color coding (green for healthy indicators, yellow for caution, red for concerns). Clicking any card opens the detailed classroom view.

**Bulk Metrics at Top:**
- Building-wide mastery rate
- Building-wide attendance rate
- Average interruptions per classroom
- Trend indicators (improving, stable, declining)

**Research Context Below:**
"Research shows schools with attendance rates above ninety-five percent demonstrate measurably higher mastery growth rates."

### Drill-Down: Individual Classroom View

Clicking into a classroom reveals a comprehensive context dashboard:

**Header:**
Teacher name, grade, subject, current unit, date range (marking period or unit window)

**Mastery Outcome Section:**
- Overall mastery rate for active unit (e.g., "68% of students have demonstrated mastery")
- Progress bar showing pacing against curriculum standard ("73% through unit, 50% through time period")
- Trend from previous unit/year (if available)

**Context Layers** (All visible on same screen, not hidden in tabs):

**Attendance:**
- Class attendance rate this marking period
- Number of chronically absent students (>10% absences)
- Absences by date aligned with instructional timeline
- **Visual correlation:** Highlight dates when critical instruction occurred alongside absence data
- **Narrative:** "Three students missed the Unit 2 introduction on September 14th, which may explain their slower mastery development"

**Behavior:**
- Number of discipline referrals during this unit window
- Behavioral incidents by date
- Any students with multiple incidents during critical instruction windows
- **Narrative:** "Two behavioral incidents occurred during week three's key instruction. This may have disrupted class flow."

**Participation and Homework:**
- Homework completion rate during unit
- Classroom participation tracking (if available)
- Trend showing if completion dropped at any point during unit
- **Narrative:** "Homework completion dropped from 88% to 74% after the October 15th assembly, correlating with a slower mastery pace"

**Interruptions:**
- Total interruptions during this unit window
- Calendar of which interruptions occurred when (assemblies, schedule changes, etc.)
- Time lost to unplanned interruptions (teacher-logged)
- **Narrative:** "This class experienced four unplanned interruptions this unit (bell schedule changes, assembly pull-outs), totaling approximately two hours of lost instruction time"

**Analytics Summary Section:**

A narrative paragraph synthesizing all layers:

"This classroom is at 68% mastery with three weeks remaining in the marking period. Pacing is slightly ahead (73% content covered with 50% of time used). However, three students were absent during critical instruction, two behavioral incidents disrupted the flow during week three, and interruptions cost approximately two hours of instructional time. These factors explain the mastery level relative to the class's capability. Recommended actions: reteach Unit 2 content to absent students, monitor behavior concerns, and advocate for protecting instructional blocks from interruptions."

**Individual Student Grid Below Analytics:**

Small cards for each student showing:
- Student name
- Current mastery status (percentage or "mastered/not yet mastered")
- Attendance flag (if relevant)
- Behavior flag (if relevant)
- Clicking a student card opens their individual profile (see below)

### Drill-Down: Individual Student Profile

Clicking a student opens their detailed view:

**Student Header:**
Name, grade, ID, current class, enrollment status

**Mastery Constellation (Visual Map):**
Shows current year skills, organized by marking period or unit
- Dark areas: skills not yet mastered
- Lit areas: skills demonstrated
- Color or indicator showing evidence strength (insubstantial, moderate, substantial)

**Evidence for Current Unit:**
List of evidence artifacts supporting current mastery claims
- Assessment results
- Assignment submissions
- Observation notes
- Student artifacts or work samples
- Data source and date for each

**Context Overlay:**
- Absences this marking period
- Behavior incidents (if any)
- Homework completion rate
- Participation notes

**Longitudinal Constellation (Optional):**
Ability to zoom out and see previous school years
- Shows bright spots from prior grades
- Identifies dark spots that may explain current gaps
- "Student had no evidence of mastery in fractions in third grade; currently rebuilding that skill in fourth grade"

**Action Items:**
- Links to evidence artifacts
- Option to add notes or interventions
- Log evidence manually if pulling from non-integrated source

### Entry Point and Primary View (District-Level)

**District Dashboard Overview**

**Header:**
- Administrator name
- "District Administrator" badge
- District name
- Current school year
- Filters: "All Schools" or specific school selection

**Building-Level Grid:**

Each building card shows:
```
[Building Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Grade Levels: K-5
District Mastery Rate: 74%
Building Mastery Rate: 71%
Attendance: 93.8%
Interruptions Trend: Stable
```

**District-Wide Metrics at Top:**
- Overall mastery rate by grade and subject
- District attendance rate
- Trend indicators
- Comparative analysis (which grades/subjects strong, which need support)

**Research Context:**
Context explaining district-wide patterns and research-backed interpretation

### Drill-Down from District: Building View

Same structure as building admin's primary view—classroom grid, bulk metrics, research context.

### Drill-Down from District: Classroom and Student Views

Same as described above (individual classroom and student views).

---

## Common Navigation and Interaction Patterns

### Consistent Drill-Down Behavior

At any level, clicking deeper follows this pattern:
1. User clicks into specific item (subject, grade, classroom, student)
2. Interface shows full detail view for that item
3. Context layers (attendance, behavior, interruptions) remain visible alongside primary data
4. Breadcrumb or "back" button allows returning to previous view
5. User stays in same visual language and layout—no jarring interface changes

### Research Context Layer

At every dashboard view, research-backed context is paired with data:
- "Research shows students who miss 10% of school year typically perform one letter grade lower"
- "Behavioral interruptions during critical instruction windows show strong correlation with reduced mastery growth"
- "Schools with attendance rates above 95% demonstrate measurably higher mastery rates"

Context is brief, actionable, and grounded in educational research.

### Data Correlated Automatically

The system's analytics engine identifies and surfaces correlations:
- Low mastery + High absences during key instruction window = flagged automatically
- Behavior incident during instruction + Slower mastery on that topic = visible in narrative
- Interruptions + Pacing slowdown = connected in analytics summary

Admin doesn't have to manually piece together the story; the system tells it.

### Permission Boundaries Invisible

Users don't see "access denied" messages. Instead:
- Community member sees aggregates, no option to click into individual students
- Building admin sees their building, no visible "other buildings" to unlock
- District admin sees everything within their district, district boundaries are natural endpoint

Permission enforcement is silent and seamless.

---

## Visual Design Principles

1. **Color Coding for Status:**
   - Green: Healthy, on-track, strong performance
   - Yellow: Caution, needs attention, slightly behind
   - Orange: Concerning, intervention needed
   - Red: Critical, immediate action required
   - Gray: Neutral data or historical

2. **Cards and Grids:**
   - Information organized in scannable cards
   - Cards show primary metric at top, secondary context below
   - Grid layout allows quick visual comparison across items

3. **Narrative Integration:**
   - Every dashboard includes a prose paragraph contextualizing the data
   - Not just numbers, but story and meaning
   - Research-backed explanation of what data signifies

4. **Minimal Clutter:**
   - Primary view shows operational essentials only
   - Secondary or historical info accessible via drill-down
   - No wasted space or decorative elements

5. **Consistent Across Scales:**
   - Same layout structure at community, admin, classroom, and student levels
   - Learn the interface once, apply everywhere
   - Zoom in and out while maintaining visual coherence

---

## Data Visibility and Privacy

### Community Member Dashboard
- School-level aggregates only
- No individual student names
- No classroom or teacher identifiers
- Grade-level trends visible
- Subject-level performance visible

### Administrator Dashboards
- Building or district-level context determines visibility
- Building admin sees their building in full, not other buildings
- Individual student names visible to admins
- Permission to see context layers (attendance, behavior) based on role
- No public-facing student data

### Research Context
- Same research citations visible to all roles
- Contextualizes findings without exposing individual data
- Helps stakeholders understand *why* data matters

---

## Next Steps for Prototyping

1. Wireframe the community member dashboard primary view and drill-down
2. Wireframe the administrator primary view (building-level grid)
3. Wireframe the detailed classroom context view with all layers visible
4. Define color scheme and visual design language
5. Create interactive prototype or high-fidelity mockup
6. Test with real users from each stakeholder group
