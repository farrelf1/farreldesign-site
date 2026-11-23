# Editing the site

You don't need to build anything. Edit the files, save, check, and publish.

## 1. Change text

All the words on the site are in **index.html**. Open it in any text editor (VS Code is easiest), press Cmd+F, search for the words you want to change, then type over them.

| What | Where in index.html |
|---|---|
| Browser tab title and Google description | `<title>` and `<meta name="description">` at the top |
| Big headline and the line under it | `id="hero-title"` and `class="hero-sub"` |
| Work experience (BRI, MAP Active, FIFGROUP) | each `<li class="project" ...>` block |
| ...the date line | `class="project-kind project-when"` |
| ...the short text on the page | the `<p>` under `class="project-title"` |
| ...the text in the "Open project" popup | the `<div class="project-more" hidden>` block under it |
| Additional projects | each `<li data-image="">` under `class="extra-list"` |
| About, skills, experience, education, languages | the `<section class="about" ...>` block |
| Email, LinkedIn, phone | the `<section class="contact" ...>` block (the email is also in the hero) |

Rules that keep it from breaking:
- Only change the words *between* the tags. Leave anything in `< >` alone.
- To write `&`, type `&amp;`.
- In the popup's stat row, each `<dd>` is the big number and the `<dt>` before it is its label.

## 2. Add real images

1. Export the image as **.jpg** (or .webp), about **1600 x 1000 px**, under about 500 KB. The frames are 16:10 and crop to fill.
2. Put the file in the **images** folder. Use a simple name with no spaces, such as `bri.jpg`.
3. In index.html, find that project and fill in `data-image`:
   - Work: `<li class="project" data-index="0" data-image="images/bri.jpg">`
   - Additional projects: `<li data-image="images/saff.jpg">`

That one change puts the image in the list, the big viewer, the thumbnail and the popup, and removes the "Image goes here" label. To go back to the placeholder, empty it again: `data-image=""`.

Work order: data-index 0 is BRI, 1 is MAP Active, 2 is FIFGROUP.

## 3. Check before publishing

Double-click index.html to open it in your browser and look it over. (The live "visitor" cursors only work on the real site.)

## 4. Publish

In Terminal:

```
cd "/Users/tbfarrel/Documents/Portfolio Website/farreldesign-site"
git pull
git add -A
git commit -m "Update text and images"
git push
```

farreldesign.site updates within about a minute. Hard-refresh with Cmd+Shift+R to see it.

## Other settings

- **js/live-config.js** holds the Supabase keys (live cursors) and the Clarity ID (heatmaps). You normally won't touch it.
- **css/** and **js/app.js** are generated. Don't edit them by hand. Ask Claude for design changes.
