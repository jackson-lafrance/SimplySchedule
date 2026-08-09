# SimplyLift style guide

A working reference for carrying SimplyLift’s product language into Simply Schedule. This guide records patterns observed in the SimplyLift reference app rather than introducing a new design system.

> **Reference basis:** SimplyLift worktree at commit `6defe59` (`meringue/create-simply-schedule-repository-68855e32`). Source citations below use `SimplyLift/...` paths so they remain recognizable from the shared workspace.

## 1. Product character and art direction

### The feeling

SimplyLift is a focused, utilitarian workout log: confident, physical, and fast to operate while exercising. The interface should feel like an instrument panel rather than a lifestyle feed.

- **Direct:** use short, imperative actions such as “Start Workout”, “Add Exercise”, “Finish”, “Save”, and “Done”.
- **High contrast:** white space and black ink establish the base; color is reserved for meaning and interaction state.
- **Structured:** heavy rules, outlined cards, compact statistics, and monospace time readouts make the data feel measured and dependable.
- **Energetic but restrained:** the branded blue icon and small semantic accents provide energy, while the in-app surfaces remain predominantly monochrome.
- **Confident:** uppercase, heavy headings and clear primary actions should make the next step obvious without explanatory decoration.

The app icon is a glossy/translucent white “A” over a vivid blue gradient and technical grid, with plus marks in the background. The product UI does not reproduce that gradient everywhere; it uses the icon as the expressive brand moment and keeps task screens disciplined. See `SimplyLift/assets/images/icon.png`, `SimplyLift/assets/expo.icon/icon.json`, and `SimplyLift/app.json`.

### Voice and content

- Prefer concise, action-first labels in sentence or title concepts, rendered in uppercase by style.
- Use gym vocabulary consistently: **workout**, **exercise**, **set**, **lbs**, **reps**, **warmup**, **failure**, **RIR**, **unilateral**.
- Explain consequences before irreversible actions: e.g. “This action cannot be undone.” (`SimplyLift/src/app/index.tsx`).
- Confirmation choices should make the safe path easy: “Keep Going” / “Give Up”, “Keep Editing” / “Discard”, “Cancel” / “Delete”.
- Errors are human-readable and actionable rather than raw Firebase messages (`SimplyLift/src/app/context/authContext.tsx`, `SimplyLift/src/app/components/authForm.tsx`).
- Avoid generic filler copy. Empty states are short and factual: “No workouts logged yet.” and “No history recorded yet.”

## 2. Visual system

### Color tokens

These are the recurring values in the reference implementation. Prefer central tokens when building Simply Schedule, but preserve the meaning and contrast of the existing values.

| Role | Value | Use |
| --- | --- | --- |
| Canvas / card | `#FFFFFF` | App background, sheets, cards, inputs |
| Primary ink | `#000000` | Text, borders, icons, primary buttons |
| Secondary text | `#8E8E93` | Dates, metadata, labels, inactive navigation |
| Pale field | `#F2F2F7` | Numeric input backgrounds, pressed list surfaces |
| Pale border / disabled | `#E5E5EA` / `#D1D1D6` | Input borders, empty-state icons, disabled controls |
| Success / positive interaction | `#34C759` | Successful/positive pressed state and the unilateral switch |
| Destructive | `#FF3B30` | Delete, quit, errors, dangerous sections |
| Dark destructive pressed | `#D70015` | Pressed swipe-delete action |
| Warm-up | `#FF9500` | Warm-up set number |
| Failure | `#FF3B30` | Failure set number |
| RIR | `#5856D6` plus `#3D1A78`–`#AAA8F7` | RIR set number, RIR control, unilateral accent |

Set colors are centralized in `SimplyLift/src/app/utils/setDisplay.ts`; the rest of the UI applies the same values locally in component styles. RIR uses a graduated purple scale: lower RIR values are darker and higher values lighter (`RIR_COLORS`). Do not use accent colors as decoration when they can communicate state instead.

### Type

- Use the platform/system sans face; no custom UI font is loaded.
- Use `fontWeight: "900"` for product and action headings, `"800"` for labels and card metadata, and `"700"` for supporting copy and editable values.
- Render product labels, screen titles, buttons, metadata, and set/exercise labels in uppercase with `textTransform: "uppercase"`.
- Use tight display tracking for large titles (`letterSpacing: -1` in `ProfileHeader`) and modest positive tracking for small all-caps labels (`letterSpacing: 1` in form labels).
- Use `fontFamily: "ui-monospace"` for elapsed time and numeric duration values so columns and time fields scan reliably (`SimplyLift/src/app/components/activeWorkout.tsx`, `SimplyLift/src/app/index.tsx`).
- Typical sizes: screen title `32`, sheet title `28–32`, exercise heading `18`, body/action `14–18`, metadata `10–14`.

### Shape, borders, and spacing

- Use white surfaces with a **2 px black border** for cards, buttons, inputs, sheets, and dialogs.
- Use an `8` px radius for everyday cards and controls; use `12` px for bottom sheets and centered alerts.
- Use a compact spacing vocabulary: `4–8` for icon/label gaps, `12–16` inside controls and rows, `20` for screen gutters, and `24` for modal/sheet padding.
- Maintain generous bottom clearance for content behind the fixed action shelf (`paddingBottom: 180` in the history and active-workout lists).
- Prefer explicit dimensions for touch affordances: tab items are at least `80` wide, shelf controls at least `60`, and icon buttons commonly `32–36` square.
- Use dashed black outlines for secondary “add” affordances such as “ADD SET” (`SimplyLift/src/app/components/exerciseCard.tsx`).

### Surfaces and interaction states

- The top and bottom “shelves” are white, separated from content by a 2 px black rule (`SimplyLift/src/app/components/profileHeader.tsx`, `SimplyLift/src/app/tabs.tsx`, `SimplyLift/src/app/components/activeWorkout.tsx`).
- Primary actions are black filled buttons with white, heavy uppercase text. Secondary actions are white with a black outline.
- A pressed primary action turns green; a pressed destructive action turns red. For non-button list items, use a pale gray pressed surface or reduced opacity.
- Disabled controls use reduced opacity rather than a new color system (`disabledButton` patterns in `authForm.tsx` and `profileHeader.tsx`).
- Icons come from `@expo/vector-icons` Material Icons and are generally black at rest, gray when inactive, and semantic color when pressed or meaningful.
- The app uses automatic system UI appearance in configuration, but the current component system is explicitly white/black rather than a full dark-mode theme (`SimplyLift/app.json`).

### Motion and layering

- Use a dim black overlay (`rgba(0, 0, 0, 0.4–0.5)`) to focus attention on a modal.
- Bottom sheets enter from below with `Animated.spring` (`tension: 60`, `friction: 12`) and close with a 200 ms `Animated.timing` transition. The common pattern appears in `index.tsx`, `exercises.tsx`, `profileHeader.tsx`, and `newExercise.tsx`.
- Use native modal fade for the modal layer, then animate the sheet content independently.
- Keep the sheet’s top corners rounded, with a 2 px black top/side outline and no bottom border when it meets the screen edge.
- Animate secondary inline prompts rather than abruptly changing layout (`clearPromptAnim` in `SimplyLift/src/app/components/profileHeader.tsx`).

## 3. UX conventions

### Global navigation and hierarchy

- The app opens into a safe-area-aware shell: profile/header shelf, current screen, then fixed action shelf (`SimplyLift/src/app/tabs.tsx`).
- The main tabs are **Home**, **Exercises**, and **Settings**, with Material Icons and all-caps labels. Active tab uses black; inactive tab uses `#8E8E93`.
- The profile control stays in the top shelf. Its sheet contains either account/auth controls or signed-in profile/data controls (`SimplyLift/src/app/components/profileHeader.tsx`).
- “Start Workout” is the most prominent action on the non-workout shell: a full-width black button above the tab bar.
- Once a workout exists, `AppManager` replaces the tabs with `ActiveWorkout`; the user is not distracted by normal navigation during a session (`SimplyLift/src/app/appManager.tsx`).
- Authentication loading is a centered black spinner on white, not a partially rendered shell.

### Workout lifecycle

1. **Start:** create a `New Workout` with the current date, zero duration, and no exercises.
2. **Name:** allow inline title editing; preserve the prior title if focus leaves an empty field. Names are capped at 18 characters.
3. **Track:** show a live `HH:MM:SS` timer while logging; use a monospace readout and a timer icon.
4. **Add:** use the central “Add Exercise” action. Suggestions reuse saved exercise names and most recent sets where available (`SimplyLift/src/app/components/newExercise.tsx`).
5. **Log:** use a compact set grid with `SET`, `LBS`, and `REPS`; numeric fields clear on focus and restore the old value on an empty blur. Tap the set number to assign Normal, Warmup, Failure, or RIR.
6. **Finish or quit:** both routes are explicit. Finishing asks for confirmation; quitting asks whether to keep going. Editing uses “Cancel” / “Save” instead of the live-workout wording.
7. **Persist:** clear the active workout only after the local update or remote save succeeds; show a readable alert on save failure (`SimplyLift/src/app/context/appContext.tsx`).

### Exercise and set semantics

- A saved exercise appears in pickers only if it still occurs in completed workout history. Matching is trimmed and case-insensitive (`SimplyLift/src/app/utils/exerciseVisibility.ts`).
- Do not add the same exercise twice to one workout; direct the user to “add set” on the existing exercise (`newExercise.tsx`).
- Adding a set copies the most recent set’s values as a starting point. Unilateral exercises add a left/right pair.
- Unilateral sets display as `1L`, `1R`, `2L`, `2R`; the data model stores those as adjacent set entries. The conversion and display rules live in `SimplyLift/src/app/utils/setDisplay.ts` and `newExercise.tsx`.
- The unilateral setting is on by default and is persisted locally. When disabled, do not expose the unilateral option for new exercises (`SimplyLift/src/app/context/appContext.tsx`, `SimplyLift/src/app/settings.tsx`).
- Use color on the set number—not a filled row or large badge—to preserve the compact logging grid while exposing set type.

### History and detail views

- History is newest first. Workout cards show name/date on top and duration/exercise count below (`SimplyLift/src/app/index.tsx`, `SimplyLift/src/app/components/workoutCard.tsx`).
- Tapping a card opens a bottom sheet with date, duration, exercise count, and every set. Keep the sheet scrollable and reserve the bottom for “Edit Workout” and “Done”.
- A workout name is edited by double-tapping its detail-sheet title. Commit on submit/blur; trim whitespace; reject an empty replacement and restore the old name.
- Swipe a history row left to expose a red Delete action. Close the swipe row before requesting deletion, then use a destructive confirmation (`index.tsx`).
- Empty states should be centered, short, and non-blocking. Exercise history may include a muted history icon; workout history currently uses text only.

### Sheets, alerts, and destructive actions

- Use bottom sheets for detailed or multi-step work (workout detail, exercise history, profile/account, add exercise).
- Use centered custom alerts for a decision that should interrupt the current flow. `CustomAlert` provides default, cancel, and destructive button styles and closes after a selection (`SimplyLift/src/app/components/customAlert.tsx`).
- Require confirmation for quitting an active workout, discarding edits, submitting a workout, removing an exercise, deleting history, and clearing data.
- Dangerous data clearing is visually separated with a red outline. Signed-in clearing requires password reauthentication; local clearing requires a second tap (`profileHeader.tsx`, `authContext.tsx`).
- Show an `ActivityIndicator` while an async action is in progress and disable the action to prevent duplicate submissions.

### Account and offline behavior

- An account is optional: signed-out users can log workouts locally; signed-in users get Firestore sync. The auth sheet says this explicitly (`SimplyLift/src/app/components/authForm.tsx`).
- Keep local active-workout state scoped by user when signed in (`currentWorkout:{uid}`, `editingWorkout:{uid}`); signed-out history and exercises use legacy local keys (`appContext.tsx`).
- On sign-in, migrate legacy local history/exercise data once, de-duplicating workouts and upserting exercises (`SimplyLift/src/app/services/workoutRepository.ts`).
- Remote workout and exercise changes are observed with Firestore snapshots; surface sync errors through the app alert system rather than silently failing.

### Accessibility and platform behavior

- Provide accessibility labels/hints for non-obvious gestures and fields, such as the workout name’s double-tap behavior and the duration input (`index.tsx`, `activeWorkout.tsx`).
- Use `SafeAreaProvider`/`SafeAreaView` and `useSafeAreaInsets` for both top headers and bottom shelves (`_layout.tsx`, `tabs.tsx`, `activeWorkout.tsx`).
- Keep keyboard entry usable: use `KeyboardAvoidingView`, appropriate numeric/email keyboards, and `keyboardShouldPersistTaps` for editable lists.
- Preserve `onRequestClose` behavior for every modal so Android back and platform dismissal have a clear path.

## 4. Architecture patterns

### Runtime and composition

- This is an Expo React Native app using TypeScript, Expo Router’s entry point, React 19, and React Native 0.83 (`SimplyLift/package.json`, `SimplyLift/tsconfig.json`).
- The root composition order is intentional:

  ```text
  GestureHandlerRootView
    └─ SafeAreaProvider
       └─ AuthProvider
          └─ AppProvider
             └─ AppManager
  ```

  See `SimplyLift/src/app/_layout.tsx`. Gesture handling and safe-area context wrap the entire app; auth resolves before app data loading; app state is available to the manager and every screen.
- `AppManager` is the top-level mode switch: auth loading, normal tab shell, or active workout (`SimplyLift/src/app/appManager.tsx`).
- `Tabs` owns the lightweight tab selection locally and renders screen components directly. The workout session is deliberately promoted above this shell rather than being another tab (`SimplyLift/src/app/tabs.tsx`).

### State ownership

- `AuthProvider` owns Firebase auth state and auth commands: sign-in, sign-up, sign-out, reset, reauthentication, and readable Firebase error mapping (`SimplyLift/src/app/context/authContext.tsx`).
- `AppProvider` owns the domain state: current workout, edit mode, exercise list, history, unilateral preference, persistence, migration, sync, alerts, and mutations (`SimplyLift/src/app/context/appContext.tsx`).
- Screens and leaf components read/write through context actions. Do not introduce parallel copies of the current workout in component state unless the value is strictly temporary input text or modal UI state.
- `CustomAlert` is rendered by `AppProvider`, allowing any domain action to request a consistent confirmation/error surface.

### Domain model and pure logic

The shared model is intentionally small:

```ts
interface Set {
  reps: number;
  weight: number;
  type?: "warmup" | "failure" | "rir";
  rir?: number;
}

interface Exercise {
  name: string;
  sets?: Set[];
  isUnilateral?: boolean;
}

interface Workout {
  id?: string;
  name: string;
  time: number; // milliseconds
  date: Date;
  exercises: Exercise[];
}
```

Keep pure transformations in `SimplyLift/src/app/utils/`:

- `setDisplay.ts`: set numbering, L/R labels, set-type/RIR colors.
- `exerciseVisibility.ts`: normalized history-based exercise filtering.
- `workoutEditing.ts`: duration parsing/formatting, deep cloning, identity matching, replacement.

These functions are easy to test without rendering React Native and should remain free of storage, navigation, and UI side effects.

### Data and persistence boundary

- `SimplyLift/src/app/services/workoutRepository.ts` is the Firestore repository boundary. It owns document shape conversion, collection paths, queries, snapshots, CRUD, batch clearing, exercise upserts, and legacy migration.
- Firestore data is scoped under `users/{uid}/workouts` and `users/{uid}/exercises`. Security rules permit reads/writes only when the authenticated UID matches the user document (`SimplyLift/firestore.rules`).
- `SimplyLift/src/lib/firebase.ts` initializes Firebase only when all `EXPO_PUBLIC_FIREBASE_*` values are present. It configures AsyncStorage auth persistence and long polling with safe fallbacks.
- Local persistence uses AsyncStorage for active workouts, edit mode, signed-out history/exercises, and the unilateral setting. Dates are serialized and restored explicitly (`parseStoredWorkout`/`parseStoredWorkouts` in `appContext.tsx`).
- Keep Firestore and local-storage details out of screen components. Screens call context actions; context decides whether to update local state or call the repository.

### Component structure

- Organize UI by responsibility under `SimplyLift/src/app/components/`: active session, cards, set editor, add-exercise flow, profile/auth, and alert.
- Co-locate `StyleSheet.create(...)` definitions with the component that owns them. Reuse a pattern by copying its visual language, not by creating a premature global abstraction.
- Use `FlatList` for workout/exercise/history collections and stable keys. Use `ScrollView` only for bounded detail/sheet content.
- Use `Pressable` render functions when pressed state changes icon, label, or surface color.
- Clone nested workout data before editing (`cloneWorkout`) and use immutable `setCurrentWorkout(prev => ...)` updates. Never mutate nested `exercises` or `sets` in place.

## 5. Coding conventions

### TypeScript and naming

- TypeScript is strict (`"strict": true` in `SimplyLift/tsconfig.json`). Keep domain interfaces and public component props typed.
- Use PascalCase for React components and component files (`ActiveWorkout`, `WorkoutCard`); camelCase for functions, hooks, variables, and utility files (`workoutEditing.ts`); UPPER_SNAKE_CASE for storage keys/constants.
- Use default exports for screen/components and named exports for shared types, constants, and pure helpers, following the existing source.
- Prefer narrow union types for modes and variants (`TabKey`, `SetType`, `AuthMode`, alert button style) over arbitrary strings.
- Use `type` imports where appropriate and preserve the `@/*` / `@/assets/*` path aliases when they improve clarity (`tsconfig.json`).

### React and React Native

- Use function components and hooks. Memoize context actions and derived values with `useCallback`/`useMemo` when they cross provider or list boundaries.
- Clean up effects: unsubscribe Firestore listeners, clear timers, and guard async state updates after unmount (`appContext.tsx`, `activeWorkout.tsx`).
- Keep transient UI state local: modal visibility, draft text, animation values, picker state, and in-progress flags belong in the component.
- Keep domain mutations in context/repository actions, not in JSX event handlers. Event handlers may validate input, open a prompt, and call the action.
- Use `StyleSheet.create` for static styles. Inline styles are appropriate for values that genuinely vary at runtime, especially safe-area padding, pressed state, and semantic set colors.
- Prefer immutable array/object transformations (`map`, `filter`, spreads) and normalize user-entered exercise names with trim/lowercase matching while preserving a readable display name.
- Handle async actions with `try/catch`, `console.error(error)` for diagnostics, and a user-facing `showAlert(...)` message. Do not expose raw infrastructure errors when a readable mapping is possible.

### Formatting and tooling

- The observed source uses two-space indentation, double-quoted strings, semicolons, trailing commas in multiline structures, and readable multiline JSX.
- ESLint is the Expo flat configuration with `dist/*` ignored (`SimplyLift/eslint.config.js`). Run the project lint command rather than inventing a separate formatter/linter.
- VS Code is configured to apply explicit organize-imports, sort-members, and fix-all actions on save (`SimplyLift/.vscode/settings.json`).
- Keep secrets out of source. Firebase configuration is supplied through `EXPO_PUBLIC_FIREBASE_*` environment variables; `.env` files are ignored (`SimplyLift/.env.example`, `SimplyLift/.gitignore`).
- Preserve Expo configuration choices unless the feature requires otherwise: portrait orientation, automatic UI style, typed routes, React Compiler, and the registered router/splash plugins (`SimplyLift/app.json`).

## 6. Testing practices

### Current test setup

- `SimplyLift/package.json` runs Jest serially and then runs the exercise-visibility suite with Node’s built-in test runner:

  ```text
  jest --runInBand --testPathIgnorePatterns=exerciseVisibility.test.ts
  node --test --experimental-strip-types tests/exerciseVisibility.test.ts
  ```

- Jest uses the `jest-expo` preset (`SimplyLift/jest.config.js`). The current Jest suite is `tests/workoutEditing.test.ts`.
- `tests/exerciseVisibility.test.ts` uses `node:assert/strict` and `node:test`, with Node’s type stripping and an explicit `.ts` import. This split is intentional in the current project and should be preserved unless the test toolchain is consolidated.

### What is tested

- **Duration logic:** valid `HH:MM:SS` round trips; malformed, incomplete, and out-of-range minute/second values return `null` (`tests/workoutEditing.test.ts`).
- **Safe editing:** `cloneWorkout` deep-clones exercises and sets so edits do not mutate the source workout.
- **History replacement:** workout identity and replacement preserve unrelated history entries; set-type/RIR changes are represented.
- **Exercise visibility:** saved exercises match workout history case-insensitively and with trimmed names; unused exercises disappear after the last workout is removed (`tests/exerciseVisibility.test.ts`).

### Test style to continue

- Favor fast, deterministic unit tests around pure utilities and data transformations before adding rendering tests.
- Build representative domain fixtures with a small helper (`createWorkout` in `workoutEditing.test.ts`) and override only the fields relevant to a case.
- Name tests by behavior, not implementation: “removes an exercise after its last workout is deleted” is preferable to naming a private helper.
- Cover both the normal path and boundary/error paths: empty arrays, whitespace/case normalization, malformed input, missing IDs, unilateral pairs, and failed persistence.
- Use `assert.deepEqual` for Node-runner tests and Jest matchers for Jest tests, matching the runner already used by the file.
- When adding a pure helper, add or extend a focused unit suite. When adding a user-visible flow, also test the confirmation, loading/disabled, empty, and error states; the reference currently has no component/integration test suite, so these scenarios should not be left solely to happy-path manual checks.

### Verification commands

Run from the SimplyLift project (or the equivalent Simply Schedule package once scaffolded):

```bash
npm test
npm run lint
```

The reference does not define a standalone type-check script; strict TypeScript compilation remains a project constraint through `tsconfig.json` and the Expo tooling.

## 7. Implementation checklist for Simply Schedule

Before merging a feature, verify that it:

- [ ] Keeps the white/black, 2 px outline, 8 px radius, uppercase/heavy type language unless the feature has a clear reason to depart.
- [ ] Uses semantic colors consistently: green for positive interaction, red for destructive/error, purple for RIR/unilateral, orange for warmup.
- [ ] Puts the primary action in a clear shelf or full-width black button and provides a safe cancel path.
- [ ] Handles loading, empty, pressed, disabled, and failure states—not just the populated state.
- [ ] Uses safe-area insets, keyboard-aware layouts, and modal back-dismissal behavior.
- [ ] Keeps current-workout mutations in the app context and remote/local persistence behind the repository/context boundary.
- [ ] Normalizes user-entered names for matching while preserving the user’s readable casing.
- [ ] Uses immutable nested updates and deep clones before editing persisted workouts.
- [ ] Adds focused unit coverage for new pure logic and behavioral coverage for destructive/async UI flows.
- [ ] Runs `npm test` and `npm run lint` before handoff.

## 8. Source map

| Concern | Primary references |
| --- | --- |
| Root composition and mode switching | `SimplyLift/src/app/_layout.tsx`, `SimplyLift/src/app/appManager.tsx` |
| Navigation, header, shelves | `SimplyLift/src/app/tabs.tsx`, `SimplyLift/src/app/components/profileHeader.tsx` |
| Workout session | `SimplyLift/src/app/components/activeWorkout.tsx` |
| History and workout detail | `SimplyLift/src/app/index.tsx`, `SimplyLift/src/app/components/workoutCard.tsx` |
| Exercise and set entry | `SimplyLift/src/app/components/newExercise.tsx`, `SimplyLift/src/app/components/exerciseCard.tsx`, `SimplyLift/src/app/components/setCard.tsx` |
| Exercises/history and settings | `SimplyLift/src/app/exercises.tsx`, `SimplyLift/src/app/settings.tsx` |
| Alerts and authentication | `SimplyLift/src/app/components/customAlert.tsx`, `SimplyLift/src/app/components/authForm.tsx`, `SimplyLift/src/app/context/authContext.tsx` |
| Domain state and persistence | `SimplyLift/src/app/context/appContext.tsx` |
| Remote data and migration | `SimplyLift/src/app/services/workoutRepository.ts`, `SimplyLift/src/lib/firebase.ts`, `SimplyLift/firestore.rules` |
| Pure domain helpers | `SimplyLift/src/app/utils/setDisplay.ts`, `SimplyLift/src/app/utils/exerciseVisibility.ts`, `SimplyLift/src/app/utils/workoutEditing.ts` |
| Tooling and tests | `SimplyLift/package.json`, `SimplyLift/tsconfig.json`, `SimplyLift/eslint.config.js`, `SimplyLift/jest.config.js`, `SimplyLift/tests/*` |
| Brand assets and app shell | `SimplyLift/assets/images/icon.png`, `SimplyLift/assets/images/splash-icon.png`, `SimplyLift/assets/expo.icon/icon.json`, `SimplyLift/app.json` |
