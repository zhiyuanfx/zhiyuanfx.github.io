# Zhiyuan Jia · Personal website

A static Astro website for research, projects, experience, publications, and mathematical notes. The homepage is one continuous page; individual note articles have their own URLs.

## Develop

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open the local URL printed by Astro. For the production output:

```sh
npm run build
npm run preview
```

## Edit portfolio content

Update `src/data/profile.ts` for the introduction, contact links, news, research, projects, experience, education, and publication. The portrait, capybara illustration, and downloadable résumé live in `src/assets/`. Main styling is in `src/styles/global.css`.

The collection contains two mathematical demonstration notes and four explicitly labeled placeholders for research and project write-ups. Research, experience, and publication entries share related notes through `noteId` in the profile data. The homepage build checks that every referenced note exists.

## Add a local note post

Create `src/content/notes/my-new-note.md`:

```md
---
title: 'My new note'
date: 2026-09-16
keywords: ['Optimization', 'Mathematics']
---
The opening paragraph becomes the preview in the note list.

## An equation

Inline mathematics: $Ax=b$.

Display mathematics:

$$
\begin{aligned}
f(x) &= \frac{1}{2}x^\top A x-b^\top x, \\
\nabla f(x) &= Ax-b.
\end{aligned}
$$
```

The filename determines the URL: `/notes/my-new-note/`. Titles, valid dates, and at least one keyword are required. Dates are displayed in UTC to avoid timezone shifts. Add `Demo` or `Placeholder` as a keyword if that label applies.

Astro loads these files from disk and generates pages during the build. All files in this directory are published when deployed; keep unfinished private drafts outside it. Updating Markdown locally updates the development preview. A deployed site changes after another build and deployment.

Math uses bundled KaTeX, with no external script or font request required. Inline `$...$` and block `$$...$$` support KaTeX's LaTeX subset, including `aligned`, `bmatrix`, fractions, sums, and integrals. Wide display equations scroll locally. Unsupported commands should be corrected before publishing; KaTeX is not a full TeX engine.

## Search behavior

Search matches literal, case-insensitive substrings in the title, individual keywords, and complete article text. It counts non-overlapping occurrences and returns each article once. The excerpt comes from the first matching field in that order. Markdown formatting is excluded, and each original mathematical expression is indexed once as LaTeX, before visual HTML/MathML rendering.

The arrow button toggles latest/oldest order. Search and sort selections persist in URL parameters (`q` and `sort=asc`). Opening a note saves the current page position in session storage; the return link restores that position and filter/order without smooth-scrolling from the top. Browser Back restores it as well. Without session storage, return links fall back to the originating section. Without JavaScript, all articles and content remain readable, listed latest first.

## Validate

```sh
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Browser tests exercise 320, 375, 768, 1440, and 1920 pixel widths, math overflow, navigation, filtering, sorting, return state, and reduced motion.

## Deploy

The existing `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on pushes to `main` or manual workflow dispatch. The configured production URL is `https://zhiyuanfx.github.io`. This implementation does not publish anything automatically from your local workspace; committing and pushing to `main` will trigger the existing workflow.

The footer last-update date is explicit in `profile.lastUpdated`; update it when revising site content. The footer illustration currently reuses the supplied capybara as a placeholder for a future asset. The two original `/blogs/` article URLs redirect to `/notes/` for compatibility.

Notes may include an optional `subtitle` frontmatter field; it appears immediately below the main title.
