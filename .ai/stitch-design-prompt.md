# Prompt do Google Stitch - Parinator

Use the attached files as the source of truth:
- `.ai/prd.md`
- `overall-description.md`

Your task is to generate a complete UI/UX design proposal for a web application called "Parinator", based strictly on those documents and the additional constraints below.

Do not ask clarifying questions. If something is missing, make the safest MVP assumption and label it clearly as an assumption.

## 1) Product context
Parinator supports team pairings in Warhammer 40k tournaments.
Two primary roles:
- Player: provides matchup estimations, first-turn impact, table preferences, optional short comment.
- Captain: configures tournament/rounds, runs pairing simulator and live pairing, enters results.

MVP constraints:
- Web app only.
- Interface language: English.
- Pilot mode with fixed accounts (1 captain + 5 players).
- All MVP features are P0.
- Estimation flow must be online.
- Captain pairing flow must support offline-first with local priority sync.
- Pairing process follows WTC logic for a 5-player team.

## 2) Design goals
Design for speed, clarity, and low cognitive load under time pressure.
Prioritize:
1. Fast player estimation input.
2. Captain visibility over the full pairing state.
3. Reliable action flow during live pairing (<= 30 min target).
4. Clear color + label readability (labels always visible on/with color chips).

## 3) Visual direction
Create a modern, practical, tournament-ops style UI.

Style guidance:
- Functional, dense-but-readable layout.
- Clear hierarchy, compact spacing where needed.
- Strong contrast and accessibility-first text readability.
- Minimal decorative elements.
- Emphasize status and action over branding.

Color system:
- Keep dedicated estimation color scales with always-visible numeric labels.
- Include both:
  - Player estimation scale:
    - Red 0-4
    - Orange 5-9
    - Yellow 8-10
    - Green 11-15
    - Dark Green 15-20
    - Purple 0-20 (flip/high variance)
  - Captain estimator tiles:
    - 0-2 black
    - 2-4 red
    - 5-8 orange
    - 9-11 yellow
    - 12-14 green
    - 15-17 light green
    - 17-20 light blue

Typography:
- Highly legible sans-serif.
- Distinct heading/body/label styles.
- Compact tabular readability for dense matrix view.

## 4) Required UX architecture
Produce information architecture and key flows for:

### A. Player area (mobile-first, portrait priority)
1. Active tournaments dashboard.
2. Tournament dashboard with round completion states.
3. Round view: mission, deployment, opponent list.
4. Estimation flow view:
   - open opponent list first (required),
   - first-turn relevance decision,
   - one or two estimation values,
   - table relevance decision,
   - table preference selection (preferred/neutral/non-preferred),
   - optional comment (max 200 chars).
5. Player profile (email only for MVP).

### B. Captain area (landscape/tablet+ priority)
1. Main pairing table (always visible matrix).
2. Cell details modal:
   - table preferences,
   - "tables not relevant" state,
   - optional player comment.
3. Pairing simulator wizard:
   - defender selection,
   - attacker options,
   - opponent defender,
   - own offers,
   - final pair confirmation,
   - table assignment before final confirmation.
4. Live pairing mode:
   - editable until final close,
   - locked after final close (MVP, no unlock).
5. Estimator tile view with timestamp tile and random tile reshuffle on each click.
6. Final pairing summary + manual game result input (captain-only).

### C. Setup/admin flow (captain)
1. Tournament import by URL (ChampionsHub / Best Coast Pairings).
2. Fallback manual roster paste on scraping failure.
3. Round configuration (mission, deployment, tables, optional opponent team).
4. Join code lifecycle:
   - generate after setup,
   - invalidate when roster full,
   - regenerate new code after player removal with remaining slots limit.

## 5) Responsive behavior requirements
- Player estimation views: mobile-first portrait.
- Captain matrix/simulator/live: landscape-first, optimized for tablet and desktop.
- Ensure graceful behavior at:
  - 390x844 (mobile),
  - 1024x768 (tablet landscape),
  - 1440x900 (desktop).

## 6) Critical edge cases to cover in design
- No internet during player estimation -> save blocked with explicit message.
- No internet during captain pairing -> local save mode indicator + sync pending state.
- Sync restored -> local data overwrites server, then local queue clears.
- Round opponent team changed -> all estimations/comments for round reset warning + confirmation UX.
- Empty states:
  - no active tournaments,
  - no imported rosters yet,
  - no simulations yet.
- Invalid/expired join code and full team states.
- Locked live pairing state after final confirmation.

## 7) Security and access UX (pilot MVP)
- Role-gated navigation and screens:
  - player cannot access captain tools.
  - captain has both captain and player-accessible contexts if needed.
- Simple auth UX for 6-digit PIN login.
- Keep UX simple but include clear session/auth error states.

## 8) Output format expected from you
Generate:
1. Design system proposal:
   - color tokens,
   - typography scale,
   - spacing scale,
   - component primitives.
2. Screen inventory with purpose of each screen.
3. Detailed wireframe-level layouts for all required MVP screens.
4. High-fidelity style direction for key screens.
5. Interaction notes for critical flows and edge cases.
6. Component list (buttons, chips, matrix cells, modals, tiles, status badges, banners, toasts).
7. Microcopy samples in English for:
   - errors,
   - confirmations,
   - offline/sync states,
   - destructive reset warning.

## 9) Quality bar
- Every screen must have clear primary action.
- Matrix and color semantics must be instantly readable.
- Avoid unnecessary gamification visuals.
- Optimize for real tournament stress and speed.
- Keep implementation realistic for MVP by 1 developer + AI.

If any requirement conflicts, prioritize:
1. PRD (`.ai/prd.md`)
2. `overall-description.md`
3. This prompt
