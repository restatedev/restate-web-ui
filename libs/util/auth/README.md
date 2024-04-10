# Auth

This library offers utilities for managing authentication:

- `getAccessToken()`: Gets the current access token
- `setAccessToken(token)`: Sets a new access token
- `logOut()`: Clears the current access token and redirects to the login page
- `withAuth(loader)`: Adds authentication check to routes. If an `access_token` parameter is in the URL, it updates the token. If no token is provided, it redirects the user to the login page.
