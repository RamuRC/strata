var assert = require('assert');
var vows = require('vows');
var strata = require('../lib');
var utils = strata.utils;
var mock = strata.mock;
var lint = strata.lint;

var noop = function (status, headers, body) {};

vows.describe('lint').addBatch({
  'A lint middleware': {
    'should detect an invalid caller': function () {
      var app = lint(utils.ok);
      assert.throws(function () {
        app(); // Call the downstream app with no arguments.
      }, /two arguments/);
    },
    'should detect an invalid callee': function () {
      var app = lint(function (env, callback) {
        callback(); // Call the upstream caller with no arguments.
      });
      assert.throws(function () {
        app(mock.env(), noop);
      }, /three arguments/);
    },
    'should detect an invalid environment': function () {
      var app = lint(utils.ok);

      assert.throws(function () {
        app('', noop);
      }, /must be an object/);

      [ 'protocol',
        'protocolVersion',
        'requestMethod',
        'remoteAddr',
        'remotePort',
        'serverName',
        'serverPort',
        'scriptName',
        'pathInfo',
        'queryString'
      ].forEach(function (p) {
        assertRequiredProperty(p);
        assertStringProperty(p);
      });

      [ 'requestTime',
        'headers',
        'input',
        'error',
        'strataVersion'
      ].forEach(function (p) {
        assertRequiredProperty(p);
      });

      assert.throws(function () {
        app(mock.env({ protocol: 'ftp:' }), noop);
      }, /protocol must be/);

      assert.throws(function () {
        app(mock.env({ requestTime: '123' }), noop);
      }, /requestTime must be/);

      assert.throws(function () {
        var env = mock.env();
        env.headers = '';
        app(env, noop);
      }, /headers must be/);

      assert.throws(function () {
        var env = mock.env();
        env.headers = { 'Content-Type': 'text/plain' };
        app(env, noop);
      }, /must be lower-cased/);

      assert.throws(function () {
        var env = mock.env();
        env.input = '';
        app(env, noop);
      }, /input must be a Stream/);

      assert.throws(function () {
        var env = mock.env();
        env.error = '';
        app(env, noop);
      }, /error must be a Stream/);

      assert.throws(function () {
        var env = mock.env();
        env.strataVersion = '1.0';
        app(env, noop);
      }, /strataVersion must be an array/, 'strataVersion must be an array');

      assert.throws(function () {
        app(mock.env({ requestMethod: '123' }), noop);
      }, /requestMethod must be/, 'requestMethod must be a valid HTTP verb');

      assert.throws(function () {
        app(mock.env({ scriptName: 'some/path' }), noop);
      }, /scriptName must start with "\/"/, 'scriptName must start with /');

      assert.throws(function () {
        app(mock.env({ scriptName: '/' }), noop);
      }, /scriptName must not be "\/"/, 'scriptName must not be /');

      assert.throws(function () {
        app(mock.env({ pathInfo: 'some/path' }), noop);
      }, /pathInfo must start with "\/"/, 'pathInfo must start with /');

      assert.throws(function () {
        app(mock.env({ headers: { 'content-length': 'abc' } }), noop);
      }, /must consist of only digits/, 'content-length must consist of only digits');
    },
    'should detect an invalid callback': function () {
      var app = lint(utils.ok);

      assert.throws(function () {
        app(mock.env(), '');
      }, /must be a function/);

      assert.throws(function () {
        app(mock.env(), function () {});
      }, /three arguments/);
    },
    'should detect an invalid status code': function () {
      var app = lint(function (env, callback) {
        callback('200', {}, '');
      });

      assert.throws(function () {
        app(mock.env(), noop);
      }, /must be a number/);

      app = lint(function (env, callback) {
        callback(0, {}, '');
      });

      assert.throws(function () {
        app(mock.env(), noop);
      }, /must be a valid HTTP status code/);
    },
    'should detect invalid headers': function () {
      var app = lint(function (env, callback) {
        callback(200, '', '');
      });

      assert.throws(function () {
        app(mock.env(), noop);
      }, /must be an object/);

      app = lint(function (env, callback) {
        callback(200, { 'Content-Type': 123 }, '');
      });

      assert.throws(function () {
        app(mock.env(), noop);
      }, /must be a string/);

      app = lint(function (env, callback) {
        callback(200, { '1Header': '' }, '');
      });

      assert.throws(function () {
        app(mock.env(), noop);
      }, /must start with a letter/);
    },
    'should detect an invalid body': function () {
      var app = lint(function (env, callback) {
        callback(200, {}, 123);
      });

      assert.throws(function () {
        app(mock.env(), noop);
      }, /must be a string/);
    },
    'should detect an invalid Content-Type': function () {
      var app = lint(function (env, callback) {
        callback(200, {}, '');
      });

      assert.throws(function () {
        app(mock.env(), noop);
      }, /missing content-type/i);

      app = lint(function (env, callback) {
        callback(204, { 'Content-Type': 'text/plain' }, '');
      });

      assert.throws(function () {
        app(mock.env(), noop);
      }, /content-type header given/i);
    },
    'should detect an invalid Content-Length': function () {
      var app = lint(function (env, callback) {
        callback(204, { 'Content-Length': '0' }, '');
      });

      assert.doesNotThrow(function () {
        app(mock.env(), noop);
      });

      app = lint(function (env, callback) {
        callback(204, { 'Content-Length': '1' }, 'a');
      });

      assert.throws(function () {
        app(mock.env(), noop);
      }, /non-zero content-length/i);
    }
  }
}).export(module);

function assertRequiredProperty(property) {
  var app = lint(utils.ok);
  assert.throws(function () {
    var env = mock.env();
    delete env[property];
    app(env, noop);
  }, /missing required property/);
}

function assertStringProperty(property) {
  var app = lint(utils.ok);
  assert.throws(function () {
    var env = mock.env();
    env[property] = 1;
    app(env, noop);
  }, /must be a string/);
}