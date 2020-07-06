const fetch = require('node-fetch');
const qs = require('query-string');
const debug = require('debug')('gr8:tdameritrade');
const verbose = require('debug')('gr8:tdameritrade:verbose');
const {EventEmitter} = require('events');

/**
 * Generates the authorization url where you are direct users for authorization. The authorization process grants your app access to the TD Ameritrade API.
 * @param {string} client_id identifies your TD Ameritrade application. 
 * @param {string} redirect_uri the url you control to receive the code returned from the TD Ameritrade authorization process. 
 * At this URL you'll exchange the code for an access token.
 */
exports.getAuthorizationUrl = function (client_id, redirect_uri){
  return `https://auth.tdameritrade.com/auth?response_type=code&redirect_uri=${encodeURIComponent(redirect_uri)}&client_id=${encodeURIComponent(client_id)}%40AMER.OAUTHAP`;
}

/**
 * NodeJS connector for the TD Ameritrade API 
 */
class TDAConnector extends EventEmitter {
  /**
   * @constructor
   * @param {string} client_id identifies your TDA app.
   * @param {string} redirect_uri uri which will catch the authorization response from TD Ameritrade.
   * @param {object} credentialInitializer optional function returning an object with the initial credentials to be used, of the form
   * `{ access_token, refresh_token}`. This function is invoked on the first API method invocation automatically. If you omit this function, you'll need
   * to call the setCredentials method prior to your first API method invocation.
   * 
   */
  constructor(client_id, redirect_uri, credentialInitializer){
    super();
    this.client_id = client_id;
    this.redirect_uri = redirect_uri;
    this.access_token = null;
    this.refresh_token = null;
    this.credentialInitializer = credentialInitializer;
    this.base_url = `https://api.tdameritrade.com/v1`;
  }

  /**
   * Get Account balances, positions, and orders for all linked accounts.
   * @param {*} parameters @see https://developer.tdameritrade.com/account-access/apis/get/accounts-0
   */
  async getAccounts(parameters){
    return this.doFetch('GET', `${this.base_url}/accounts`, parameters);
  }

  /**
   * Account balances, positions and orders for a specific account.
   * @param {*} accountId 
   * @param {*} parameters 
   */
  async getAccount(accountId, parameters){
    return this.doFetch('GET', `${this.base_url}/accounts/${accountId}`, parameters);
  }

  /**
   * Search or retrieve instrument data, including fundamental data. 
   * @param {*} symbol
   * @param {*} projection
   * @see https://developer.tdameritrade.com/instruments/apis/get/instruments
   */
  async searchInstruments(symbol, projection){
    return this.doFetch('GET', `${this.base_url}/instruments?symbol=${symbol}&projection=${projection}`);
  }

  /** Gets a quote for a symbol */
  async getQuote(symbol){
    return this.doFetch('GET', `${this.base_url}/marketdata/${symbol}/quotes`);
  }

  /** Gets price history for a period.
   * @param {string} symbol
   * @param {*} parameters @see https://developer.tdameritrade.com/price-history/apis/get/marketdata/%7Bsymbol%7D/pricehistory
   */
  async getPriceHistory(symbol, parameters){
    return this.doFetch('GET', `${this.base_url}/marketdata/${symbol}/pricehistory`, parameters);
  }

  /**
   * Gets transactions for a specific account
   * @param {string} accountId 
   * @param {*} parameters @see https://developer.tdameritrade.com/transaction-history/apis/get/accounts/%7BaccountId%7D/transactions-0
   */
  async getTransactions(accountId, parameters){
    return this.doFetch('GET', `${this.base_url}/accounts/${accountId}/transactions`, parameters);
  }

  /**
   * Get a transaction for a specific account
   * @param {string} accountId 
   * @param {*} parameters @see https://developer.tdameritrade.com/transaction-history/apis/get/accounts/%7BaccountId%7D/transactions-0
   */
  async getTransaction(accountId, transactionId){
    return this.doFetch('GET', `${this.base_url}/accounts/${accountId}/transactions/${transactionId}`);
  }

  /**
   * Sets the credentials needed to access the API
   * @param {object} creds 
   * @param {string} creds.access_token the access token used for API authentication
   * @param {string} creds.refresh_token the refresh token used to obtain new access tokens when they expire
   */
  setCredentials(creds){
    if(creds){
      if(creds.access_token){
        this.access_token = creds.access_token;
      }
      if(creds.refresh_token){
        this.refresh_token = creds.refresh_token;
      }
    }
  }



  /**
   * Given an authorization code, obtain an access token and refresh token for using the API.
   * Note the connector's internal credentials are set during this process.
   * @param {*} code the authorization code received from the TD Ameritrade OAuth callback request.
   * 
   * @returns an object containing an access token, a refresh token and some additional scope information.
   * @example
   * {
        "access_token": "TcvQNHsGphtZUTgOn2fozFfaLTEXKRLSvyZV393+pEbFwUKStop9sqeMKpIZBMlXs3SuL54HsmvEJ9TQaAVKgneXBEmHYrMQ9Kb6AapYbSWgmatsBG66tft6xdtizQeua9pYMaOp3jL4iXKsKrLEeV+GzUPYqVghrz+mh7aOJXsekfCjhCyJhrB6lk5mGDEbTBTUcOTqaX+JwjcvcNjSJSv55fhb/cj1ipryokVxfb4hWURNLIZlUVf5hOBPUvByrckQcy7eD6KhaedyD3ELVk3/Rvy2TO/mrPQrUQV1xiCpDzMWKbBZLOCVinCHbz+Dr5Nva1OLXelj2NPsFG/OyOZMhgcXLk9p0tfXpcu+Kj30ReumusrHrJKRrOVB8AC6LWdXW1sBfrwcI+v62LPTcZSF/k7gy24C1A+4M6AVdEx/c5nQ6lB0feYu/OqgsHki5Rtf6N4ZQruqNuUoeE6fomb6n1BBvtRnHByvOMfqAVvN4LSlC9fm/RZ2vSIS8Mxl/Y8RnWzFMLBQ8vTtWCv1fLr3MGQbqgB1aCtVp100MQuG4LYrgoVi/JHHvl4XrPIuyQmW13r9HO+jFlikFf92Mu4+xVUUSbU3plYpsWxCB52lo/dltIBqchdOZyqkJp8NO/JuNUTCR6urJDf54UiRz7CSrRkr3zpE+zkT/71tA/4ufiKNxmagPfqhs9u574tE9hQlSg3dyItUgeV/DuSlhk08mXphlJ06OQIxyxsaa9KjWwxhBRgCHYUBoxO27ZlSoahf2/JHKxaTtu4mbhmgyfhh5qySMxUhQuB8o7nEPBOzCn6G5rbbutheHm46hMVgqhFg8Mc8yzNg4eibBx2nfMPmQrwZTZm21hqF69tn2ZStUNHeX8FFftoE0D8slAZwK/d9KsZdtCuZ4MGbEK3ecP5xcwWHrPtpfs4F9rYdLutTmPpnf9bHbbt4pDV8oNKflPAbgVP8GkbDWZZnqhxgQjQ/EKWke77sqNVt4TNRikiu5/dHB8nYB9PSpLZWKeiWD8Y3H+B2xXmRRIAxcpl4f3RfTyoviRnmM8QNPIehF7MbnYxw56mcdCNHDlYnARE+dpbJUP5qDzkUN3Qu4EiKreJ4SKDCukLf212FD3x19z9sWBHDJACbC00B75E",
        "refresh_token": "ryQhn1i8yLrLVZQwnx08xjmsVY/Akwq6LxyFPCC/u0dfUxCqSAazBKz9uec5yAIfEqyoKJks0pc32B6KXjdhANUvAZl8BtmNhWp/wuRDHaKud2KoNkrVhTpX6X3YrB/3kgdv6JPf4/bZf5Rl35O7TdNvJz/cxGzboMI1Fk9SPXGPz0/qqXGBlIU9lFwLZodxILe/MH1Cbw80DnnDdJFSoTldQb5CDk5QFVDqDL93uXmw3VdCU5gow3mOW8daQbRPFVImH1AO5jb4+kLjvTytnW1D7uJfyu1RItc55VqaWiKKm+18oMzX58nAENnCvr+a1x0Akb2Xct/EoxcIZR1Us3eaep64Bzpw5xeGk+Qff4SYrvJhwebbl5ioEcdA2GhK0H8nPF/FcYNlgwjNHsDshfBuKurutgt7LsxLvG8YoD+TBLr4aTjiRV6Xooz100MQuG4LYrgoVi/JHHvlT0V6IDlhTr2KHQZa1UjnBSjR6UN6K1f6AzFHyvdwU3pqCvR9vXTm3yan+YYb+mHu5GaXU3ic51nsK06obq0HZsfxLs5Ai4jtp9yVyulOKQmYuuXuSKWyzPUfYF5l82ZHVRleJ7CgG1F3CsbwKTFgD3Nx7Btsx0Cs/rspBkxy/54BFR5tBGvozPvh+VhOBw6NcO7hnju3Tmq3IqMT75Mou+OP/2tljL/MzbLGqrnJs2WLVKYgCWGFlLo5+docy/ejje4n4BTplYchirwJ20z3f6ohzokRQXCVUDPAIelm40gOITIBWKHy/9BGnwpoFz/YwKypFlEHthJOx3LPVAadGWRmMIHeHObJNig1okqiofcPsPLFgMTnHTsOlVO+V4j+U3fFP+j7x9M5618IgfJVKRNkKanfTWsa53fsH0Iy6Xzw01fdWSm2QMkbvyk=212FD3x19z9sWBHDJACbC00B75E",
        "scope": "PlaceTrades AccountAccess MoveMoney",
        "expires_in": 1800,
        "refresh_token_expires_in": 7776000,
        "token_type": "Bearer"
      }
   */
  async getAccessToken(code){

    let payload = `grant_type=authorization_code&refresh_token=&access_type=offline`;
    payload += `&code=${encodeURIComponent(code)}`;
    payload += `&client_id=${encodeURIComponent(this.client_id)}`
    payload += `&redirect_uri=${encodeURIComponent(this.redirect_uri)}`;
    
    try{
      let result = await this.doFetch(
        'POST', 
        `https://api.tdameritrade.com/v1/oauth2/token`, 
        null, 
        payload,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

      this.emit("token", result);
      this.setCredentials(result);

      return result;
     
    }catch(ex){
      console.error(ex);
    }
   
  }

  /**
   * Obtain a new access token by using the refresh_token grant.
   * Note the connector's internal credentials are set during this process.
   * @param {string} refresh_token 
   * @returns an object containing a new access token.
   * @example
   * {
      "access_token": "Pdnhrvif37RhnlUnyqGgsMd8v6KcjD5p0zkwuZnyzUulWshP38chVQcXSLXmaw/Qox6JfX8Tz7C361BryOhrmoo+QN9esUjJg+dCL66YJbjA3qAanZ8YQe8+49ZTfLsB52mdhUXCQL0MaHs+JMPL8vtMPwTkjvGC8fciFrk5IBHltYBkqd8WGrF6K+7lUGF4t3w9alh9BkH7Wg4HehkveXOobYZr13P8S0dOAQKzsiMbOcl1jjpFWLEEpJB6yN2EVDJlTLUBGQ+zipqH+w+ZvJ5JoK1a8JfVtAz/LN3Cf5Xg00CCzSWV1rBa7b6S1EGWixGmXZMLTevhkXUWW1SmJ/GbfaGqCiC+XMEAgqGSXQaC0nLVOvugaRFm7Cge6uECtQglcnxGwaMLFDMEhMuUyZMTo3EdYfx/LXfQ7Xv+nSn9elinDN4yXWfGVDRaC0HP3HP9FFWkTuXFLHRyyBdv0V6UE41Tgou9vwTKWS6CxHy5QqOmewmUucKPX7l9+f7xDgcgTFfkTQQ2nEIlQUosqC/XdxjoaChjCjfJy100MQuG4LYrgoVi/JHHvl0Dt38yhOji5yN2nv45LfSpl4SwFYkuRTSKbrv8j5BszzIwiEjZTNKlWq6Sjwe31v1Xtk62dJy56SgTzLPusDt56wulAhbSH/i3QBYIFLjpSYpHTma/lnBc0jdPEwyrqhAQc3Vb4Q1JSMOx8oHzCvlebKkUU4smJzpLjH3zB+lBJ1gvHNnMrShhZ3F6zVdZsY20HBtUo7hepwzSYDsX5AyYxUX1Ea9urvzupH6m1rVmKTa2N0DIe9aLOjSqQiQq5jaZJJ53i9wjGMa7ZW/IlIxzaOAS/wr6FLUgxgoHvvyuP/oJ1lMnAglV+rk11TtMvZChDKNQrbGTqyTZjgEby8wGjw9Z+O1J8aN9k9QAGqGRUXkW6lzRQJBr4mzbrciBzcYt+2lyEEd10x9CdadpID39JXkP+Fn6IXBRiYs62x3MEcDL2tV+U5kYvIj3uvDXvEOJj8npjL1/oEj6BGPepmSCKvHTePS7AAXGUqaiP/PG5NUUwrvSqOKFykqXMN6HUEoX90ugwBhDiaTkq6cfxCGY2VXDEQhnxp+4L92q212FD3x19z9sWBHDJACbC00B75E",
      "scope": "PlaceTrades AccountAccess MoveMoney",
      "expires_in": 1800,
      "token_type": "Bearer"
    }
   */
  async refreshAccessToken(refresh_token){

    let payload = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refresh_token)}`;
    payload += `&client_id=${encodeURIComponent(this.client_id)}`
    payload += `&redirect_uri=${encodeURIComponent(this.redirect_uri)}`;
    
    try{
      let result = await this.doFetch(
        'POST', 
        `https://api.tdameritrade.com/v1/oauth2/token`, 
        null, 
        payload,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

      this.emit("token", result);
      this.setCredentials(result);

      return result;
     
    }catch(ex){
      console.error(ex);
    }
   
  }

  /**
   * Internal method to make an API call using node-fetch.
   * 
   * @param {string} method GET|POST|PUT|DELETE
   * @param {string} url api endpoint url (without query parameters)
   * @param {object} query hash of query string parameters to be added to the url
   * @param {object} payload for POST, PUT methods, the data payload to be sent
   * @param {object} options hash of additional options
   * @param {object} options.headers hash of headers. Specifying the headers option completely
   * replaces the default headers.
   */
  async doFetch(method, url, query, payload, options){
    if(!this.access_token && this.credentialInitializer){
      let creds = await this.credentialInitializer.call();
      if(creds.access_token){ this.access_token = creds.access_token; }
      if(creds.refresh_token){ this.refresh_token = creds.refresh_token; }
    }
    if(!options){
      options = {};
    }
    if(!options.retries){
      options.retries = 0;
    }

    let fetchOpts = {
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Apigrate NodeJS Connector/1.0.0"
      },
    };

    if(this.access_token){
      fetchOpts.headers.Authorization = `Bearer ${this.access_token}`;
    }

    if(options && options.headers){
      fetchOpts.headers = options.headers;
    }
    
    let qstring = '';
    if(query){
      qstring = qs.stringify(query);
      qstring = '?'+qstring;
    }
    let full_url = `${url}${qstring}`;
    
    if(payload){
      if(fetchOpts.headers['Content-Type']==='application/x-www-form-urlencoded'){
        fetchOpts.body = payload
        verbose(`  raw payload: ${payload}`);
      } else {
        //assume json
        fetchOpts.body = JSON.stringify(payload);
        verbose(`  JSON payload: ${JSON.stringify(payload)}`);
      
      }
    }

    try{
      debug(`${method} ${full_url}`);
      
      let response = await fetch(full_url, fetchOpts);

      let result = null;
      if(response.ok){
        debug(`  ...OK HTTP-${response.status}`);
        result = await response.json();
        verbose(`  response payload: ${JSON.stringify(result)}`);
      } else {
        result = await this.handleNotOk(response)
      }
      return result;

    }catch(err){
      if(err instanceof ApiAuthError){
        if(options.retries < 1){
          debug(`Attempting to refresh access token...`);
          //Refresh the access token.
          await this.refreshAccessToken(this.refresh_token);
          options.retries ++;
          debug(`...refreshed OK.`);
          //Retry the request
          return this.doFetch(method, url, query, payload, options);
        } else {
          throw err;
        }

      }
      //Unhandled errors are noted and re-thrown.
      console.error(err);
      throw err;
    }
  }

  /**
   * Handles API responses that are not in the normal HTTP OK code range (e.g. 200) in a consistent manner.
   * @param {object} response the fetch response (without any of the data methods invoked) 
   * @param {string} url the full url used for the API call
   * @param {object} fetchOpts the options used by node-fetch
   */
  async handleNotOk(response, url, fetchOpts){
    debug(`  ...Error. HTTP-${response.status}`);
    
    //Note: Some APIs return HTML or text depending on status code...
    let result = await response.json();
    if (response.status >=300 & response.status < 400){
      //redirection
    } else if (response.status >=400 & response.status < 500){
      if(response.status === 401 || response.status === 403){
        debug(result.error);
        //These will be retried once after attempting to refresh the access token.
        throw new ApiAuthError(JSON.stringify(result));
      }
      //client errors
      verbose(`  client error. response payload: ${JSON.stringify(result)}`);
    } else if (response.status >=500) {
      //server side errors
      verbose(`  server error. response payload: ${JSON.stringify(result)}`);
    } else { 
      throw err; //Cannot be handled.
    }
    return result;
   
  }
  

}

class ApiError extends Error {};
class ApiAuthError extends Error {};

exports.TDAConnector = TDAConnector;
exports.ApiError = ApiError;

