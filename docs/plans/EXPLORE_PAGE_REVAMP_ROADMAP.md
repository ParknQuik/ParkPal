# Explore Page Revamp Roadmap

> **Target:** `frontend/mobile/src/screens/ExploreMap.tsx`
> **Goal:** Make the Explore page a clear and fast parking discovery view.

---

## Current Issues (Tracked)

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Emoji icons everywhere (`🔍`, `⚙️`, `📍`, `⭐`, `🧭`) | High | Low |
| 2 | Non-functional filter button (shows "coming soon" alert) | High | Medium |
| 3 | Empty state has text only and no icon | Medium | Low |
| 4 | `handleDirections()` is a no-op (`console.log` only) | High | Low |
| 5 | Map controls use text (`+`, `−`, `📍`) | Medium | Low |
| 6 | Search bar `top: 50` not safe for all devices | High | Low |
| 7 | "Search this area" button hardcoded `top: 190` | High | Low |
| 8 | Bottom sheet not draggable (static preview) | Medium | Medium |
| 9 | Zone availability display needs better visual hierarchy | Medium | Medium |
| 10 | Price marker SVG approach is complex, may have performance issues | Low | Medium |
| 11 | Analytics zone overlays clutter the map | Medium | Medium |
| 12 | No listing detail summary (no amenities, no photo carousel) | High | Medium |
| 13 | No quick booking action from bottom sheet | High | Medium |
| 14 | No offline fallback (if map fails, no graceful degradation) | Low | High |
| 15 | No search history or recent searches | Medium | Medium |

---

## Phase 1: Quick Wins (Icon & UX Consistency)

> **Goal:** Replace emoji with proper icons, fix broken interactions, resolve positioning bugs.
> **Estimated Effort:** 2–3 days

### Tasks

| Task | Description | Dependencies | Effort |
|------|-------------|--------------|--------|
| **1.1** Replace all emoji with MaterialCommunityIcons | `🔍` → `magnify`, `⚙️` → `tune`, `📍` → `crosshairs-gps`, `⭐` → `star`, `🧭` → `navigation`, `+`/`−` → `plus`/`minus` | None | 2h |
| **1.2** Implement actual filter functionality | Build filter modal with price range slider, amenities checkboxes, slot type selector. Wire filter state to `searchListings` API call. | API supports filter params | 6h |
| **1.3** Add proper empty state icon | Use `map-marker-off` icon with friendly messaging and "recenter" CTA | 1.1 | 1h |
| **1.4** Implement directions using Linking API | Open Google Maps (Android) or Apple Maps (iOS) via `Linking.openURL()` with lat/lng coordinates | None | 2h |
| **1.5** Fix search bar positioning | Replace `top: 50` with `useSafeAreaInsets()` from `react-native-safe-area-context` (already imported) | None | 1h |
| **1.6** Fix "Search this area" positioning | Replace hardcoded `top: 190` with relative positioning below search bar using dynamic calculation | 1.5 | 1h |

### Deliverables
- All emoji replaced with consistent MaterialCommunityIcons
- Filter modal opens and applies filters to search
- Empty state shows icon + helpful text + action button
- Directions button opens external maps app
- No hardcoded absolute positions for overlays

---

## Phase 2: Enhanced Map Experience

> **Goal:** Draggable bottom sheet, richer listing preview, quick booking.
> **Estimated Effort:** 4–5 days

### Tasks

| Task | Description | Dependencies | Effort |
|------|-------------|--------------|--------|
| **2.1** Implement draggable bottom sheet | Use `react-native-gesture-handler` + `react-native-reanimated` (both installed). Create snap points: collapsed (preview), expanded (details), hidden. | Gesture handler installed | 8h |
| **2.2** Add listing detail preview in bottom sheet | Show photo carousel (horizontal scroll), amenities icons, rating breakdown, address, distance. Pull data from listing object. | 2.1 | 6h |
| **2.3** Add quick book button | "Book Now" button in bottom sheet that navigates directly to booking flow with pre-filled listing. Skip detail page for returning users. | Booking flow exists | 4h |
| **2.4** Improve price markers | Evaluate replacing SVG price markers with native `View` + `Text` approach (simpler, better perf). Keep SVG only if native approach has rendering issues on Android. | None | 4h |
| **2.5** Zone availability visual hierarchy | Redesign zone availability row: progress bar for occupancy, color-coded badges (green/yellow/red), clearer circling time display. | None | 4h |

### Deliverables
- Bottom sheet with 3 snap points (collapsed/expanded/hidden)
- Horizontal photo carousel in expanded sheet
- Amenities display with icons
- One-tap "Book Now" from bottom sheet
- Cleaner zone availability indicators

---

## Phase 3: Search & Discovery

> **Goal:** Smarter search with history, autocomplete, and sorting.
> **Estimated Effort:** 3–4 days

### Tasks

| Task | Description | Dependencies | Effort |
|------|-------------|--------------|--------|
| **3.1** Add search history / recent searches | Persist last 5–10 searches using `@react-native-async-storage/async-storage` (installed). Show dropdown below search bar when focused. | AsyncStorage installed | 4h |
| **3.2** Add autocomplete suggestions | Debounced API call for address/place suggestions as user types. Show in dropdown below search bar. | API supports autocomplete | 6h |
| **3.3** Add filter chips below search bar | Quick-select chips: "Cheapest", "Nearest", "Top Rated", "Available Now". Toggles sorting/filter without opening modal. | Phase 1.2 filter state | 3h |
| **3.4** Add sorting options | Sort by price (asc/desc), distance, rating. Wire to `searchListings` params or client-side sort. | API supports sort params | 4h |

### Deliverables
- Recent searches dropdown on search focus
- Autocomplete suggestions as user types
- Quick filter chips for one-tap sorting
- Sort by price, distance, rating

---

## Phase 4: Zone Analytics Integration

> **Goal:** Clean, toggleable zone overlays with meaningful data.
> **Estimated Effort:** 3–4 days

### Tasks

| Task | Description | Dependencies | Effort |
|------|-------------|--------------|--------|
| **4.1** Toggle for zone overlays | Add map control toggle button. Zone circles/labels only show when explicitly enabled. Default to hidden for clean map view. | None | 2h |
| **4.2** Zone availability on markers | Add small colored dot/badge on price markers indicating zone occupancy (green = open, yellow = moderate, red = full). | Phase 2.5 | 4h |
| **4.3** Occupancy heatmap layer | Explore `react-native-maps` heatmap or custom gradient overlays to show area-level availability density. Optional feature behind settings toggle. | None | 8h |
| **4.4** Simplify zone indicator UI | Consolidate zone name + session info into a compact pill at top. Auto-dismiss after 5s or on map interaction. | None | 2h |

### Deliverables
- Zone overlays toggleable (off by default)
- Colored occupancy indicators on price markers
- Optional heatmap layer for dense areas
- Compact, auto-dismissing zone pill

---

## Phase 5: Performance & Polish

> **Goal:** Optimize rendering, add offline support, accessibility, haptics.
> **Estimated Effort:** 5–7 days

### Tasks

| Task | Description | Dependencies | Effort |
|------|-------------|--------------|--------|
| **5.1** Marker clustering | Use `react-native-maps` clustering or custom logic for 50+ markers. Group nearby markers into cluster bubbles with count. | None | 8h |
| **5.2** Offline fallback mode | Detect network state. If offline, show cached listings from AsyncStorage with "Offline mode" banner. Disable real-time features gracefully. | AsyncStorage installed | 6h |
| **5.3** Loading skeletons | Replace full-screen loading overlay with skeleton cards for bottom sheet preview and search results. Use `react-native-reanimated` for shimmer effect. | Reanimated installed | 4h |
| **5.4** Haptic feedback | Add `expo-haptics` to: marker press, filter apply, quick book, search area refresh. | Install expo-haptics | 2h |
| **5.5** Accessibility improvements | Add `accessibilityLabel` to all buttons, `role` to interactive elements, sufficient contrast ratios, screen reader support for map markers. | None | 6h |
| **5.6** Performance profiling | Profile render cycles, optimize `PriceMarker` memoization, reduce re-renders on region change, optimize `onRegionChangeComplete` debounce. | None | 4h |

### Deliverables
- Clustered markers for dense areas
- Offline mode with cached data
- Skeleton loading states
- Haptic feedback on key interactions
- Full accessibility support
- Optimized render performance

---

## Priority Matrix

```
                Urgent              Not Urgent
            ┌───────────────────┬───────────────────┐
  Important │  PHASE 1          │  PHASE 5          │
            │  Quick Wins       │  Performance      │
            │  (2-3 days)       │  (5-7 days)       │
            ├───────────────────┼───────────────────┤
  Not       │  PHASE 3          │  PHASE 4          │
  Important │  Search & Disc.   │  Zone Analytics   │
            │  (3-4 days)       │  (3-4 days)       │
            └───────────────────┴───────────────────┘
```

**Execution Order:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

**Rationale:**
- **Phase 1** is highest priority because it fixes broken features (filter, directions) and visual inconsistencies (emoji) that users see immediately.
- **Phase 2** improves the core map interaction experience (draggable sheet, quick booking) which directly impacts conversion.
- **Phase 3** enhances discoverability but depends on Phase 1's filter infrastructure.
- **Phase 4** is nice-to-have analytics features that should be toggleable to avoid clutter.
- **Phase 5** is foundational polish that compounds value but is less visible to users in the short term.

---

## Total Estimated Effort

| Phase | Effort | Calendar Time |
|-------|--------|---------------|
| Phase 1: Quick Wins | 13h | 2–3 days |
| Phase 2: Enhanced Map | 26h | 4–5 days |
| Phase 3: Search & Discovery | 17h | 3–4 days |
| Phase 4: Zone Analytics | 16h | 3–4 days |
| Phase 5: Performance & Polish | 30h | 5–7 days |
| **Total** | **102h** | **17–23 days** |

---

## Dependencies & Prerequisites

- **Already installed:** `react-native-gesture-handler`, `react-native-reanimated`, `@react-native-async-storage/async-storage`, `react-native-safe-area-context`, `expo-location`
- **Need to install:** `expo-haptics` (Phase 5.4)
- **API requirements:** Filter params, autocomplete endpoint, sort params on `searchListings`
- **No breaking changes:** All phases can be implemented incrementally behind feature flags if needed

---

## File Impact

| File | Phase(s) | Changes |
|------|----------|---------|
| `ExploreMap.tsx` | P1–P5 | Main refactoring target — icons, filters, positioning, bottom sheet, search, analytics, performance |
| `components/FilterModal.tsx` | P1 | New component — filter UI |
| `components/ListingPreview.tsx` | P2 | New component — bottom sheet content |
| `components/PhotoCarousel.tsx` | P2 | New component — photo carousel |
| `components/SearchHistory.tsx` | P3 | New component — recent searches |
| `components/FilterChips.tsx` | P3 | New component — quick filter chips |
| `utils/directions.ts` | P1 | New utility — open maps for navigation |
| `hooks/useSearchHistory.ts` | P3 | New hook — manage search history |
| `components/LoadingSkeleton.tsx` | P5 | New component — skeleton placeholders |
| `components/OfflineFallback.tsx` | P5 | New component — list view fallback |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bottom sheet conflicts with map gestures | Medium | High | Thorough testing on iOS + Android, use proven library |
| Marker clustering degrades map performance | Low | Medium | Lazy load clusters, limit visible markers |
| Filter logic becomes complex with many options | Medium | Low | Start with core filters, iterate |
| Offline fallback requires significant caching logic | Medium | Medium | Start with simple list view, add caching incrementally |
| Heatmap library compatibility with react-native-maps | Low | Medium | Evaluate libraries before P4 start |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to first booking from Explore page | < 30 seconds |
| Map interaction errors | 0 |
| Empty state engagement (recenter/search) | > 40% |
| Filter usage rate | > 25% of sessions |
| Offline mode availability | Cached data loads in < 2s |
| Accessibility audit score | WCAG 2.1 AA compliant |
| Zero emoji icons remaining in Explore page | ✅ |
| All positions use safe area insets | ✅ |
| Bottom sheet has ≥3 draggable snap states | ✅ |
| Listing preview shows ≥5 data points | ✅ |
| Autocomplete returns results in <300ms | ✅ |
| Zone overlays toggleable and off by default | ✅ |
