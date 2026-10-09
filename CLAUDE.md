# Claude agent instructions — life-admin

How to work in this repo. [`README.md`](README.md) describes what the app does; read it first.
Then read only the source files the task needs.

## Layout

| File | Owns |
|---|---|
| `src/types.ts` | The data model: `Task`, `Bill`, `AppData`, and the four priorities. |
| `src/bills.ts` | Monthly bill copies and the daily cleanup (`maintain`). Pure. |
| `src/tasks.ts` | Sorting, grouping, and every task edit, including checklist rules. Pure. |
| `src/storage.ts` | All persistence, backups, and validation of untrusted input. |
| `src/gestures.ts` | Swipe and hold-to-drag, written against the DOM. |
| `src/App.tsx` | State, and wiring the panels to the pure modules. |
| `src/components/` | The task row and the add, menu, and bills panels. |

## Rules that are load-bearing

Each of these was asked for by the user. Changing one needs their approval.

- **Monthly bills always sit in Critical** and can't be dragged. Everything else can be moved to
  any list.
- **A due date never moves a task.** It's information only.
- **Missed bill months are caught up**, oldest first. A copy the user deleted is never recreated:
  `lastGenerated` has already moved past it.
- **Finished tasks stay visible, struck through, for the rest of the day**, then are deleted the
  next time the app runs `maintain`.
- **Destructive actions are recoverable:** delete and clear show **Undo**; clearing a list and
  importing a backup each take a second tap.
- **Fewer buttons is a stated goal.** Prefer a gesture or an in-place edit over a new button, and
  ask before adding a visible control.

## Technical limits

- **All persistence goes through `storage.ts`.** No component touches `localStorage`.
- **Service worker is `registerType: 'prompt'`.** Never `autoUpdate`: it can swap the app out
  while the user is typing.
- **`base`, `start_url`, and `scope` must all be `/life-admin/`.** A mismatch shows a blank page
  or opens the installed app in a Safari tab.
- **Inputs stay at 16px or larger.** iOS zooms the page when a smaller field is focused.
- **Keyboard focus must happen inside the tap.** iOS only raises the keyboard when `focus()`
  runs during the user's gesture, which is why the add panel and rename use `flushSync`.
- **No router, no accounts, no sync.** The app runs standalone with no back button, and each
  device keeps its own data.

## Testing

- `npm test` covers the pure modules and storage. Storage tests install an in-memory
  `localStorage` from `src/testing.ts`, because Node's own one shadows jsdom's.
- Gestures and keyboard behaviour need a real iPhone. Say so when a change touches them
  rather than claiming it works.

## Working agreement

- Present a short plan (files, approach, trade-offs) and wait for approval before writing code.
- Branch `feature/`, `fix/`, or `chore/`. Never commit to `main` directly. Don't push unless asked.
- Commit messages: short imperative sentence, no period.
- Comments explain *why*. Comments on the rules above are load-bearing, not cleanup targets.

## Requires explicit approval

- Anything under **Rules that are load-bearing**
- Deleting or renaming files
- Changing `package.json`, `vite.config.ts`, or `.github/workflows/`
- Adding any runtime dependency
- Pushing to remote or opening a PR
