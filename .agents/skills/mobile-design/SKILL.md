---
name: mobile-design
description: Mobile-first design guidance for React Native and native iOS or Android work, including touch interaction, accessibility, performance, and platform conventions.
---

# Mobile Design

Use the guidance that applies to the requested change. First inspect the app's existing framework, navigation, state, and platform targets before asking the user; ask only when an unresolved choice would materially affect the requested design. ParkPal's mobile app uses React Native with Expo, so follow its established patterns unless the task specifies otherwise.

Read the focused reference files for the work at hand: touch and accessibility guidance for interaction changes, navigation guidance for routing, performance guidance for rendering or responsiveness, platform references for platform-specific behavior, and debugging or testing guidance when those tasks are requested. Do not read every reference for a small localized change. Use `scripts/mobile_audit.py` only when a mobile UX/touch audit is useful to the requested work.

Treat reference principles as decision criteria, not absolute implementation rules. Choose list virtualization, memoization, offline behavior, secure storage, and platform divergence based on the actual code and requirements. Preserve existing product behavior unless the user asks to change it, and follow the repository's normal verification and approval rules.
