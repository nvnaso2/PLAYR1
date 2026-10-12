---
name: Coach P navigation
description: Permanent Coach P placement and conversation-history interaction model
---

Coach P has one canonical dedicated page. It is available from the player bottom tab and Hub, but not from the sidebar menu. Saved conversations live inside a toggleable Coach P chat drawer rather than in the Hub layout.

**Why:** The user wants a focused first-version navigation and chose Coach P as a bottom-tab destination instead of a sidebar menu item.

On iPhone, Coach P's composer should remain docked above the keyboard, with the iOS form accessory strip hidden. Hide starter prompts while the empty-chat composer is focused, but retain the Coach P icon and greeting. Lock native WebView scrolling only for that focused empty-chat state; restore it once a message exists so chat history remains scrollable.

Animate the empty-chat greeting's size/alignment and the starter-prompt collapse/return on focus and blur; do not abruptly mount or remove the prompts.

**Why:** The user wants typing to feel embedded like a native chat composer rather than moving the page, and abrupt prompt changes make the focus transition feel broken.

**How to apply:** Keep the Coach P page, Hub entry, and bottom tab pointing to the same experience. Do not add Coach P back to the sidebar menu unless the user changes this decision. Keep saved-chat controls inside Coach P. Use Capacitor's iOS Keyboard plugin for accessory-bar visibility; avoid keeping the WebView scroll lock active during message history.