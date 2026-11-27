# Anas Eslam Selim · Portfolio: "The Comeback"

A scroll-driven, cinematic portfolio told in nine scenes: leaving the Aramco schools, the GPA climb from 2.67 to 3.89, SAT Math from 410 to 800, the SAT superscore, the SFA Domes campaign, the trophy room, character, graduation and end credits.

**Live site:** https://anas-selim1.github.io

## What's inside

| Path | What it is |
|------|------------|
| `index.html` | The whole film, scene by scene (each scene is a `<section data-scene>`) |
| `css/style.css` | Design: ink black, paper white and signal orange; Big Shoulders Display, Instrument Serif, JetBrains Mono |
| `js/main.js` | Opening slate, pinned scroll scenes, counters, horizontal trophy room, video controls |
| `js/vendor/` | GSAP 3.12.5 + ScrollTrigger (GSAP standard license) and Lenis 1.1.13 (MIT), stored locally |
| `assets/video/` | Hero loop and the SFA Domes campaign video |
| `assets/img/` | Photos, film stills from the campaign, favicon, social-share image |
| `assets/Anas_Selim_CV.pdf` | Downloadable CV |

Without JavaScript, or with "reduce motion" turned on, every scene shows as a normal readable section.

## Publish on GitHub Pages

Settings → Pages → Deploy from a branch → `main` / root. The site goes live at https://anas-selim1.github.io a minute or two after each push to `main`.

## Updating content

- Text: edit `index.html`.
- Numbers that animate (GPA, SAT, views) are also set in `js/main.js`; change both places.
- Photos: replace files in `assets/img/` with the same names.
