# Say it

A mobile-first English practice app for Korean speakers. It is a static site with no build step or server database. Lesson data is split into JSON files; practice progress, saved phrases, and custom lessons stay in the learner's browser using local storage.

## Content database

The root `database.json` is a manifest listing the category file, lesson files, and original lesson order. Category names are in `data/categories.json`; each category's lessons are in `data/lessons/<category-id>.json`. The database includes 301 examples from the reference guide, 40 additional question patterns, 24 common everyday conversation examples, and 48 teaching and research examples, including 21 classroom question patterns, arranged in five broad categories. Lessons are ordered by estimated everyday usefulness; this is an editorial ranking, not a measured corpus frequency.

To add a lesson, add an object to the matching category file and add its ID to `lessonOrder` in the root manifest. Keep the incorrect example in `bad`; stories should model the natural alternative and never repeat the less-natural wording. Stories display as prose in the app.

## Practice approach

Choose a sentence, read its natural version, and review the explanation and story shown on its detail page. Try using it in a real conversation. Use the plus/minus counter after each real use; the app counts up to 10 and then archives that sentence. Decreasing the count below 10 restores it to active practice. Archived sentences stay available in the Archive tab. Save useful phrases with the heart button to add them to **Your practice** on the home page. The **Add** tab lets you save your own sentence and natural version on this device. Use **Hide** on a sentence you already know. It leaves active practice without changing its use count. Find it under **Hidden by you** in Archive and tap **Restore** if you want to practice it again. Counts, saved phrases, custom lessons, hidden lessons, and the archive are stored in this browser on this device.

## Run locally

The app loads its JSON database with `fetch`, so open it through a local web server instead of double-clicking `index.html`. For example, run `python3 -m http.server 8000` in this directory and visit `http://localhost:8000`.

## Publish with GitHub Pages

Push the repository to GitHub, then open **Settings → Pages**. Choose **Deploy from a branch**, select `main` and `/ (root)`, and save. GitHub Pages will serve the app, manifest, and category lesson files directly.
