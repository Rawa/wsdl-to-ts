#!/usr/bin/env node
"use strict";
import { rename, writeFile, readFileSync } from "fs";
import * as minimist from "minimist";
import * as mkdirp from "mkdirp";
import { mergeTypedWsdl, outputTypedWsdl, wsdl2ts } from "./wsdl-to-ts";
const opts = {};
const config = { outdir: "./wsdl", files: [], eslintDisable: ["max-line-length", "no-empty-interface"], eslintEnable: [] };
let soapOptions = {};
const args = minimist(process.argv.slice(2));
if (args.help) {
    // TODO
}
if (args.version) {
    /* tslint:disable:no-var-requires */
    const pack = require("../package.json");
    console.log("%s %s", "wsdl-to-ts", pack.version);
    process.exit(0);
    throw new Error("Exited");
}
if (args.hasOwnProperty("eslint")) {
    if (args.eslint === "true") {
        config.eslintEnable = null;
    }
    else if (args.eslint === "false" || args.eslint === "disable") {
        config.eslintDisable = null;
    }
    else {
        config.eslintEnable = args.eslint ? args.eslint.split(",") : null;
    }
}
if (args.hasOwnProperty("eslint-disable")) {
    config.eslintDisable = args["eslint-disable"] ? args["eslint-disable"].split(",") : null;
}
if (args.outdir || args.outDir) {
    config.outdir = args.outdir || args.outDir;
}
if (args.hasOwnProperty("quote")) {
    if (args.quote === "false" || args.quote === "disable" || args.quote === "0") {
        opts.quoteProperties = false;
    }
    else if (args.quote === "true" || args.quote === "1" || !args.quote) {
        opts.quoteProperties = true;
    }
}
if (args.hasOwnProperty("cert") && args.hasOwnProperty("cert_password")) {
    const cert = readFileSync(args.cert);
    soapOptions = {
        wsdl_options: {
            pfx: cert,
            passphrase: args.cert_password
        }
    };
}
if (args._) {
    config.files.push.apply(config.files, args._);
}
if (config.files.length === 0) {
    console.error("No files given");
    process.exit(1);
    throw new Error("No files");
}
function mkdirpp(dir, mode) {
    return new Promise((resolve, reject) => {
        mkdirp(dir, mode || 0o755, (err, made) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(made);
            }
        });
    });
}
Promise.all(config.files.map((a) => wsdl2ts(a, soapOptions, opts))).
    then((xs) => mergeTypedWsdl.apply(undefined, xs)).
    then(outputTypedWsdl).
    then((xs) => {
    return Promise.all(xs.map((x) => {
        console.log("-- %s --", x.file);
        console.log("%s", x.data.join("\n\n"));
        const file = config.outdir + "/" + x.file;
        const dir = file.replace(/\/[^/]+$/, "");
        return mkdirpp(dir).then(() => {
            return new Promise((resolve, reject) => {
                const tsfile = file + ".ts.tmp";
                const fileData = [];
                if (config.eslintEnable === null) {
                    fileData.push("/* eslint-enable */");
                }
                if (config.eslintDisable === null) {
                    fileData.push("/* eslint-disable */");
                }
                else if (config.eslintDisable.length !== 0) {
                    fileData.push("/* eslint-disable " + config.eslintDisable.join(",") + " */");
                }
                if (config.eslintEnable && config.eslintEnable.length !== 0) {
                    fileData.push("/* eslint-enable " + config.eslintEnable.join(",") + " */");
                }
                fileData.push(x.data.join("\n\n"));
                fileData.push("");
                writeFile(tsfile, fileData.join("\n"), (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(tsfile);
                    }
                });
            });
        });
    }));
}).
    then((files) => Promise.all(files.map((file) => {
    return new Promise((resolve, reject) => {
        const realFile = file.replace(/\.[^.]+$/, "");
        rename(file, realFile, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(realFile);
            }
        });
    });
}))).
    catch((err) => {
    console.error(err);
    process.exitCode = 3;
});
//# sourceMappingURL=index.js.map