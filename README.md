# Life Admin

A to-do list for bills, paperwork, errands, and chores, sorted into four lists:
**Critical**, **High**, **Medium**, and **Remaining**. It installs to the iPhone Home Screen,
opens full screen, works offline, and keeps everything on the device.

Live at `https://rishav30194.github.io/life-admin/` once deployed.

## How it works

- **Monthly bills:** add each bill once in **Menu** > **Monthly bills** with the day of the month
  it's due. On that day a copy appears at the top of Critical and stays until you tick it off.
  A month the app wasn't opened is still added, so a missed bill can't disappear. A bill set
  for the 31st shows on the last day of shorter months.
- **Bills can't be deleted from the list,** only ticked off. Swiping left does nothing on a bill,
  and clearing Critical leaves bills in place. In **Monthly bills**, tap a name to rename it
  (the copy in Critical follows), change its day, or **Stop** it to end future months.
- **Tasks:** add with **+**, choosing a list, an optional due date, and optionally a checklist.
  A due date is shown on the task but never moves it.
- **Moving:** hold a task for about half a second, then drag it onto another list. Monthly bills
  stay in Critical.
- **Finishing and deleting:** tick a task or swipe it right to finish it. It stays struck through
  until the end of the day, then disappears. Swipe left to delete, with **Undo**. Bills don't swipe left.
- **Editing:** tap a task's name to rename it. The arrow on the right opens its due date and
  checklist. Clear an item's text to remove it.
- **Menu:** monthly bills, collapse or expand all lists, clear a list, and backups.

## Your data

Tasks are stored in the browser's local storage on each device. There is no account and no
sync, and nothing is sent anywhere.

- **Install to the Home Screen.** Safari can delete a website's data after 7 days of browsing
  without visiting it; WebKit exempts apps added to the Home Screen. The app also asks the
  browser to keep its data.
- **Export a backup now and then** from **Menu** > **Backup**, and use **Import** to restore it
  or move to a new phone. Importing replaces the current list.

## Install on iPhone

1. In Safari, open the live address.
2. Select **Share** > **Add to Home Screen**.
3. Open Life Admin from the Home Screen icon.

When a new version is deployed, the app shows **A new version is ready** with a **Reload**
button. It never updates itself while open.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173/life-admin/
npm test           # vitest
npm run build      # type-check and build to dist/
```

Pushing to `main` runs `.github/workflows/deploy.yml`: tests, build, and deploy to GitHub Pages.
The repository's **Settings** > **Pages** source must be set to **GitHub Actions**.

The app icons are drawn by `scripts/make-icons.py` (needs Pillow). The Archivo and IBM Plex Mono
fonts in `public/fonts` are under the SIL Open Font License.
