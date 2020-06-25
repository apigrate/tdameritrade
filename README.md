
## Summary

A NodeJS API connector library for the TD Ameritrade API.

To install:

```bash
npm install @apigrate/tdameritrade
```
### Supported API Methods

* Accounts
  * Get Account
  * Get Accounts
* Instruments
  * Search Instruments
* Price History
  * Get Price History
* Quotes
  * Get Quote
  * Get Quotes
* Transaction History
  * Get Transaction
  * Get Transactions

## Usage and Examples

### Obtaining an OAuth Access Token
You need to initiate a dialog for your user to start the authorization process. There's a built-in method for doing that.
```javascript
//Prerequisites...
let client_id = process.env.TDA_CLIENT_ID;
let redirect_url = process.env.TDA_REDIRECT_URL;

const {TDAConnector, getAuthorizationUrl} = require('@apigrate/tdameritrade');
const tda = new TDAConnector(client_id, redirect_url);
let authUrl = getAuthorizationUrl(client_id, redirect_url);

// Now redirect the user to the authUrl...
```

After the user authorizes your app. TD Ameritrade responds to the `redirect_url` endpoint with an authorization code. It
needs to be exchanged for an access token and refresh token. With these tokens you can access the TD Ameritrade for up to 90 days
without having to manually authorize again.

> Note the manual authorization requirement is a TD Ameritrade security requirement. Your end-users MUST explicitly go through the OAuth dialog
process again after that period.

Exchange the returned code for an access token like this:
```javascript
// ... Meanwhile, at the redirect_url endpoint...
let code = request.query.code; //...(hypothetical) This is obtained from your HTTP infrastructure (expressjs, etc.)

const {TDAConnector} = require('@apigrate/tdameritrade');
const tda = new TDAConnector(client_id, redirect_url);

let credentials = await tda.getAccessToken(code);
// credentials = {refresh_token: "x", access_token: "y", etc...}

//Store your credentials for later use.
```

### Connecting to the API and Handling Token Retrieval and Renewal

The connector emits a `token` event:

1. on the `getAccessToken` method after retrieving the access token and other credentials, and...
2. on the `getRefreshToken` method after refreshing the access token

Take advantage of this by registering an event listener on this event and write a function to 
store your OAuth credentials consistently.

```javascript
// OAuth credentials also need to be stored during refresh...
let storeCredentials = async function(credentials){
  await store_my_credentials_somewhere(credentials);
}

tda.on("token", storeCredentials);
```
You have two options for initializing the connector with stored credentials to make API calls:

1. use the credentialsInitializer constructor parameter
2. use the setCredentials method

#### Using the credentials initializer...
The credential initializer function is a constructor argument. You provide a function that obtains the stored credentials
Immediately before the first api method invocation (`getQuotes`, `getTransactionHistory` etc.) this initializer function will 
be invoked if credentials are not already present internally. This is the recommended initialization approach.
```javascript
// OAuth credentials are typically stored remotely somewhere, and you'll use a function to obtain them.
let getCredentials = async function(){
  let credentials = await fetch_my_credentials_from_somewhere();
  return credentials;
}

const {TDAConnector} = require('@apigrate/tdameritrade');
const tda = new TDAConnector(client_id, redirect_url, getCredentials);

// credentials aren't fetched yet...

let quoteInfo = await tda.getQuote('TSLA'); //the credential initializer is invoked immediately prior to the API call automatically
```

#### Using the setCredentials method...
Alternatively, you can explicitly set credentials by using the `setCredentials` method.
```javascript
const {TDAConnector} = require('@apigrate/tdameritrade');
const tda = new TDAConnector(client_id, redirect_url );//Note, no initializer function

//... other stuff happens...

let credentials = await fetch_my_credentials_from_somewhere();

//explicitly set the credentials
tda.setCredentials(credentials);

//now you can do your API calls...
let quoteInfo = await tda.getQuote('TSLA');
```