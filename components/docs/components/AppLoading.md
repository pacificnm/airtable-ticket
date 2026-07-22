# AppLoading

Full-screen loading state shown while the app is waiting on initial data (e.g. the Airtable base) to load.

**Source:** `components/AppLoading.tsx`

## Usage

```tsx
import { AppLoading } from './components/AppLoading';

if (baseLoading) {
  return <AppLoading label="Loading Service Desk..." />;
}
```

## Props

| Prop  | Type     | Default       | Description                                  |
|-------|----------|---------------|-----------------------------------------------|
| label | `string` | `'Loading...'` | Message shown below the spinner. |

`label` is optional so the component works with a sensible default out of the box, but callers should pass an app-specific message (e.g. `"Loading Service Desk..."`) to make the loading state meaningful for their app.

## Notes

- Renders a full-viewport (`h-screen`) centered layout with a spinning indicator and a text label.
- The spinner has `role="status"` and `aria-label="Loading"` for accessibility; the visible `label` text is decorative/supplementary and not read as the accessible name.
- Has no internal state or side effects — it's a pure presentational component, safe to reuse across apps.
