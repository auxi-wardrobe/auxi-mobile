# Design System Plan - Apple UI Kit Integration

## Overview
This document outlines the design system plan for implementing Apple's Human Interface Guidelines (HIG) into the Wardrobe React Native app, focusing on colors, spacing, and UI components.

**Reference**: [Figma Home Page Design](https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=251-1225&t=ZcEWTeBET20T8Lov-4)

---

## 1. Color System

### 1.1 Apple System Colors (iOS 17+)

#### Light Mode Colors
```typescript
const colorsLight = {
  // System Backgrounds
  systemBackground: '#FFFFFF',
  secondarySystemBackground: '#F2F2F7',
  tertiarySystemBackground: '#FFFFFF',
  
  // System Grays (Apple's semantic colors)
  systemGray: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',
  
  // Label Colors (for text)
  label: '#000000',
  secondaryLabel: '#3C3C43', // 60% opacity on white
  tertiaryLabel: '#3C3C43',  // 30% opacity on white
  quaternaryLabel: '#3C3C43', // 18% opacity on white
  
  // Separator Colors
  separator: '#C6C6C8',
  opaqueSeparator: '#38383A',
  
  // System Colors
  systemBlue: '#007AFF',
  systemGreen: '#34C759',
  systemIndigo: '#5856D6',
  systemOrange: '#FF9500',
  systemPink: '#FF2D55',
  systemPurple: '#AF52DE',
  systemRed: '#FF3B30',
  systemTeal: '#5AC8FA',
  systemYellow: '#FFCC00',
  
  // Fill Colors
  systemFill: '#787880', // 20% opacity
  secondarySystemFill: '#787880', // 16% opacity
  tertiarySystemFill: '#767680', // 12% opacity
  quaternarySystemFill: '#747480', // 8% opacity
  
  // Grouped Backgrounds
  systemGroupedBackground: '#F2F2F7',
  secondarySystemGroupedBackground: '#FFFFFF',
  tertiarySystemGroupedBackground: '#F2F2F7',
} as const;
```

#### Dark Mode Colors
```typescript
const colorsDark = {
  // System Backgrounds
  systemBackground: '#000000',
  secondarySystemBackground: '#1C1C1E',
  tertiarySystemBackground: '#2C2C2E',
  
  // System Grays
  systemGray: '#8E8E93',
  systemGray2: '#636366',
  systemGray3: '#48484A',
  systemGray4: '#3A3A3C',
  systemGray5: '#2C2C2E',
  systemGray6: '#1C1C1E',
  
  // Label Colors
  label: '#FFFFFF',
  secondaryLabel: '#EBEBF5', // 60% opacity on black
  tertiaryLabel: '#EBEBF5',  // 30% opacity on black
  quaternaryLabel: '#EBEBF5', // 18% opacity on black
  
  // Separator Colors
  separator: '#38383A',
  opaqueSeparator: '#C6C6C8',
  
  // System Colors (same as light mode)
  systemBlue: '#0A84FF',
  systemGreen: '#30D158',
  systemIndigo: '#5E5CE6',
  systemOrange: '#FF9F0A',
  systemPink: '#FF375F',
  systemPurple: '#BF5AF2',
  systemRed: '#FF453A',
  systemTeal: '#64D2FF',
  systemYellow: '#FFD60A',
  
  // Fill Colors
  systemFill: '#787880', // 36% opacity
  secondarySystemFill: '#787880', // 32% opacity
  tertiarySystemFill: '#767680', // 24% opacity
  quaternarySystemFill: '#747480', // 18% opacity
  
  // Grouped Backgrounds
  systemGroupedBackground: '#000000',
  secondarySystemGroupedBackground: '#1C1C1E',
  tertiarySystemGroupedBackground: '#2C2C2E',
} as const;
```

### 1.2 Semantic Color Mapping

Map Apple's semantic colors to your app's use cases:

- **Primary Actions**: `systemBlue`
- **Success States**: `systemGreen`
- **Error States**: `systemRed`
- **Warning States**: `systemOrange`
- **Destructive Actions**: `systemRed`
- **Accent/Highlight**: `systemPurple` or `systemIndigo`

### 1.3 Color Usage Guidelines

1. **Text Colors**: Always use semantic label colors (`label`, `secondaryLabel`, etc.)
2. **Backgrounds**: Use system background colors for hierarchy
3. **Interactive Elements**: Use system colors for buttons, links, and interactive states
4. **Separators**: Use `separator` for dividers between content sections

---

## 2. Spacing System (8pt Grid)

### 2.1 Apple's 8pt Grid System

Apple uses an 8-point grid system for consistent spacing. All spacing values should be multiples of 8.

```typescript
const sizes = [
  4,   // 0.5x (4pt) - Tight spacing, icon padding
  8,   // 1x (8pt) - Base unit, minimum touch target padding
  12,  // 1.5x (12pt) - Small spacing
  16,  // 2x (16pt) - Standard spacing, card padding
  20,  // 2.5x (20pt) - Medium spacing
  24,  // 3x (24pt) - Large spacing, section spacing
  32,  // 4x (32pt) - Extra large spacing
  40,  // 5x (40pt) - Section dividers
  48,  // 6x (48pt) - Major section spacing
  64,  // 8x (64pt) - Screen edge padding
  80,  // 10x (80pt) - Large screen edge padding
] as const;
```

### 2.2 Spacing Guidelines

#### Component Spacing
- **Card Padding**: `16pt` (padding_16)
- **Section Spacing**: `24pt` (marginVertical_24)
- **Screen Edge Padding**: `16pt` or `20pt` (paddingHorizontal_16/20)
- **Element Spacing**: `8pt` or `12pt` (gap_8, gap_12)
- **List Item Spacing**: `8pt` (marginBottom_8)

#### Touch Target Sizes
- **Minimum Touch Target**: `44pt × 44pt` (Apple HIG requirement)
- **Button Padding**: `12pt` vertical, `16pt` horizontal
- **Icon Size**: `24pt` or `28pt` with `8pt` padding

### 2.3 Layout Spacing Examples

```typescript
// Card Component
<View style={[
  theme.backgrounds.secondarySystemBackground,
  theme.padding_16,
  theme.borders.radius_16,
  theme.marginBottom_16,
]}>
  {/* Card content */}
</View>

// Screen Container
<View style={[
  theme.backgrounds.systemBackground,
  theme.paddingHorizontal_16,
  theme.paddingTop_24,
]}>
  {/* Screen content */}
</View>

// List Item
<View style={[
  theme.paddingVertical_12,
  theme.paddingHorizontal_16,
  theme.marginBottom_8,
]}>
  {/* List item content */}
</View>
```

---

## 3. Typography System

### 3.1 SF Pro Font Sizes (Apple's Typography Scale)

```typescript
const fontSizes = {
  // Large Titles
  largeTitle: 34,    // For main screen titles
  title1: 28,        // For section headers
  title2: 22,        // For subsection headers
  title3: 20,        // For card titles
  
  // Body Text
  headline: 17,      // Bold body text
  body: 17,         // Regular body text
  callout: 16,       // Slightly smaller body text
  
  // Supporting Text
  subheadline: 15,   // Supporting text
  footnote: 13,      // Captions, metadata
  caption1: 12,      // Small captions
  caption2: 11,      // Smallest text
} as const;
```

### 3.2 Font Weights

```typescript
const fontWeights = {
  ultraLight: '100',
  thin: '200',
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '900',
} as const;
```

### 3.3 Typography Usage

- **Large Titles**: Screen headers, main headings
- **Title 1-3**: Section headers, card titles
- **Headline**: Important body text (bold)
- **Body**: Primary content text
- **Subheadline**: Secondary information
- **Footnote/Caption**: Metadata, timestamps, labels

---

## 4. Border Radius System

### 4.1 Apple's Corner Radius Guidelines

```typescript
const borderRadius = {
  small: 8,      // Small cards, buttons
  medium: 12,     // Standard cards
  large: 16,      // Large cards, modals
  extraLarge: 20, // Full-width cards
  round: 9999,    // Circular elements (avatars, pills)
} as const;
```

### 4.2 Usage Guidelines

- **Buttons**: `8pt` or `12pt` radius
- **Cards**: `12pt` or `16pt` radius
- **Modals/Sheets**: `16pt` or `20pt` top corners
- **Avatars**: `9999pt` (circular)
- **Pills/Tags**: `9999pt` (circular)

---

## 5. Component Patterns

### 5.1 Card Component Pattern

```typescript
// Standard Card
<View style={[
  theme.backgrounds.secondarySystemBackground,
  theme.padding_16,
  theme.borders.radius_16,
  theme.marginBottom_16,
]}>
  {/* Card content */}
</View>

// Grouped Card (iOS style)
<View style={[
  theme.backgrounds.systemGroupedBackground,
  theme.paddingVertical_8,
]}>
  <View style={[
    theme.backgrounds.secondarySystemGroupedBackground,
    theme.padding_16,
    theme.borders.radius_12,
  ]}>
    {/* Card content */}
  </View>
</View>
```

### 5.2 Button Patterns

```typescript
// Primary Button
<TouchableOpacity style={[
  theme.backgrounds.systemBlue,
  theme.paddingVertical_12,
  theme.paddingHorizontal_24,
  theme.borders.radius_12,
  { minHeight: 44 }, // Minimum touch target
]}>
  <Text style={[
    theme.fonts.size_17,
    theme.fonts.bold,
    { color: '#FFFFFF' },
  ]}>
    Button Text
  </Text>
</TouchableOpacity>

// Secondary Button (Outlined)
<TouchableOpacity style={[
  theme.borders.width_1,
  theme.borders.colors.systemGray4,
  theme.paddingVertical_12,
  theme.paddingHorizontal_24,
  theme.borders.radius_12,
  { minHeight: 44 },
]}>
  <Text style={[
    theme.fonts.size_17,
    theme.fonts.bold,
    theme.fonts.colors.label,
  ]}>
    Button Text
  </Text>
</TouchableOpacity>
```

### 5.3 List Item Pattern

```typescript
<TouchableOpacity style={[
  theme.backgrounds.secondarySystemBackground,
  theme.paddingVertical_12,
  theme.paddingHorizontal_16,
  theme.marginBottom_1, // Separator
]}>
  <View style={[theme.layout.row, theme.layout.justifyBetween, theme.layout.itemsCenter]}>
    <Text style={[theme.fonts.size_17, theme.fonts.colors.label]}>
      List Item Title
    </Text>
    <Text style={[theme.fonts.size_15, theme.fonts.colors.secondaryLabel]}>
      Subtitle
    </Text>
  </View>
</TouchableOpacity>
```

---

## 6. Implementation Strategy

### 6.1 Phase 1: Update Theme Configuration

1. **Update `_config.ts`**:
   - Replace current color palette with Apple system colors
   - Update spacing sizes to 8pt grid system
   - Add SF Pro font sizes
   - Update border radius values

2. **File**: `template/src/theme/_config.ts`

### 6.2 Phase 2: Create Component Library

1. **Create reusable components**:
   - `Card.tsx` - Standard card component
   - `Button.tsx` - Primary/secondary buttons
   - `ListItem.tsx` - List item component
   - `SectionHeader.tsx` - Section headers
   - `Separator.tsx` - Dividers

2. **Location**: `template/src/components/molecules/` or `template/src/components/organisms/`

### 6.3 Phase 3: Apply to Home Screen

1. **Analyze Figma design**:
   - Extract exact colors, spacing, and component patterns
   - Map to Apple system colors
   - Identify reusable components

2. **Implement Home Screen**:
   - Use new theme system
   - Apply Apple spacing guidelines
   - Use semantic colors

### 6.4 Phase 4: Typography Integration

1. **Add SF Pro fonts** (if not already included):
   - iOS: System font (SF Pro) is default
   - Android: Use Roboto or add SF Pro font files

2. **Update font configuration**:
   - Map font sizes to SF Pro scale
   - Add font weight variants

---

## 7. Apple Design Principles

### 7.1 Key Principles to Follow

1. **Clarity**: Clear hierarchy, readable text, appropriate contrast
2. **Deference**: UI supports content, not competes with it
3. **Depth**: Use layers, motion, and depth to communicate hierarchy

### 7.2 Visual Hierarchy

- **Primary Actions**: Use `systemBlue` with bold text
- **Secondary Actions**: Use outlined buttons or text buttons
- **Destructive Actions**: Use `systemRed`
- **Content Hierarchy**: Use font sizes and weights to establish hierarchy

### 7.3 Motion and Animation

- **Transitions**: Smooth, natural animations (200-300ms)
- **Feedback**: Immediate visual feedback on interactions
- **Haptics**: Use haptic feedback for important actions (iOS)

---

## 8. Next Steps

1. **Review Figma Design**: Extract exact values from the design
2. **Update Theme Config**: Implement Apple system colors and spacing
3. **Create Component Library**: Build reusable components following Apple patterns
4. **Apply to Home Screen**: Implement the home screen using the new design system
5. **Test on Devices**: Verify appearance on iOS and Android devices
6. **Documentation**: Update theme documentation with new system

---

## 9. Resources

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [SF Symbols](https://developer.apple.com/sf-symbols/)
- [iOS Design Resources](https://developer.apple.com/design/resources/)
- [Color Guidelines](https://developer.apple.com/design/human-interface-guidelines/color)

---

## 10. Notes

- **Accessibility**: Ensure all color combinations meet WCAG AA contrast ratios
- **Dark Mode**: All colors must have dark mode variants
- **Platform Differences**: iOS and Android may have slight differences in appearance
- **Testing**: Test on multiple device sizes and orientations
