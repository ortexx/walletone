# Install 
`npm install walletone`

# About
Walletone payment module (walletone.com)

# Example
## Sending to the payment place

```js
const W1 = require("walletone");

let defaultData = {
    WMI_SUCCESS_URL: 'http://example.com/success/',
    WMI_FAIL_URL: 'http://example.com/fail/',
};

let secretKey = "key";
let merchantId = "000000001";

const w1 = new W1(secretKey, merchantId, defaultData);

// Create form data
let fields = w1.getFormFields({
    WMI_PAYMENT_AMOUNT: '10',
    WMI_CURRENCY_ID: '643',
    WMI_DESCRIPTION: 'Recharge',
    WMI_CUSTOMER_EMAIL: 'user@example.com',
    WMI_AUTO_LOCATION: "1"
    // ...and other options
});

console.log(fields);  // returns sorted fields and signature
/* output
 [
    { name: 'WMI_AUTO_LOCATION', value: '10' },
    { name: 'WMI_CURRENCY_ID', value: '643' }     
    ... 
    { name: 'WMI_SIGNATURE', value: 'hash' }
 ]
*/
```

```html
<form method="POST" action="{{ w1.getPaymentUrl() }}" accept-charset="UTF-8">
    {% for field in fields %}
    <input name="{{ field.name }}" type="hidden" value="{{ field.value }}"/>
    {% endfor %}             
    <button type="submit">Ok</button>
</form>
```

## Handling a notification

```js
const express = require('express');
const busboy = require('express-busboy');
const app = express();
const notifyRouter = busboy.extend(express.Router());

let successHandler = (data, callback) => {
    // data === req.body    
    // save payment info in db e.t.c    
    // callback() or return promise
};

let errorHandler = (err, meta) => {
    // you can save something to a file, db e.t.c.
    // operation must be synchronous or in the background 
};

notifyRouter.post('/', w1.notify(successHandler, errorHandler));
app.use('/notification', notifyRouter);
```

# Description
You can write custom notification handler, but library version includes data/signature validation and automatically send all headers in the necessary format  


We use [express-busboy](https://github.com/yahoo/express-busboy/) parser in the example above, because [body-parser](https://github.com/expressjs/body-parser/) is not able to handle charset __windows-1251__. Walletone uses this charset to send request.


# API
### .constructor(secretKey, merchantId, [defaultData])
secretKey and merchantId you can find in your w1 account.  
defaultData will be merged with other data in .getFormFields

### .setAlgorithm(algo = "md5")
set encryption algorithm ("md5" or "sha1")

### .getFormFields(data)
returns sorted data and signature in the array of objects

### .getSignature(data)
returns data signature

### .checkSignature(data, signature) or .checkSignature(data) // data includes WMI_SIGNATURE
checks the validity of the signature 

### .answer(meta)
returns answer in w1 format  
meta type can be string or Error instance, if it is string then result is "OK" else "RETRY" 

### .getPaymentUrl()
returns w1 form action url

### .notify(fn, onError)
w1 notify handler, it is "connect" middleware




