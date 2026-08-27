# Supernova Student Dashboard: Build Spec v1

## Reading notes for the implementing agent

Sections marked **[SPEC]** came directly from the author and are requirements.
Sections marked **[INFERRED]** are the drafting assistant's recommendations, not author decisions. Confirm before treating them as fixed.
Sections marked **[OPEN]** are unresolved and must be answered before that part is built.

---

## 1. Concept

A student-facing progress dashboard that renders a K-12 academic career as a field of galaxies. Mastery is light. Evidence of mastery illuminates the map. The emotional target is the moment a stadium light kicks on.

Three levels of zoom:

1. **Galaxy row (K-12).** Horizontal side-scroll. One galaxy per grade level, left to right, kindergarten through twelfth grade, in linear order.
2. **Galaxy interior (subjects).** Clicking a grade zooms into that galaxy. The stars inside it are the subject areas for that grade.
3. **Star system (skills).** Clicking a subject star reveals small planets orbiting it. Each planet is a skill or topic within that subject.

Evidence of mastery lights up the corresponding body. **[SPEC]**

---

## 2. Entry sequence

On load, the view scrolls quickly left to right across the galaxy row, illuminating each completed grade level in sequence, and comes to rest with the student's current grade level centered on screen. Example: an eighth grader sees K through 7 light up in a fast sweep, then eighth grade settles into center frame. A rising "loading up" sound accompanies the sweep. **[SPEC]**

**[INFERRED]** Suggested timing: 1.6 to 2.2 seconds total for the sweep, with per-grade illumination on a staggered offset so it reads as a chain reaction rather than a fade of the whole row. Ease-out on the final centering.

**Browser constraint, non-negotiable:** browsers block audio until the user has interacted with the page. The entry sweep cannot have sound on a cold load unless it is triggered by a click. Two options:

- A) Entry screen with a single "Enter" button. Click starts the sweep with full audio. **[INFERRED, recommended]**
- B) Sweep runs silently on load, audio unlocks on first click thereafter.

**[OPEN]** Which option?

---

## 3. Visual states

Every node (galaxy, star, planet) is in one of these states.

| State | Meaning | Treatment |
|---|---|---|
| Unlit | No evidence yet | Dark body, visible outline only, label text legible **[SPEC]** |
| Lit | Mastery evidence recorded | Bright, glowing, bloom halo **[SPEC]** |
| Newly lit | Mastery evidence arrived since last session | Ignites on user action with the full celebration treatment **[SPEC]** |

**[INFERRED]** Recommend adding a fourth state: **Emerging.** Partial evidence, some attempts logged but not at mastery. Rendered as a dim ember, roughly 25 to 40 percent brightness. Binary lit/unlit will misrepresent most real gradebook data, where a student is usually mid-progress on many skills at once. Confirm whether the underlying data supports a partial state.

Unlit nodes must never read as punishment. Framing should be "unexplored," not "failed." Practically this means: keep outlines and labels clearly visible, avoid red or gray-dead palettes, avoid any counter that emphasizes what is missing.

Parent nodes derive their brightness from their children. A grade galaxy's glow is a function of the proportion of lit skills inside it, so the K-12 row communicates a career trajectory at a glance. **[INFERRED]**

---

## 4. Update and celebration flow

Updates since the student's last session are surfaced as a click-driven sequence rather than an automatic animation. The student clicks, and the new illuminations fire one at a time with the full effect. **[SPEC]**

**[OPEN]** Behavioral details not yet specified:

- Does the click advance one update at a time, or fire the whole queue?
- If a student has 30 new updates, is there a cap or a batching rule?
- Where does the click live: a persistent "You have 4 new" prompt, or does the whole screen act as the advance target?
- If a newly lit skill is three levels deep, does the camera auto-fly to it, or does the student have to navigate there to collect it?

**[INFERRED]** Recommended default: a badge showing the count of new illuminations, click to advance one at a time, camera flies to each in turn, with a skip control. Auto-fly matters because otherwise the best moment in the product is hidden behind three clicks of navigation.

---

## 5. Audio

**[SPEC]**

- **Ignition:** a heavy impact, like a large stadium light striking on and flooding the space. Low-end thump plus a bright bloom of high frequency.
- **Entry sweep:** a rising "loading up" tone that builds across the K-to-current-grade illumination.

**[INFERRED]** Recommend synthesizing these with the Web Audio API rather than shipping audio files. An ignition sound is a sub-frequency sine drop (roughly 80 Hz to 40 Hz over 200 ms) layered with a filtered white-noise burst and a short reverb tail. Synthesis gives per-event pitch variation for free, which prevents the repetition fatigue that kills juice on the tenth trigger. It also keeps the bundle small and avoids sourcing licensed assets.

If sourced files are preferred instead, that asset work belongs outside this build.

**Required regardless:** a persistent mute toggle, state remembered across sessions. Also honor `prefers-reduced-motion` by cutting camera moves and particle counts while keeping illumination state changes.

---

## 6. Technical direction

**[SPEC]** This is the student-facing progress view inside the Supernova learning management system, a system the author is building. It is not a standalone toy and not an add-on to any third-party platform. It must fit the LMS's existing stack, routing, auth, and data layer.

**[OPEN]** The LMS stack is not yet documented here. Until it is, treat the stack recommendation below as a default for a greenfield build only, and defer to whatever the LMS already uses.

Recommended stack:

- **Rendering:** PixiJS (WebGL 2D) with `@pixi/filter-advanced-bloom`. Bloom is the entire aesthetic and CSS glow will not sell it. three.js with `UnrealBloomPass` is the alternative if depth and parallax between galaxy layers are wanted, at higher complexity cost.
- **Audio:** Web Audio API directly, or Howler.js if file playback is chosen.
- **State:** plain JSON in, no backend for the prototype.
- **Framework:** React shell around a Pixi canvas, or vanilla. React is only worth it if there will be substantial HUD and panel UI outside the canvas.

**[OPEN]** Is there an existing repo, stack, or design system this must fit into?

---

## 7. Data model

Data must be decoupled from rendering so a mock JSON file can later be swapped for a live source with no changes to the view layer.

```json
{
  "student": {
    "id": "string",
    "displayName": "string",
    "currentGrade": 8,
    "lastSessionAt": "ISO-8601 timestamp"
  },
  "grades": [
    {
      "gradeLevel": 0,
      "label": "Kindergarten",
      "subjects": [
        {
          "id": "string",
          "name": "Mathematics",
          "skills": [
            {
              "id": "string",
              "name": "Counting to 100",
              "standardCode": "string, optional",
              "masteryState": "unlit | emerging | lit",
              "evidenceCount": 0,
              "lastEvidenceAt": "ISO-8601 timestamp or null"
            }
          ]
        }
      ]
    }
  ]
}
```

"Newly lit" is derived, not stored: any skill where `lastEvidenceAt > student.lastSessionAt` and `masteryState` changed. **[INFERRED]**

**[OPEN]** Data source questions that must be answered before phase 3:

- What emits mastery evidence inside Supernova? Assessment submissions, teacher scoring, adaptive practice, something else?
- What defines mastery in the Supernova model? A score threshold, a count of correct attempts, a teacher confirmation, decay over time?
- Does Supernova already have a skill or standards taxonomy, and is it authored per course or global across K-12?
- Does the LMS already carry a "last session" timestamp per student, or does this view need to write its own?
- Auth and FERPA are presumably handled at the LMS level. Confirm this view inherits that and does not need its own.

---

## 8. Scope control

K-12 across all subjects is potentially thousands of skill nodes. Do not attempt the full taxonomy in the prototype.

**Phase 1: vertical slice.** One grade (eighth), two subjects, roughly eight skills each, all data mocked. Prove the three-level zoom, the illumination, the ignition sound, and the feel. This is the phase where the concept is validated or killed.

**Phase 2: full galaxy row.** All 13 grades present with generated placeholder subject and skill data. Prove the entry sweep, the horizontal scroll, and the performance ceiling. Watch frame rate here.

**Phase 3: real data.** Wire to an actual source, per section 7.

**Phase 4: polish.** Update queue, camera fly-to, mute and settings, accessibility pass.

---

## 9. Non-negotiables checklist

- Mute toggle, persistent
- `prefers-reduced-motion` support
- Keyboard navigation for all three zoom levels
- Text labels legible in unlit state
- 60 fps at the full K-12 row on mid-range hardware
- No punitive framing of unmastered skills
- Data layer swappable without touching render code
