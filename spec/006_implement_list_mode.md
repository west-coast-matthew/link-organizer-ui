status: completed

# 006 — implement list mode

The default method of presenting links for a selected category is where each link is represented by a card. We need to support the ability to switch to a list mode, where links are presented in a row fashion, with each consuming minimal space, and the thumbnails are not displayed.

We will need to remember the display preference mode (list or card), so persist the state in a zustand store.


