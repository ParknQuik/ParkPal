# Google Stitch to React Native Conversion Guide

**Created:** March 13, 2026
**Purpose:** Convert Google Stitch HTML/Tailwind designs to React Native
**Screens:** 19 mobile screens from `/tmp/stitch_parknquik/`

---

## Quick Reference: Tailwind → React Native

### Layout

| Tailwind | React Native | Example |
|----------|--------------|---------|
| `flex` | `flexDirection: 'row'` or `'column'` | `<View style={{ flexDirection: 'row' }}>` |
| `flex-col` | `flexDirection: 'column'` | Default for View |
| `flex-row` | `flexDirection: 'row'` | `<View style={{ flexDirection: 'row' }}>` |
| `flex-1` | `flex: 1` | `<View style={{ flex: 1 }}>` |
| `items-center` | `alignItems: 'center'` | Vertical alignment in row |
| `justify-between` | `justifyContent: 'space-between'` | Horizontal alignment |
| `justify-center` | `justifyContent: 'center'` | Center content |
| `gap-4` | `gap: 16` | Use spacing.lg |

### Spacing

| Tailwind | React Native | Value |
|----------|--------------|-------|
| `p-4` | `padding: 16` | spacing.lg |
| `px-6` | `paddingHorizontal: 24` | spacing.xxl |
| `py-3` | `paddingVertical: 12` | spacing.md |
| `mt-8` | `marginTop: 32` | spacing.xxxl |
| `mb-4` | `marginBottom: 16` | spacing.lg |
| `gap-3` | `gap: 12` | spacing.md |

### Sizing

| Tailwind | React Native | Example |
|----------|--------------|---------|
| `w-full` | `width: '100%'` | Full width |
| `h-12` | `height: 48` | 12 × 4 = 48 |
| `size-10` | `width: 40, height: 40` | 10 × 4 = 40 |
| `max-w-md` | `maxWidth: 448` | Container |

### Border Radius

| Tailwind | React Native | Value |
|----------|--------------|-------|
| `rounded-lg` | `borderRadius: 16` | borderRadius.lg |
| `rounded-xl` | `borderRadius: 20` | borderRadius.xl |
| `rounded-2xl` | `borderRadius: 24` | borderRadius.xxl |
| `rounded-full` | `borderRadius: 9999` | borderRadius.full |
| `rounded-b-[2.5rem]` | `borderBottomLeftRadius: 40, borderBottomRightRadius: 40` | Custom |

### Colors

| Tailwind | React Native | Value |
|----------|--------------|-------|
| `bg-primary` | `backgroundColor: colors.primary` | #10b981 |
| `text-white` | `color: colors.white` | #ffffff |
| `text-slate-900` | `color: colors.textPrimary` | #1e293b |
| `text-slate-500` | `color: colors.textSecondary` | #64748b |
| `border-primary/10` | `borderColor: 'rgba(16, 185, 129, 0.1)'` | 10% opacity |

### Typography

| Tailwind | React Native | Example |
|----------|--------------|---------|
| `text-3xl` | `fontSize: 32, fontWeight: '700'` | typography.h1 |
| `text-xl` | `fontSize: 20, fontWeight: '700'` | typography.h4 |
| `text-sm` | `fontSize: 14` | typography.small |
| `font-bold` | `fontWeight: '700'` | Bold |
| `font-semibold` | `fontWeight: '600'` | Semibold |
| `uppercase` | `textTransform: 'uppercase'` | UPPERCASE |
| `tracking-tight` | `letterSpacing: -0.5` | Tight spacing |

### Shadows

| Tailwind | React Native | Value |
|----------|--------------|-------|
| `shadow-sm` | `...shadows.sm` | Small shadow |
| `shadow-md` | `...shadows.default` | Default shadow |
| `shadow-lg` | `...shadows.lg` | Large shadow |
| `shadow-xl` | `...shadows.xl` | XL shadow |

---

## Component Mapping

### Container → View

**Tailwind:**
```html
<div class="flex flex-col items-center p-4 bg-white rounded-xl">
```

**React Native:**
```tsx
<View style={{
  flexDirection: 'column',
  alignItems: 'center',
  padding: spacing.lg,
  backgroundColor: colors.white,
  borderRadius: borderRadius.xl,
}}>
```

### Button

**Tailwind:**
```html
<button class="bg-primary text-white px-6 py-3 rounded-xl font-bold">
  Search
</button>
```

**React Native:**
```tsx
<TouchableOpacity
  style={{
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  }}
>
  <Text style={{
    color: colors.white,
    fontWeight: '700',
    fontSize: typography.body.fontSize
  }}>
    Search
  </Text>
</TouchableOpacity>
```

Or use the Button component:
```tsx
<Button
  title="Search"
  variant="primary"
  onPress={handleSearch}
/>
```

### Input Field

**Tailwind:**
```html
<input
  class="w-full border-none focus:ring-0 bg-transparent text-slate-900 py-3 px-3"
  placeholder="Search..."
/>
```

**React Native:**
```tsx
<TextInput
  style={{
    width: '100%',
    backgroundColor: 'transparent',
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  }}
  placeholder="Search..."
  placeholderTextColor={colors.textTertiary}
/>
```

Or use the Input component:
```tsx
<Input
  placeholder="Search..."
  value={searchQuery}
  onChangeText={setSearchQuery}
/>
```

### Card

**Tailwind:**
```html
<div class="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100">
  <!-- Content -->
</div>
```

**React Native:**
```tsx
<View style={{
  backgroundColor: colors.surface,
  borderRadius: borderRadius.xxl,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,
  ...shadows.sm,
}}>
  {/* Content */}
</View>
```

Or use the Card component:
```tsx
<Card>
  {/* Content */}
</Card>
```

### Gradient Header

**Tailwind:**
```html
<header class="vibrant-gradient pt-8 pb-12 px-6 rounded-b-[2.5rem]">
  <h1 class="text-white text-3xl font-bold">Hello, Alex!</h1>
</header>
```

**React Native:**
```tsx
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={colors.gradientVibrant}
  style={{
    paddingTop: spacing.xxxl,
    paddingBottom: 48,
    paddingHorizontal: spacing.xxl,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  }}
>
  <Text style={{
    color: colors.white,
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
  }}>
    Hello, Alex!
  </Text>
</LinearGradient>
```

### Material Icons

**Tailwind:**
```html
<span class="material-symbols-outlined">search</span>
```

**React Native:**
```tsx
import { MaterialIcons } from '@expo/vector-icons';

<MaterialIcons name="search" size={24} color={colors.primary} />
```

---

## Common Patterns from Stitch Designs

### 1. Search Bar with Filter Button

**Stitch HTML:**
```html
<div class="flex items-center bg-white rounded-2xl shadow-xl p-2">
  <span class="material-symbols-outlined text-primary ml-3">search</span>
  <input class="w-full border-none" placeholder="Search..." />
  <button class="bg-primary text-white p-2.5 rounded-xl">
    <span class="material-symbols-outlined">tune</span>
  </button>
</div>
```

**React Native:**
```tsx
<View style={styles.searchContainer}>
  <MaterialIcons name="search" size={24} color={colors.primary} style={styles.searchIcon} />
  <TextInput
    style={styles.searchInput}
    placeholder="Search for parking nearby..."
    placeholderTextColor={colors.textTertiary}
  />
  <TouchableOpacity style={styles.filterButton}>
    <MaterialIcons name="tune" size={20} color={colors.white} />
  </TouchableOpacity>
</View>

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.sm,
    ...shadows.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginLeft: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  filterButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.xl,
    ...shadows.default,
  },
});
```

### 2. Quick Stats Grid (3 columns)

**Stitch HTML:**
```html
<div class="grid grid-cols-3 gap-4">
  <div class="bg-white p-4 rounded-2xl">
    <div class="size-10 rounded-full bg-primary/10">
      <span class="material-symbols-outlined">wallet</span>
    </div>
    <p class="text-xs uppercase">Balance</p>
    <p class="text-lg font-bold">$42.50</p>
  </div>
  <!-- Repeat 2 more times -->
</div>
```

**React Native:**
```tsx
<View style={styles.statsGrid}>
  {stats.map((stat) => (
    <View key={stat.label} style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: stat.bgColor }]}>
        <MaterialIcons name={stat.icon} size={20} color={stat.color} />
      </View>
      <Text style={styles.statLabel}>{stat.label}</Text>
      <Text style={styles.statValue}>{stat.value}</Text>
    </View>
  ))}
</View>

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xxxl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.xxl,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
```

### 3. Parking Card (Horizontal)

**Stitch HTML:**
```html
<div class="bg-white rounded-2xl p-4 flex gap-4">
  <div class="w-24 h-24 rounded-xl bg-cover" style="background-image: url(...)"></div>
  <div class="flex-1">
    <div class="flex justify-between">
      <h4 class="font-bold">Green Plaza Garage</h4>
      <div class="flex items-center gap-1">
        <span class="material-symbols-outlined fill-1">star</span>
        <span class="text-xs font-bold">4.8</span>
      </div>
    </div>
    <p class="text-xs text-slate-500">0.2 miles away</p>
    <div class="flex justify-between">
      <p class="text-primary font-bold">$3.50<span class="text-xs">/hr</span></p>
      <span class="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">Available</span>
    </div>
  </div>
</div>
```

**React Native:**
```tsx
<View style={styles.parkingCard}>
  <Image source={{ uri: spot.image }} style={styles.parkingImage} />
  <View style={styles.parkingInfo}>
    <View style={styles.parkingHeader}>
      <Text style={styles.parkingTitle}>{spot.name}</Text>
      <View style={styles.ratingContainer}>
        <MaterialIcons name="star" size={16} color={colors.accent} />
        <Text style={styles.ratingText}>{spot.rating}</Text>
      </View>
    </View>
    <View style={styles.locationRow}>
      <MaterialIcons name="location-on" size={14} color={colors.textSecondary} />
      <Text style={styles.distanceText}>{spot.distance} miles away</Text>
    </View>
    <View style={styles.parkingFooter}>
      <View>
        <Text style={styles.priceText}>
          ${spot.price}<Text style={styles.priceUnit}>/hr</Text>
        </Text>
      </View>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>Available</Text>
      </View>
    </View>
  </View>
</View>

const styles = StyleSheet.create({
  parkingCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  parkingImage: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.xl,
  },
  parkingInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  parkingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  parkingTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: typography.small.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  distanceText: {
    fontSize: typography.small.fontSize,
    color: colors.textSecondary,
  },
  parkingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    color: colors.primary,
  },
  priceUnit: {
    fontSize: typography.small.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: `${colors.primary}1A`, // 10% opacity
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
});
```

### 4. Bottom Navigation (with Floating FAB)

**Stitch HTML:**
```html
<nav class="fixed bottom-0 bg-white border-t px-6 py-3 flex justify-between">
  <a class="flex flex-col items-center text-primary">
    <span class="material-symbols-outlined fill-1">home</span>
    <span class="text-xs font-bold">Home</span>
  </a>
  <!-- More tabs -->
  <div class="relative -top-8">
    <button class="size-14 rounded-full vibrant-gradient text-white shadow-lg">
      <span class="material-symbols-outlined text-3xl">add</span>
    </button>
  </div>
</nav>
```

**React Native (using React Navigation Bottom Tabs):**
```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

<Tab.Navigator
  screenOptions={{
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textTertiary,
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    tabBarStyle: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.white,
      paddingBottom: spacing.sm,
      paddingTop: spacing.xs,
    },
  }}
>
  <Tab.Screen
    name="Home"
    component={HomeScreen}
    options={{
      tabBarIcon: ({ color, focused }) => (
        <MaterialIcons
          name="home"
          size={24}
          color={color}
          style={{ fontVariationSettings: focused ? "'FILL' 1" : "'FILL' 0" }}
        />
      ),
    }}
  />
  {/* Add floating FAB separately or use custom tabBar */}
</Tab.Navigator>
```

---

## CSS Classes Not Needed in React Native

These Tailwind utilities are **not needed** in React Native (handled differently):

- ❌ `hover:`, `focus:`, `active:` → Use state in `onPress` handlers
- ❌ `dark:` → Implement with separate theme or conditional logic
- ❌ `transition-all`, `duration-300` → Use `Animated` API
- ❌ `backdrop-blur-md` → Use `BlurView` from `expo-blur`
- ❌ `cursor-pointer` → Not applicable (mobile touch)
- ❌ `select-none` → Not applicable
- ❌ `overflow-hidden` → Use `overflow: 'hidden'` in style

---

## Key Differences to Remember

1. **No CSS classes**: React Native uses JavaScript objects for styles
2. **No semantic HTML**: Use `View`, `Text`, `Image`, `TouchableOpacity`
3. **No auto-layout**: Must explicitly set `flexDirection` (defaults to `column`)
4. **Images**: Must use `<Image>` component with `source` prop
5. **Icons**: Use `@expo/vector-icons` instead of icon fonts
6. **Gradients**: Use `expo-linear-gradient` component
7. **Shadows**: Different on iOS vs Android (use elevation for Android)
8. **Units**: No `px`, `rem` - just numbers (points on iOS, dp on Android)

---

## Conversion Workflow

1. **Read Stitch HTML** → Identify structure and classes
2. **Map to Components** → View, Text, TouchableOpacity, etc.
3. **Convert Classes** → Use this guide to translate Tailwind
4. **Extract Values** → Use theme constants (colors, spacing, etc.)
5. **Test on Device** → Check on iOS and Android
6. **Refine Spacing** → Adjust based on visual comparison

---

## Tools & Extensions

**VS Code Extensions:**
- React Native Tools
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense (for reference)

**Chrome DevTools:**
- Use Stitch HTML preview to inspect styles
- Copy computed styles for reference

---

## Next Steps

1. Start with HomeScreen (has all common patterns)
2. Extract reusable components first (Button, Card, etc.)
3. Build screens progressively
4. Test frequently on device/simulator

---

**Created by:** Claude Code
**For:** ParknQuik Mobile App Redesign
**Last Updated:** March 13, 2026
