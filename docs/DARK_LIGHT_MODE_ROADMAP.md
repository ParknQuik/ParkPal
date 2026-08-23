# Light / Dark Mode — Implementation Roadmap

**Created:** 2026-05-04
**Scope:** React Native (Expo) mobile app
**Effort estimate:** ~3–4 days of focused work

---

## Current State

- Light mode only — all colors are static imports from `src/theme/colors.ts`
- Dark color tokens already defined (`backgroundDark`, `surfaceDark`, `borderDark`, etc.) but never used conditionally
- No theme context, no `useColorScheme`, no toggle logic
- ~15 screens + ~10 components all import `colors` as a flat object

---

## Architecture Decision

Use a **React Context + Redux** hybrid approach:

- `ThemeContext` provides the resolved color palette to all components (no prop drilling)
- Redux stores the user's **manual override** (`'light' | 'dark' | 'system'`)
- `useColorScheme()` from React Native provides the system preference
- Final resolved theme = user override (if set) else system preference

This means:
- App respects system dark mode by default
- User can override via a toggle in Settings
- Preference persists across app restarts (via Redux Persist / AsyncStorage)

---

## Phase 1 — Theme Foundation (Day 1)

### 1.1 Define dual color palettes

**File:** `src/theme/colors.ts`

Replace the flat `colors` export with two named palettes and a type:

```ts
export const lightColors = { ... }  // current values
export const darkColors = {
  primary: '#10b77f',          // brand green stays the same
  primaryDark: '#0d9668',
  primaryLight: '#14c99e',
  secondary: '#f59e0b',
  background: '#0f1a14',       // very dark green-tinted black
  surface: '#1a2e22',          // dark card surface
  textPrimary: '#f1f5f4',      // near-white
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  border: '#2d4a38',
  ...
}
export type AppColors = typeof lightColors
```

Keep `colors` as a re-export of `lightColors` so existing imports don't break during migration.

### 1.2 Create ThemeContext

**New file:** `src/context/ThemeContext.tsx`

```ts
const ThemeContext = createContext<{ colors: AppColors; isDark: boolean }>()
export const ThemeProvider = ({ children }) => { ... }
export const useTheme = () => useContext(ThemeContext)
```

Internally reads Redux `settings.themeMode` (`'light' | 'dark' | 'system'`) and
`useColorScheme()` to resolve the active palette.

### 1.3 Add theme slice to Redux

**New file:** `src/store/slices/settingsSlice.ts`

```ts
state.themeMode: 'system' | 'light' | 'dark'  // default: 'system'
action: setThemeMode(mode)
```

Persist this key via AsyncStorage so it survives app restarts.

### 1.4 Wrap app in ThemeProvider

**File:** `App.tsx`

```tsx
<Provider store={store}>
  <ThemeProvider>        // ← add this
    <SafeAreaProvider>
      ...
    </SafeAreaProvider>
  </ThemeProvider>
</Provider>
```

---

## Phase 2 — Component Migration (Day 2)

Priority order: shared components first, then high-traffic screens.

### 2.1 Shared components (highest use — used everywhere)

| File | Key change |
|------|-----------|
| `components/Button.tsx` | Replace `colors.X` with `useTheme().colors.X` |
| `components/Card.tsx` | Same |
| `components/Input.tsx` | Same |
| `components/LoadingScreen.tsx` | Same |
| `components/Header.tsx` | Same + dynamic StatusBar style |

Pattern for every component/screen:

```ts
// Before
import { colors } from '../theme';
const styles = StyleSheet.create({ container: { backgroundColor: colors.background } });

// After
const { colors } = useTheme();
const styles = useMemo(() => StyleSheet.create({
  container: { backgroundColor: colors.background }
}), [colors]);
```

> Note: `StyleSheet.create()` must move inside the component (or use `useMemo`) because colors are now dynamic.

### 2.2 High-traffic screens

- `HomeDashboard.tsx`
- `ExploreMap.tsx`
- `MyBookingsScreen.tsx`
- `ProfileScreen.tsx`
- `AuthScreen.tsx` (login/signup)

### 2.3 StatusBar

Create a `useStatusBarStyle` hook that returns `'light-content'` or `'dark-content'` based on active theme. Replace all hardcoded `barStyle` values.

---

## Phase 3 — Remaining Screens (Day 3)

Migrate all remaining screens:

- `ListYourSpotScreen.tsx`
- `ParkingDetailsScreen.tsx`
- `PaymentScreen.tsx`
- `BookingConfirmedScreen.tsx`
- `MyListingsScreen.tsx`
- `EditProfileScreen.tsx`
- `EarningsScreen.tsx`
- `PerksScreen.tsx` (once built)
- `NotificationsScreen.tsx`
- `HelpCenterScreen.tsx`
- `SecurityPrivacyScreen.tsx`

Also apply to React Navigation:

```ts
// AppNavigator.tsx
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
const navTheme = isDark ? DarkTheme : DefaultTheme;
<NavigationContainer theme={navTheme}>
```

---

## Phase 4 — User Toggle UI (Day 4)

### 4.1 Add toggle to SecurityPrivacyScreen (or a new Appearance section in Profile settings)

Three options:
- System (default)
- Light
- Dark

```tsx
<SegmentedControl
  values={['System', 'Light', 'Dark']}
  selectedIndex={...}
  onChange={(mode) => dispatch(setThemeMode(mode))}
/>
```

### 4.2 Animated transition (optional polish)

Wrap theme switch in a short fade/crossfade so it doesn't snap harshly.

### 4.3 Splash screen & app icon

- Expo supports `userInterfaceStyle: "automatic"` in `app.config.js` — set this so the splash screen respects system dark mode
- Consider a dark-variant app icon (`android.adaptiveIcon.backgroundColor` already set — update for dark)

---

## Phase 5 — QA & Edge Cases

- [ ] Maps (ExploreMap) — Google Maps has its own dark map style via `customMapStyle` JSON — add a dark map style when dark mode is active
- [ ] Modals and bottom sheets — confirm backgrounds darken correctly
- [ ] Images with transparent backgrounds — verify they look correct on dark surfaces
- [ ] Gradient components — update `LinearGradient` color arrays conditionally
- [ ] Hardcoded hex strings in screens (e.g. `'#ef4444'` inline) — grep and replace with `colors.error`

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/context/ThemeContext.tsx` | Context + provider + `useTheme` hook |
| `src/store/slices/settingsSlice.ts` | Redux slice for `themeMode` preference |
| `src/hooks/useStatusBarStyle.ts` | Returns correct StatusBar barStyle |
| `src/theme/darkColors.ts` | Dark palette definition |

## Files to Modify

| File | Change |
|------|--------|
| `src/theme/colors.ts` | Export named `lightColors` + `AppColors` type |
| `src/theme/index.ts` | Re-export `darkColors` |
| `App.tsx` | Wrap with `ThemeProvider` |
| `src/navigation/AppNavigator.tsx` | Pass nav theme |
| `src/store/index.ts` | Register `settingsSlice` |
| All screens + components | `colors` → `useTheme().colors`, styles → dynamic |

---

## Effort Summary

| Phase | Work | Est. Time |
|-------|------|-----------|
| 1 — Foundation | Context, Redux slice, palettes | 4–5 hrs |
| 2 — Core components + top screens | ~15 files | 4–5 hrs |
| 3 — Remaining screens | ~10 files | 3–4 hrs |
| 4 — Toggle UI + polish | Settings screen, animation | 2–3 hrs |
| 5 — QA + edge cases | Maps dark style, greps | 2–3 hrs |
| **Total** | | **~3–4 days** |

---

## What's Already Done (No Work Needed)

- Dark color tokens exist in `colors.ts` (`backgroundDark`, `surfaceDark`, `borderDark`) — map them into a palette
- Brand green (`#10b77f`) works well on both light and dark backgrounds — no primary color changes needed
- `android.edgeToEdgeEnabled: true` already set in `app.config.js` — dark mode system UI will render correctly on Android
