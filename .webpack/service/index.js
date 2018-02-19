(function(e, a) { for(var i in a) e[i] = a[i]; }(exports, /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var serverless = __webpack_require__(1);
var bodyParser = __webpack_require__(2);
var express = __webpack_require__(3);
var app = express();
var AWS = __webpack_require__(4);
var uuid = __webpack_require__(5);

var MARKERS_TABLE = process.env.MARKERS_TABLE;
var IS_OFFLINE = process.env.IS_OFFLINE;
var DEV_DB_PORT = process.env.DEV_DB_PORT;

var dynamoDb = void 0;
if (IS_OFFLINE === 'true') {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: 'http://localhost:' + DEV_DB_PORT
  });
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient();
}

app.use(bodyParser.json({ strict: false }));

app.get('/api/markers', function (req, res) {
  var params = {
    TableName: MARKERS_TABLE
  };

  dynamoDb.scan(params, function (error, result) {
    if (error) {
      console.log(error);
      return res.status(400).json({ error: 'Could not get markers' });
    }

    if (result && result.Items) {
      return res.json({ items: result.Items, meta: {
          total: result.Count
        } });
    }

    console.log(error);
    return res.status(400).json({ error: 'Could not get markers' });
  });
});

app.get('/api/markers/:markerId', function (req, res) {
  if (!req.params.markerId) {
    return res.status(400).json({ error: 'Marker ID not set' });
  }

  var params = {
    TableName: MARKERS_TABLE,
    Key: {
      id: req.params.markerId
    }
  };

  dynamoDb.get(params, function (error, result) {
    if (error) {
      console.log(error);
      return res.status(400).json({ error: 'Could not get marker' });
    }
    if (result && result.Item) {
      var _result$Item = result.Item,
          content = _result$Item.content,
          id = _result$Item.id;

      return res.json({ content: content, id: id });
    } else {
      return res.status(404).json({ error: "Marker not found" });
    }
  });
});

app.post('/api/markers', function (req, res) {
  var _req$body = req.body,
      lattitude = _req$body.lattitude,
      longitude = _req$body.longitude;

  if (!lattitude || !longitude) {
    res.status(400).json({ error: 'Lat or Long not set' });
  }

  var id = uuid();
  var params = {
    TableName: MARKERS_TABLE,
    Item: { id: id, lattitude: lattitude, longitude: longitude }
  };

  dynamoDb.put(params, function (error) {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not create marker' });
    }
    res.json({ id: id, lattitude: lattitude, longitude: longitude });
  });
});

module.exports.handler = serverless(app);

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("serverless-http");

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("body-parser");

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("express");

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = require("aws-sdk");

/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = require("uuid/v4");

/***/ })
/******/ ])));