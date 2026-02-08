# Design System Quick Reference

Quick reference guide for implementing Apple UI Kit design system.

## Color Quick Reference

### Most Common Colors

```typescript
// Light Mode
systemBackground: '#FFFFFF'
secondarySystemBackground: '#F2F2F7'
label: '#000000'
secondaryLabel: '#3C3C43' // 60% opacity
systemBlue: '#007AFF'
systemRed: '#FF3B30'
separator: '#C6C6C8'

// Dark Mode
systemBackground: '#000000'
secondarySystemBackground: '#1C1C1E'
label: '#FFFFFF'
secondaryLabel: '#EBEBF5' // 60% opacity
systemBlue: '#0A84FF'
systemRed: '#FF453A'
separator: '#38383A'
```

## Spacing Quick Reference

```typescript
// Most Common Spacing Values
4pt  → padding_4   // Tight spacing
8pt  → padding_8   // Base unit
12pt → padding_12  // Small spacing
16pt → padding_16  // Standard spacing (most common)
20pt → padding_20  // Medium spacing
24pt → padding_24  // Large spacing
32pt → padding_32  // Extra large
```

### Usage Patterns

- **Screen Padding**: `paddingHorizontal_16` or `paddingHorizontal_20`
- **Card Padding**: `padding_16`
- **Section Spacing**: `marginVertical_24`
- **Element Gap**: `gap_8` or `gap_12`
- **Touch Target**: Minimum `44pt` height

## Typography Quick Reference

```typescript
// Font Sizes
largeTitle: 34  // Main screen titles
title1: 28      // Section headers
title2: 22      // Subsection headers
title3: 20      // Card titles
headline: 17    // Bold body (most common)
body: 17        // Regular body (most common)
subheadline: 15 // Supporting text
footnote: 13    // Captions
caption1: 12    // Small captions
```

### Usage

- **Screen Title**: `fontSize_34` + `fontWeight_bold`
- **Section Header**: `fontSize_28` + `fontWeight_bold`
- **Card Title**: `fontSize_20` + `fontWeight_semibold`
- **Body Text**: `fontSize_17` + `fontWeight_regular`
- **Caption**: `fontSize_13` + `fontWeight_regular`

## Border Radius Quick Reference

```typescript
small: 8      // Buttons, small cards
medium: 12    // Standard cards
large: 16     // Large cards, modals
extraLarge: 20 // Full-width cards
round: 9999   // Circular (avatars, pills)
```

## Component Patterns

### Standard Card
```typescript
<View style={[
  theme.backgrounds.secondarySystemBackground,
  theme.padding_16,
  theme.borders.radius_16,
  theme.marginBottom_16,
]}>
```

### Primary Button
```typescript
<TouchableOpacity style={[
  theme.backgrounds.systemBlue,
  theme.paddingVertical_12,
  theme.paddingHorizontal_24,
  theme.borders.radius_12,
  { minHeight: 44 },
]}>
```

### List Item
```typescript
<TouchableOpacity style={[
  theme.backgrounds.secondarySystemBackground,
  theme.paddingVertical_12,
  theme.paddingHorizontal_16,
]}>
```

## Common Style Combinations

### Screen Container
```typescript
style={[
  theme.backgrounds.systemBackground,
  theme.paddingHorizontal_16,
  theme.paddingTop_24,
  theme.flex_1,
]}
```

### Section Header
```typescript
style={[
  theme.fonts.size_28,
  theme.fonts.bold,
  theme.fonts.colors.label,
  theme.marginBottom_16,
]}
```

### Card Content
```typescript
style={[
  theme.backgrounds.secondarySystemBackground,
  theme.padding_16,
  theme.borders.radius_16,
  theme.marginBottom_16,
]}
```

### Separator Line
```typescript
style={[
  theme.backgrounds.separator,
  { height: 1 },
  theme.marginVertical_8,
]}
```
