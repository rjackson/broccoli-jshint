/* jshint node: true */

'use strict';

var path = require('path');
var JSHinter = require('..');
var expect = require('expect.js');
var root = process.cwd();
var chalk = require('chalk');

var fs = require('fs');
var broccoli = require('broccoli');

var builder;

describe('broccoli-jshint', function () {
  var loggerOutput;

  function readFile(path) {
    return fs.readFileSync(path, {encoding: 'utf8'});
  }

  function pushLoggerMessage(message) {
    loggerOutput.push(message);
  }

  beforeEach(function () {
    loggerOutput = [];
  });

  afterEach(function () {
    if (builder) {
      builder.cleanup();
    }
  });

  describe('jshintignore', function () {
    it('uses jshintignore to read ignored file paths', function () {
      var sourcePath = 'tests/fixtures/jshintignore-in-project';
      var node = new JSHinter(sourcePath, {
        logError: pushLoggerMessage
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function () {
        expect(node.ignoredFiles).to.contain('directory/**');
      });
    });

    it('uses jshintignore to read ignored file paths and ignores empty lines', function () {
      var sourcePath = 'tests/fixtures/jshintignore-in-project';
      var node = new JSHinter(sourcePath, {
        logError: pushLoggerMessage
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function () {
        expect(node.ignoredFiles).to.have.length(2);
        expect(node.ignoredFiles).to.eql(['directory/**', 'dummy/**']);
      });
    });

    it('only ignores files in paths listed in jshintignore', function () {
      var sourcePath = 'tests/fixtures/jshintignore-in-project';
      var node = new JSHinter(sourcePath, {
        destFile: 'jshint-tests.js',
        logError: pushLoggerMessage
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function(results) {
        var dir = results.directory;
        var badPath = dir + '/directory/file.lint.js';
        var goodPath = dir + '/file.lint.js';

        expect(function () {
          readFile(badPath);
        }).to.throwError();

        expect(function () {
          readFile(goodPath);
        }).to.not.throwError();
        expect(loggerOutput.join('\n')).to.match(/Missing semicolon./);
      });
    });

    it('can find a jshintignore in a specified jshintignorePath', function () {
      var sourcePath = 'tests/fixtures/jshintignore-in-custom-path';
      var node = new JSHinter(sourcePath, {
        destFile: 'jshint-tests.js',
        jshintrcRoot: 'dummy',
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function(results) {
        expect(node.ignoredFiles).to.contain('dummy/**');
      });
    });
  });

  describe('jshintrc', function () {
    it('uses the jshintrc as configuration for hinting', function () {
      var sourcePath = 'tests/fixtures/some-files-ignoring-missing-semi-colons';

      var node = new JSHinter(sourcePath, {
        logError: function(message) { loggerOutput.push(message); }
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function () {
        expect(loggerOutput.join('\n')).to.not.match(/Missing semicolon./);
      });
    });

    it('can handle too many errors', function () {
      var sourcePath = 'tests/fixtures/some-files-with-too-many-errors';

      var node = new JSHinter(sourcePath, {
        persist: false,
        logError: function(message) { loggerOutput.push(message); }
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function () {
        expect(loggerOutput.join('\n')).to.match(/Too many errors./);
      });
    });

    it('can handle jshintrc if it has comments', function () {
      var sourcePath = 'tests/fixtures/comments-in-jshintrc';

      var node = new JSHinter(sourcePath, {
        logError: function(message) { loggerOutput.push(message); }
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function () {
        expect(loggerOutput.length).to.eql(0);
      });
    });

    it('can find a jshintrc in a specified jshintrcRoot path', function () {
      var sourcePath = 'tests/fixtures/some-files-ignoring-missing-semi-colons-non-default-jshintrc-path';

      var node = new JSHinter(sourcePath, {
        persist: false,
        jshintrcRoot: 'blah',
        logError: function(message) { loggerOutput.push(message); }
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function () {
        expect(loggerOutput.join('\n')).to.not.match(/Missing semicolon./);
      });
    });

    it('can find a jshintrc in a specified jshintrcPath', function () {
      var sourcePath = 'tests/fixtures/some-files-ignoring-missing-semi-colons';

      var node = new JSHinter(sourcePath, {
        persist: false,
        jshintrcRoot: '../jshintrc-outside-project-heirarchy',
        logError: function(message) { loggerOutput.push(message); }
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function () {
        expect(loggerOutput.join('\n')).to.match(/Missing semicolon./);
      });
    });

    it('can find a jshintrc in the root of the provided node', function () {
      var sourcePath = 'tests/fixtures/some-files-ignoring-missing-semi-colons';

      var node = new JSHinter(sourcePath, {
        logError: function(message) { loggerOutput.push(message); }
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function () {
        expect(loggerOutput.join('\n')).to.not.match(/Missing semicolon./);
      });
    });

    it('can fail if failOnAnyError is true', function () {
      var sourcePath = 'tests/fixtures/some-files-doomed-to-be-failed';

      var node = new JSHinter(sourcePath, {
        failOnAnyError: true,
        logError: function(message) { loggerOutput.push(message); }
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function (){
        expect().fail();
      }, function(error) {
        expect(error.message).to.match(/JSHint failed/);
      });
    });
  });

  describe('console', function () {
    it('logs errors using custom supplied console', function () {
      var sourcePath = 'tests/fixtures/some-files-without-semi-colons';
      var consoleLogOutput = [];
      var node = new JSHinter(sourcePath, {
        persist: false,
        console: {
          log: function(data) {
            consoleLogOutput.push(data);
          }
        }
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function () {
        var expected = [
          '\n' + chalk.red('core.js: line 1, col 20, Missing semicolon.\n\n1 error') + '\n\n' + chalk.red('main.js: line 1, col 1, Missing semicolon.\n\n1 error') + '\n',
          chalk.yellow('===== 2 JSHint Errors\n')
        ];
        expect(consoleLogOutput).to.eql(expected);
      });
    });
  });

  describe('logError', function () {
    it('logs errors using custom supplied function', function () {
      var sourcePath = 'tests/fixtures/some-files-without-semi-colons';
      var node = new JSHinter(sourcePath, {
        persist: false,
        logError: function(message) { loggerOutput.push(message); }
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function () {
        expect(loggerOutput.join('\n')).to.match(/Missing semicolon./);
      });
    });

    it('does not log if `log` = false', function () {
      var sourcePath = 'tests/fixtures/some-files-without-semi-colons';
      var node = new JSHinter(sourcePath, {
        logError: function(message) { loggerOutput.push(message); },
        log: false
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function () {
        expect(loggerOutput.length).to.eql(0);
      });
    });
  });

  describe('testGenerator', function () {
    it('generates test files for jshint errors', function () {
      var sourcePath = 'tests/fixtures/some-files-without-semi-colons';
      var node = new JSHinter(sourcePath, {
        destFile: 'jshint-tests.js',
        logError: function(message) { loggerOutput.push(message); }
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function(results) {
        var dir = results.directory;

        expect(readFile(dir + '/core.lint.js')).to.match(/Missing semicolon./);

        expect(readFile(dir + '/look-no-errors.lint.js')).to.match(/ok\(true, 'look-no-errors.js should pass jshint.'\);/);
      });
    });

    it('calls escapeErrorString on the error string provided', function () {
      var escapeErrorStringCalled = false;

      var sourcePath = 'tests/fixtures/some-files-without-semi-colons';
      var node = new JSHinter(sourcePath, {
        persist: false,
        logError: function(message) { loggerOutput.push(message); },
        escapeErrorString: function(string) {
          escapeErrorStringCalled = true;

          return "blazhorz";
        }
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function (results) {
        var dir = results.directory;

        expect(escapeErrorStringCalled).to.be.ok();
        expect(readFile(dir + '/core.lint.js')).to.match(/blazhorz/);
      });
    });

    it('does not generate tests if disableTestGenerator is set', function () {
      var sourcePath = 'tests/fixtures/some-files-without-semi-colons';
      var node = new JSHinter(sourcePath, {
        destFile: 'jshint-tests.js',
        logError: function(message) { loggerOutput.push(message); },
        disableTestGenerator: true
      });

      builder = new broccoli.Builder(node);
      return builder.build().then(function (results) {
        var dir = results.directory;

        expect(readFile(dir + '/core.lint.js')).to.not.match(/Missing semicolon./);

        expect(readFile(dir + '/look-no-errors.lint.js')).to.not.match(/ok\(true, 'look-no-errors.js should pass jshint.'\);/);
      });
    });
  });

  describe('escapeErrorString', function () {
    var node;

    beforeEach(function () {
      node = new JSHinter('.', {
        logError: function(message) { loggerOutput.push(message); }
      });
    });

    it('escapes single quotes properly', function () {
      expect(node.escapeErrorString("'something'")).to.equal('\\\'something\\\'');
    });
  });
});
