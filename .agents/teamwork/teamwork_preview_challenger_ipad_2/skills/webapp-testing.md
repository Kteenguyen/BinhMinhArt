# Webapp Testing Methodology Summary
Source: /Users/mac/.gemini/config/skills/webapp-testing/SKILL.md

Core Methodology:
- Local web application automated testing using headless Chromium via Playwright.
- Viewport configuration for target devices (e.g. iPad portrait 768x1024, 834x1194).
- Reconnaissance-then-action: navigate, wait for idle, inspect layout bounding boxes, check scroll widths (`scrollWidth <= clientWidth`), detect overlapping bounding rects.
- Capture visual evidence and empirical metrics.
