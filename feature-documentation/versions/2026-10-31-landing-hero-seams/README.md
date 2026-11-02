# Landing: the opening by default, a 3D hero, section arrivals and pictures instead of text

Requests from the project owner on 31 October and 2 November, delivered together because they share the landing page's motion and 3D scenes.

## The opening is the default

**Skip intro** is removed. The opening (the EduPulse mark and name on a field of facets that opens like an aperture) now plays whenever the landing page loads at its top, a reload included; before, it played once per browser tab. Back and Forward, links to a section, later returns within the same visit and reduced motion still start without it, because the reader asked for another place or for no motion. A keyboard user who presses Tab into the hero plays the opening forward to its end instead of removing it, so focus never sits under the facets.

## The hero

The hero had a summary, three notes, the Syllabus Builder screen and a CIT photograph; the Features section shows the same screens. It now holds the institution line, the title, **Get started** and **See how it works**, and an emblem: the Pulse ring as a halo around the KCP crest and the CIT seal. When WebGL runs, the emblem is 3D: the ring tips back, the seals are porcelain medallions with blue rims that turn in from edge-on as the opening clears, float, catch a travelling light and tilt with the pointer, and white and pale-blue planes with one blue accent drift around them. Every movement is damped on long curves. The seals on the medallions are drawn from the hero's own images. Without WebGL, with reduced motion and in the screenshots, the same composition is flat: the SVG ring around two seal images.

## Section arrivals

A first version (31 October) passed a shutter and a band of shards over each section's top, after which the section's content simply stood there. On 2 November the owner asked for the transition to end in the content itself, with no gap between the effect and the section. It now does:

- **Cards are built where they stand.** Faceted pieces cut from a card's own outline (triangles, fans, slats or tiles, per section) travel in from the section's side as glowing blue wireframe and fill with the section's material while the cluster swings in like a camera settling: brushed aluminium, iridescent glass, anodized blue, glazed ceramic, or a circuit board with glowing traces, lit by a slowly turning studio environment so light moves across them. A blue frame locks onto the card's corners, the pieces meet edge to edge exactly over the card, flash along their seams, cool into the card's own surface and dissolve as the real card appears in their place. Then its icon, heading and text rise into place one after another.
- **Text settles too.** Headings, labels and lists without a card rise into place line by line.
- **It follows the reader.** Each block follows its own position (it starts when its centre reaches the bottom of the screen and has settled when its centre is a little above the middle), through a damping of about 140 ms. A block that is half way in stays half way in, scrolling back takes it apart again, cards side by side follow one another, and every block has settled at the end of the page.
- **Nothing covers the page.** The pieces are drawn on one fixed canvas under the top bar that takes no pointer events and renders only while a card is being built; the inline styles are removed once a block has settled. Pinned stages, the sign-in form and the photographs keep their own entrances. Without WebGL the cards rise into place; with reduced motion nothing is hidden or moved.

## Pictures instead of text

- **How it works:** each phase is a card with its icon, who works in it as chips with icons, one line on what happens, and the hand-over drawn as a dashed **AI** box (the draft) with an arrow to a solid **People** box (the decision). The duty lines were shortened; their facts are unchanged.
- **Roles:** each panel shows the role's icon, its four tasks as icon tiles and its top bar drawn in miniature.
- **Why it matters:** each finding is a tile with an icon, and the 31% finding has a meter (fill in the accent blue on a lighter track of the same blue). The findings come from different studies and are not compared. The SDGs have icons.

## Files

`src/components/landing/Hero.jsx`, `PulseRing.jsx`, `Opening.jsx`, `intro.js`, `motion.js` (comment), `ProblemSection.jsx`, `PhaseFlow.jsx`, `RoleExplorer.jsx`, `ImpactSection.jsx`, `CollegesSection.jsx`, `content.js`, `landing.css`, `scene/landingScene.js`, `seams.js` and `scene/seamScene.js`, and `src/pages/Landing.jsx`. Design rules: `docs/DESIGN.md`. Tests: `tests/browser/landing.spec.ts`.

No dependency, route, data, permission or backend change.

See [validation](validation/results.md). Image 1 of [01 · Public site](../../system-walkthrough/01-public-site/README.md) and of [06 · Mobile](../../system-walkthrough/06-mobile/README.md) show the new hero, and images 5, 6, 7 and 9 of the public site show the new phase cards, role panels and finding tiles; the walkthrough and [Getting started](../../system-manual/01-getting-started/README.md) describe the opening, the 3D hero and the arrivals.
