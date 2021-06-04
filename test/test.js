"use strict";

const assert = require('chai').assert;
const WalletOne = require('../index');
const express = require('express');
const request = require('supertest');
const busboy = require('express-busboy');

describe('WalletOne:', function () {
  let merchantId = '1';
  let secretKey = 'key';
  let w1 = new WalletOne(secretKey, merchantId);

  let data = {
    WMI_PAYMENT_AMOUNT: '10.00',
    WMI_CURRENCY_ID: '643',
    WMI_DESCRIPTION: 'Recharge',
    WMI_CUSTOMER_EMAIL: 'user@example.com',
    WMI_AUTO_LOCATION: "1"
  };

  let validSignature = 'ZsGLBfvuiM/FgHqjKwcu/w==';

  describe('methods', function () {
    it('#getFormFields()', function() {
      let fields = w1.getFormFields(data);

      assert.equal(fields[0].value, data.WMI_AUTO_LOCATION, 'invalid WMI_AUTO_LOCATION');
      assert.equal(fields[1].value, data.WMI_CURRENCY_ID, 'invalid WMI_CURRENCY_ID');
      assert.equal(fields[2].value, data.WMI_CUSTOMER_EMAIL, 'invalid WMI_CUSTOMER_EMAIL');
      assert.equal(fields[3].value, data.WMI_DESCRIPTION, 'invalid WMI_DESCRIPTION');
      assert.equal(fields[4].value, merchantId, 'invalid WMI_MERCHANT_ID');
      assert.equal(fields[5].value, data.WMI_PAYMENT_AMOUNT, 'invalid WMI_PAYMENT_AMOUNT');
      assert.equal(fields[6].value, validSignature, 'invalid WMI_SIGNATURE');
    });

    it('#getSignature()', function() {
      assert.equal(w1.getSignature(data), validSignature);
    });

    it('#checkSignature()', function() {
      assert.isOk(w1.checkSignature(data, validSignature));
      assert.isNotOk(w1.checkSignature(data, 'invalid'));
    });

    it('#answer()', function() {
      assert.equal(w1.answer(), 'WMI_RESULT=OK');
      assert.equal(w1.answer('mess/age'), 'WMI_RESULT=OK&WMI_DESCRIPTION=mess%2Fage');
      assert.equal(w1.answer(new Error('mess/age')), 'WMI_RESULT=RETRY&WMI_DESCRIPTION=mess%2Fage');
    });
  });

  describe('notification', function () {
    it('check signature error', function (done) {
      let app = express();
      let router = busboy.extend(express.Router());
      let error;     

      router.post('/', w1.notify(() => {}, (err, meta) => {
        (meta.reason != 'signature') && (error = new Error('signature error checking was failed'));
      }));

      app.use('/notify', router);

      request(app)
        .post('/notify')
        .set('Content-Type', 'application/x-www-form-urlencoded; charset=windows-1251')
        .send(data)
        .expect(() => {
          if(error) {
            throw error;
          }
        })
        .end(done)
    });

    it('check order state error', function (done) {
      let app = express();
      let error;

      data.WMI_SIGNATURE = validSignature;
      app.use(express.json());

      app.post('/notify', w1.notify(() => {}, (err, meta) => {
        (meta.reason != 'state') && (error = new Error('order state error checking was failed'));
      }));

      request(app)
        .post('/notify')
        .send(data)
        .expect(() => {
          if(error) {
            throw error;
          }
        })
        .end(done)
    });

    it('check success request with callback', function (done) {
      let app = express();

      data.WMI_ORDER_STATE = 'accepted';
      data.WMI_SIGNATURE = w1.getSignature(data);

      app.use(express.json());

      app.post('/notify', w1.notify((body, callback) => {
        assert.equal(JSON.stringify(body), JSON.stringify(data));
        callback();
      }, null));

      request(app)
        .post('/notify')
        .send(data)
        .expect('WMI_RESULT=OK')
        .end(done)
    });

    it('check success request with promise', function (done) {
      let app = express();

      app.use(express.json());

      app.post('/notify', w1.notify(() => {
        return Promise.resolve();
      }));

      request(app)
        .post('/notify')
        .send(data)
        .expect('WMI_RESULT=OK')
        .end(done)
    });

    it('check success request with callback error', function (done) {
      let app = express();

      app.use(express.json());

      app.post('/notify', w1.notify((body, callback) => {
        callback(new Error('success'));
      }));

      request(app)
        .post('/notify')
        .send(data)
        .expect('WMI_RESULT=RETRY&WMI_DESCRIPTION=success')
        .end(done)
    });

    it('check success request with promise error', function (done) {
      let app = express();

      app.use(express.json());

      app.post('/notify', w1.notify(() => {
        return Promise.reject(new Error('success'));
      }));

      request(app)
        .post('/notify')
        .send(data)
        .expect('WMI_RESULT=RETRY&WMI_DESCRIPTION=success')
        .end(done)
    });
  });
});

