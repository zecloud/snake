# snake

Snake jouable avec les contributions GitHub.

A standalone, accessible French-language Snake game themed around @zecloud's
public GitHub contributions. The personal blog is independent and unchanged.

## Status and publication

Intended project URL: `https://www.zecloud.fr/snake/` (or the Pages URL returned
by GitHub). This is **not a verified live link** until deployment succeeds.
No custom `CNAME` belongs in this project; the user-site custom domain is inherited
by project sites. Do not change the personal site's domain or Pages configuration.

After the implementation PR is reviewed and merged into `main`, use GitHub
Actions as the Pages source **in this repository only**. The Pages workflow
validates the game, uploads only its five static assets, then deploys from `main`.
Check the deployment URL and actual response before marking the profile link live.
No PR is merged automatically.

## Local use and checks

```sh
python -m http.server 8000
# Open http://localhost:8000/
node --test tests/snake.test.mjs
python -m unittest discover -s tests -p 'test_*.py'
node --input-type=module --check < app.js
```

All local asset references are relative, so the same files work below `/snake/`.
Blog and profile links are absolute. ES modules and JSON loading require HTTP.
No dependencies or build step are needed.

## Contribution data

```sh
python scripts/update-contributions.py
```

The generator reads the public GitHub contribution calendar for `zecloud` without
any token. It validates consecutive dates and intensity levels and atomically
replaces the checked-in `contributions.json`. Errors preserve the previous
snapshot. Review and commit updates normally; CI never writes refreshed data.
The browser fetches only this local snapshot and shows its date, marking data
older than eight days as historical. Invalid/unavailable data explicitly enables
a neutral practice grid rather than inventing contributions.

The latest 364 days are folded into 26 columns of 14 days each, oldest first,
top to bottom then left to right. Green intensity is GitHub's 0–4 level, not a
claimed count of contributions. Dotted contribution-day targets are collected
one at a time; collecting all targets wins.

## Controls and accessibility

There is no autoplay. Select a speed, then **Jouer**. Arrow keys or WASD control
the focused board; Space starts/pauses, Escape pauses, R resets. Direction buttons
support touch and keyboard use. Walls and the snake's body end play; only one
turn is accepted per tick. The game pauses when you leave its controls, hide
the page, or switch windows, and never resumes automatically.

**Pas à pas** advances one cell per valid direction without a timer. It is the
default under reduced motion. Text coordinates and **Lire la position** expose
head and target position; status messages announce score, pause and completion.

The profile README and animated/static preview are maintained separately in
`zecloud/zecloud`; update its pending link only after this game is verified live.
