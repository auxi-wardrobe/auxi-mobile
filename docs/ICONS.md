# Icon Management

We use a centralized registry for all SVG icons in the project. This ensures consistency and makes it easier to manage icon assets.

## Location

- Registry: `src/assets/icons/index.ts`
- Source Files: `src/assets/images/*.svg`

## Usage

### 1. Add new SVG

Place your `.svg` file in `src/assets/images`.

### 2. Register Icon

Open `src/assets/icons/index.ts` and add:

```typescript
import IconName from '../images/filename.svg';

export const Icons = {
  // ... existing icons
  Name: IconName,
};

export {
  // ... existing exports
  IconName,
};
```

### 3. Use in Component

Import `Icons` from the registry:

```typescript
import { Icons } from '../../assets/icons';

// ...

<Icons.Name width={24} height={24} />;
```

## Best Practices

- Always use the `Icons` object to access icons.
- Avoid importing SVGs directly from `src/assets/images` in components.
- Keep SVG filenames consistent (snake_case preferred for files, PascalCase for components).
