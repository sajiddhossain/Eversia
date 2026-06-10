# Student Dashboard Redesign

## Bug Fix
- [x] Fix `ActivityCatalog` filtering: change `a.turn_id === turnId` → `a.turn_ids?.includes(turnId)`
- [x] Fix available-only filter: replaced with proper per-turn logic
- [x] Fix Invalid Date display in turn headers

## Redesign – Google Form-Style Assembly View
- [x] Redesign the AssemblyView as a vertical, step-by-step form flow (one turn = one "section")
- [x] Each turn section shows activities as selectable radio-style cards
- [x] Auto-confirm when only 1 activity exists for a turn (notice shown)
- [x] Add a final review/confirm step at the bottom
- [x] Add progress stepper showing completion across turns
- [x] Simplify `SummaryCard` into a compact progress header
- [x] Simplify `DashboardHeader` — cleaner, minimal sticky header

## Polish
- [x] Add smooth transitions between form sections
- [x] Mobile-first responsive layout
- [x] Keep all existing handlers: book, swap, finalize, reset, unlock, share
- [x] Reimplement graphical timeline (connecting line) in `TimelineView` while keeping fixes
- [x] Handle activity discrepancies (gatecrashing) in `TimelineView`
    - [x] Detect if `actual_location[turnId].activity_id` differs from `scheduled_turns[turnId]`
    - [x] Show an "Imprevisto" or "Attività Diversa" badge
    - [x] Link to the actually attended activity details
- [x] Align AssemblyView style with GlobalHome (Mission Control)
    - [x] Update background gradients and blur blobs
    - [x] Apply premium typography (font-black, italic, uppercase)
    - [x] Update card styles (rounded-3xl, glassmorphism borders)
    - [x] Synchronize accent colors with `brand-lime`
- [ ] Security & DDoS Protection
    - [ ] Review security advisory
    - [ ] Implement Firebase App Check (reCAPTCHA Enterprise)
    - [ ] Tighten Firestore Security Rules for public collections
- [x] Fix "Invalid Date" bug (AgendaList & StudentDashboard)
    - [x] Support & FAQ Widget (Global Home)
    - [x] Create `SupportWidget.tsx` component
    - [x] Add FAQ content and contact info
    - [x] Integrate into `StudentDashboard.tsx`
- [ ] Security & DDoS Protection
    - [ ] Review security advisory
    - [ ] Implement Firebase App Check (reCAPTCHA Enterprise)
    - [ ] Tighten Firestore Security Rules for public collections
- [x] Fix "Invalid Date" bug (AgendaList & StudentDashboard)
    - [x] Combine `assembly.date` with `turn_schedules` in AgendaList
    - [x] Fix `turnTimestamps` logic in StudentDashboard.tsx
- [x] Improve AgendaList details (GlobalHome)
    - [x] Add time slots (fascia oraria) from `turn_schedules`
    - [x] Refine location display (room_name / location_name)
    - [x] Align with Mission Control styling

## Verification
- [x] Visual browser test: open the student dashboard with an assembly selected
- [x] Verify activities appear grouped by turn
- [x] Verify guest login prompt works
- [/] Verify booking/swapping with logged-in user (requires auth)
