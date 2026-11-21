status: completed

# 001 — establish service layer

Create a file called ./src/services/link-mgmnt-services.ts that will emulate API calls to the future backend. The service should emulate all typical CRUD lifecycle events. Each call should be handled by the UI pages via useQuery, which will utilize services in the service class. Instead of actual API calls at this point, we need to a) emulate a 3-6 second delay, which will support a future effort to implement loading and error state components at a future point. For now, we can substitute the behavior of loading and error states with simple text fields.

For the method calls, we need to load data from static JSON call definitions under a new ./mock-data directory. It is important that we define the mock data, as it will serve as a blueprint for a contract for the future API implementation.

## Tasks
* create new service and function to emulate a random delay
* implement the loading state and error state components to indicate progress
* create static json files to represent data that would be returned by an actual api
* create mock service methods for loading and managing data
* modify the application to use the new methods via useQuery. Essentially, the page and components will not have direct knowledge of the true source of the information
