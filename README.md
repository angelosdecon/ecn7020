# ECN7020 interactive problem sets

Browser-based problem sets for ECN7020 Statistical Methods and Machine Learning (SOAS Economics). Students answer written questions and run real R code in the page, with nothing to install (R runs through WebR).

Live site: https://angelosdecon.github.io/ecn7020/

## Layout

```
index.html           landing page: one card per problem set
assets/seminar.css   shared design (matches the lecture slides)
assets/seminar.js    shared engine: builds the page, runs R, hints, progress
ps1/index.html       Problem Set 1: the questions, hints, solutions and data
r-guide/index.html   a short guide to R for students, with runnable examples
```

Each problem set is one folder with one `index.html`, so its address is `.../ecn7020/ps1/`, `.../ecn7020/ps2/` and so on. The design and the R engine are shared, so a fix in `assets/` applies to every problem set.

## Adding a problem set

1. Copy the `ps1` folder and rename the copy `ps2`.
2. In `ps2/index.html`, edit the `window.SEMINAR` block:
   - `id` must be unique (`"ps2"`): it keeps each problem set's saved answers separate.
   - `eyebrow`, `title`, `lead`, `footer`: the headings.
   - `setup`: R code that creates the datasets, run once when the page loads.
   - `packages`: extra R packages to install, for example `["lmtest", "car"]`. Leave it empty if base R is enough; the page then loads faster.
   - `items`: the sections and steps, in order.
3. In the top-level `index.html`, copy a card, point it at `ps2/` and remove the class `soon`.

### Step types

- `{ type: "section", eyebrow, title, text }`: a heading between groups of steps. `text` can hold a data table.
- `{ type: "write", title, desc, h1, h2, h3 }`: a written question. `h1` is the hint, `h2` the pointers and `h3` the model answer (all HTML).
- `{ type: "r", title, desc, h1, h2, h3, h3note, code }`: an R question. `h3` is the solution code (plain text), `h3note` an optional line explaining the result, and `code` the starting text in the editor. Add `plot: { width: 900, height: 380 }` for a wider plot.

- `{ type: "text", title, html }`: a reading card with no code (used in the R guide).
- Add `hints: false` to an `r` step to make it a runnable example with no hints, and `progress: false` in the `window.SEMINAR` block to hide the progress bar (both used in the R guide).

The second hint unlocks 10 seconds after the first is opened, and the solution 10 seconds after the second is opened. Change this with `hintDelays: [10, 10]` in the `window.SEMINAR` block; `[0, 0]` unlocks everything at once.
