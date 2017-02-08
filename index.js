"use strict";

const iconv = require('iconv-lite');
const crypto = require('crypto');
const _ = require('lodash');

class WalletOne {
  constructor(key, merchantId, defaults) {
    if(typeof merchantId == "object") {
      defaults = merchantId;
      merchantId = undefined;
    }

    this.key = key;
    this.defaults = defaults || {};

    if(merchantId) {
      this.defaults.WMI_MERCHANT_ID = merchantId;
    }
  }

  getFormFields(data) {
    data = _.merge(this.defaults, data)
    delete data.WMI_SIGNATURE;

    let fields = [];
    let values = '';

    let sortFn = (a, b) => {
      a = a.toLowerCase();
      b = b.toLowerCase();

      return a > b? 1: (a < b? -1: 0);
    };

    Object.keys(data).sort(sortFn).map((name) => {
      let value = data[name];

      if(name == "WMI_DESCRIPTION" && !((value + '').match(/^BASE64:/))) {
        value = 'BASE64:' + new Buffer(value).toString('base64')
      }

      if(name == "WMI_PAYMENT_AMOUNT") {
        value = parseFloat(value).toFixed(2);
      }

      if (Array.isArray(value)) {
        values += value.sort(sortFn).join('');

        value.map((val) => {
          fields.push({ name: name, value: val });
        })
      }
      else {
        values += value;
        fields.push({ name: name, value: value });
      }
    });

    let signature = crypto.createHash('md5').update(iconv.encode(values + this.key, 'win1251')).digest('base64');

    fields.push({ name: "WMI_SIGNATURE", value: signature });

    return fields;
  }

  getSignature(data) {
    let fields = this.getFormFields(data);

    return fields[fields.length - 1].value;
  }

  checkSignature(data, signature) {
    if(!signature) {
      signature = data.WMI_SIGNATURE;
    }

    if(!signature) {
      return false;
    }

    return this.getSignature(data) == signature;
  }

  answer(meta) {
    let message = '', answer = "WMI_RESULT=OK";

    if(meta instanceof Error) {
      answer = "WMI_RESULT=RETRY";
      message = meta.message;
    }
    else if(meta) {
      message = meta;
    }

    if(message) {
      message = encodeURIComponent(message);
    }

    if(message) {
      answer += `&WMI_DESCRIPTION=${message}`;
    }

    return answer;
  }

  getPaymentUrl() {
    return 'https://wl.walletone.com/checkout/checkout/Index';
  }

  notify(fn, onError) {
    return (req, res) => {
      let data = req.body || {};
      let err;
      let meta;

      let ok = () => {
        return res.send(this.answer());
      };

      let fail = (err, meta) => {
        if(onError) {
          onError(err, meta);
        }

        return res.send(this.answer(err));
      };
      
      if(!this.checkSignature(data)) {
        err = new Error('Wrong signature');
        meta = {
          reason: 'signature',
          signature: data.WMI_SIGNATURE
        }
      }
      else if((data.WMI_ORDER_STATE + '').toUpperCase() != "ACCEPTED") {
        err = new Error('Order was not accepted');
        meta = {
          reason: 'state',
          state: data.WMI_ORDER_STATE
        }
      }

      if(err) {
        return fail(err, meta);
      }

      function callback(err) {
        if(err) {
          return fail(err);
        }

        return ok();
      }

      if(!fn) {
        return ok();
      }

      let result = fn.call(this, req.body, callback);

      if(result && typeof result == 'object') {
        result.then(() => {
          ok();
        }).catch((err) => {
          fail(err);
        })
      }
    }
  }
}

module.exports = WalletOne;
