# Page Topology - Netflix Vietnam

## Overview
Netflix Vietnam landing page has a distinct stacked linear layout. Each section is a full-width block separating topics using a thick horizontal divider line or gradient border.

## Sequence of Main Sections
Based on the DOM structure (`raw_dom_report.json`):
1. **App Mount Point**: Wraps the entire application.
2. **Header/Hero Section**: Contains language selector, Sign In, and main marketing text/CTA.
3. **Feature Row TV**: TV bezel with autoplaying video.
4. **Feature Row Download**: Mobile phone with download animation.
5. **Feature Row Watch**: Everywhere access.
6. **Feature Row Kids**: Profile creation for kids.
7. **FAQ Section**: Accordion.
8. **Footer**: Site map.

## Interaction Model
- **Header**: Sticky/Absolute overlay.
- **Hero**: Static content.
- **Feature Rows**: Auto-playing video, interactive overlays.
- **FAQ**: Click-driven accordion.
