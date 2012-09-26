var assert = require("assert");
var vows = require("vows");
var path = require("path");
var strata = require("../lib");
var mock = strata.mock;
var build = strata.build;

vows.describe("build").addBatch({
  "A build middleware": {
    topic: function () {
      var app = build();

      app.use(root);
      app.use(count);

      app.map("/one", function (app) {
        app.run(function (env, callback) {
          callback(200, {
            "Content-Type": "text/plain",
            "X-Position": "one"
          }, "");
        });
      });

      app.use(count);

      app.map("/two", function (app) {
        app.run(function (env, callback) {
          callback(200, {
            "Content-Type": "text/plain",
            "X-Position": "two"
          }, "");
        });
      });

      app.use(count);

      return app;
    },
    "when a non-existent route is requested": {
      topic: function (app) {
        mock.call(app, "/doesnt-exist", this.callback);
      },
      "should call all middleware": function (err, status, headers, body) {
        assert.equal(headers["X-Count"], "3");
      },
      "should map to the root of the server": function (err, status, headers, body) {
        assert.equal(headers["X-Position"], "root");
      }
    },
    "when /one is requested": {
      topic: function (app) {
        mock.call(app, "/one", this.callback);
      },
      "should call all middleware in front of the call to map": function (err, status, headers, body) {
        assert.equal(headers["X-Count"], "1");
      },
      "should properly map": function (err, status, headers, body) {
        assert.equal(headers["X-Position"], "one");
      }
    },
    "when /two is requested": {
      topic: function (app) {
        mock.call(app, "/two", this.callback);
      },
      "should call all middleware in front of the call to map": function (err, status, headers, body) {
        assert.equal(headers["X-Count"], "2");
      },
      "should properly map": function (err, status, headers, body) {
        assert.equal(headers["X-Position"], "two");
      }
    }
  }
}).export(module);

// Increments the X-Count header when called.
function count(app) {
  return function (env, callback) {
    app(env, function (status, headers, body) {
      headers["X-Count"] = (parseInt(headers["X-Count"] || 0) + 1).toString();
      callback(status, headers, body);
    });
  }
}

// Sets the X-Position header to "root" if it hasn't been set.
function root(app) {
  return function (env, callback) {
    app(env, function (status, headers, body) {
      headers["X-Position"] = headers["X-Position"] || "root";
      callback(status, headers, body);
    });
  }
}