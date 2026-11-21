status: completed

# 003 — enable api integration

We currently are using mock APIs, where data is stored in JSON files. We want to preserve this functionality; however, only enable it if no definition of an API endpoint is specified in properties. Otherwise, the defined API endpoint should be used and the actual calls performed.

## Tasks
* modify the application to use the actual api endpoints. They are documented under the ../link-organizer-api/docs folder.
* update the readme markdown file with instructions on how to define the api endpoint.
