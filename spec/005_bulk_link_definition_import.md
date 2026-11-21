status: completed

# 005 — bulk link definition import (ui)

We need to support the ability to upload links in bulk, as I have a lot of files I need to import.

Data will be supplied in the format: link title, link, and optional description, with each definition occurring on a series of consecutive lines, and each set of related data separated by a space. The following is an example:

```
link 1
http://www.somewhere.com

some other link
http://www.foo.com
this is a really great site....
```

The API project now has support for this new feature.

All bulk spec operations will insert all link definitions with a single selected category/subcategory.

# Tasks
* create a modal that will allow the user to cut and paste or directly enter link definitions into a text area
* add a CTA element allowing the user to trigger the bulk insert operation
* add an element that lists the total number of links entered
* add validation as the user is performing data entry; for example, we would never allow more than 4 consecutive lines
* add additional icons to the categories that will allow the user to enter the new link or initiate the bulk link import operation. This will be an alternate way to perform the action the 'add link' button is associated with
