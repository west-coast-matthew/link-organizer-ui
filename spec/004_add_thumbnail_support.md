status: completed

# 004 — add thumbnail support

We have added functionality into the API project so that thumbnails of sites are generated when a new link is defined. We need the UI to include these generated thumbnails that are generated as a result of defining a new link. Keep in mind, link thumbnails potentially may experience a delay until they are generated, so we need to use the loading state component potentially and check every 30 seconds until the thumbnail becomes available.

Changes have been applied to the API project, so you can use that for reference.
