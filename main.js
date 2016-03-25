"use strict";

var assert = require('assert-plus');
var bunyan = require('bunyan');
var clone = require('clone');
var globalTunnel = require('global-tunnel');

var app = require('./lib');

///--- Globals

var DEFAULTS = {
    file: process.cwd() + '/etc/config.json',
    port: 80
};

var NAME = 's3-manta-bridge';

var LOG = bunyan.createLogger({
    name: NAME,
    level: (process.env.LOG_LEVEL || 'info'),
    stream: process.stdout
});

if (process.env.http_proxy || process.env.https_proxy) {
    LOG.info("Requests to Manta are being sent through a proxy");
    globalTunnel.initialize();
}

function shutdown() {

}

function run(options) {
    assert.object(options);

    var opts = clone(options);
    opts.log = LOG;
    opts.name = NAME;

    var server = app.createServer(opts);
    server.listen(options.serverPort, function () {
        opts.log.info('%s listening at %s', server.name, server.url);
    });

    function shutdown(cb) {
        server.close(function () {
            server.log.debug('Closing Manta client');
            server.mantaClient.close();
            server.log.debug('Closing Restify');

            if (cb) {
                cb();
            }

            process.exit(0);
        });
    }

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    process.once('SIGUSR2', function () {
        shutdown(function () {
            process.kill(process.pid, 'SIGUSR2');
        });
    });
}

///--- Mainline

(function main() {
    var config = require(DEFAULTS.file);

    LOG.debug({
        config: config
    }, 'main: options and config parsed');

    run(config);
})();
