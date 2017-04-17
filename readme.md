# Install 
`npm install walletone`

# About
Walletone payment module (walletone.com)

# Example
```js
const W1 = require("walletone");

let defaultData = {
    WMI_SUCCESS_URL: 'http://example.com/success/',
    WMI_FAIL_URL: 'http://example.com/fail/',
};

let secretKey = "keykeykey";
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

console.log(fields)  // returns sorted fields and signature too
/* output
 [
    { name: 'WMI_AUTO_LOCATION', value: '10' },
    { name: 'WMI_CURRENCY_ID', value: '643' }     
    ... 
    { name: 'WMI_SIGNATURE', value: 'hashhashhash' }
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

```js
// notification handler from walletone.com

const express = require('express');
const app = express();

let successHandler = (data, callback) => {
    // data === req.body    
    // save payment info in db e.t.c    
    // callback() or return promise
};

let errorHandler = (err, meta) => {
    // you can save something to a file, db e.t.c.
    // operation must be synchronous or in the background 
};

app.post('payments/notification/', w1.notify(successHandler, errorHandler));

```

# Description
You can write custom notification handler, but library version includes data/signature validation and automatically send all headers in the necessary format

# API
### .constructor(secretKey, merchantId, [defaultData])
secretKey and merchantId you can find in your w1 account.  
defaultData will be merged with other data in .getFormFields

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




