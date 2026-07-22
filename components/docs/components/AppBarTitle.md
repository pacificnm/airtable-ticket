# AppBarTitle

Two-line title block shown in the app bar: a serif title on top and a smaller subtitle line beneath it.

**Source:** `components/AppBarTitle.tsx`

## Usage

```tsx
import { AppBarTitle } from './AppBarTitle';

<AppBarTitle title="Service Desk" subtitle={`${ticketCount} tickets`} />
```

## Props

| Prop     | Type     | Description                              |
|----------|----------|-------------------------------------------|
| title    | `string` | Main heading text (e.g. app/section name). |
| subtitle | `string` | Secondary line shown below the title.      |

Both props are required strings — the caller is responsible for formatting the subtitle text (e.g. pluralizing a count into `"3 tickets"`) before passing it in.

## Notes

- Purely presentational — no internal state or side effects.
- Generic and reusable: it has no app-specific text baked in, so it can be reused for other title/subtitle pairs beyond the Service Desk app bar.
- Currently used in [Header.tsx](../../Header.tsx) to render the app name and live ticket count.
