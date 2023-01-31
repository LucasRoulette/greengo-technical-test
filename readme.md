# GreenGo Technical Test

This is my answer to the technical test you proposed. It is made for a frontend usage, but it could easily work for a backend application.
I've made a static class for simplicity's sake, but it could be turned into a service or something else in a real project. I've added a lot of comments to clarify any question you might have.
It uses an Axios interceptor to handle the requests made to the server and stores the tokens in the class' variables.

## Usage
You first need to call `AutoRefresh.login(clientId, clientSecret)` to login the client using the credentials.  
Once you're logged in, you can make calls using `AutoRefresh.request(method, path, data)` method. The request method is a really simple but it covers most cases when working with an API, if there is a need for more customisation of the request, we could expose some of Axios' options through this method.  
If there is a valid main token or refresh token, the class will handle the auth under the hood automatically.  
If the class should redirect you to the login page, the request will throw an Error with `'Redirect'` in the `Message` field. Depending on the project, the redirect could happen in the `disconnectAndRedirect()` method, or in a global error catcher with a more precise exception.

## Exemple
```ts
// Log in the user
AutoRefresh.login('myId', 'mySecret');

// Make a GET request
const customers: Customer[] = AutoRefresh.request<Cutomer[]>('GET', '/customer');

// Make a POST request
const john: Customer = AutoRefresh.request<Customer>('POST', '/customer', {name: 'John Doe'});
```


## Tests
The test suite mocks the API behavior, then it makes all the tests needed to cover every possibility.  

There is a quite useless line in the "Incorrect credentials throws an error" test, I call the login route with valid credentials before
trying the route with incorrect credentials.  
It's made this way to cover all cases on line 42 (when you login with an axios instance already created), I don't
think it's mandatory, but I like having no uncovered line here.   
It could have been moved to another test, depending on the desired programming  style.


## Possible Improvements
For now, the tokens are only stored during runtime, the first improvements would be to store the tokens once they are received to skip the login if they are a valid token. Also, the URLs are hardcoded in the class, but it could be configured by the environment.  
On a backend application, it could fetch the URLs and the credentials from the environment and use the credentials to login in the interceptor if the tokens are invalid.
