status: ready

# 001 — establish service layer

create an file called ./src/services/link-mgmnt-services.ts that will emulate api calls to the future backend. the service should emulate all typical crud lifecycle events. each call should be handled by the UI pages via usequery which will utilize services in the service class. instead of actual api calls at this point, we need to a) emulate a 3-6 second delay which will support a futurue effort to implement loading and error state components at a future point. for now, we can substiture the behavior of loading end error states with a simple text fields. 

for the method calls, we need to load data from static json call definitions under a new ./mock-data directory. it is important that we define the mock data as it will serve as a blueprint for a contract for the future api implementation.

## Tasks
* create new service and function to emulate a random delay
* implement the loading state and error state components to indicate progress
* create static json files to represent data that will would be returned by an actual api
* create mock service methods for loading and managing data
* modify the application to use the new methods via useQuery. essentially the page and components will not have direct knowledge of the true source of the information
