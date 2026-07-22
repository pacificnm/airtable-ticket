# AppError

Full-screen error state shown when the app fails to load (e.g. can't connect to the Airtable base).

**Source:** `components/AppError.tsx`

## Usage

```tsx
import { AppError } from './components/AppError';

if (baseError || !base) {
  return <AppError message={baseError?.message} />;
}

if (!tables) {
  return <AppError title="Missing tables" message="Required tables not found in the base." />;
}
```

## Props

| Prop    | Type     | Default                              | Description                    |
|---------|----------|---------------------------------------|----------------------------------|
| title   | `string` | `'Unable to load'`                    | Heading text.                    |
| message | `string` | `'Failed to connect to the database.'` | Supporting error detail text.    |

Both props are optional — omit either or both to fall back to the generic defaults.

## Notes

- Purely presentational — no internal state or side effects.
- Centered, full-viewport (`h-screen`) card layout, distinct from [AppLoading](./AppLoading.md) styling (error border color vs. spinner).
- Defaults are generic enough to reuse as-is; pass `title`/`message` to describe a more specific failure (e.g. missing required tables).
