#!/usr/bin/env node

const path = require("path");

const execa = require("execa");
const yargs = require("yargs");

const Configstore = require('configstore');
const userSettings = new Configstore('tunnow'); // does not create file until first key is set
// {
//   defaultAlias: <url, no https://>,
//   defaultPort: <port number>,
// }

const tunnelNowPath = path.resolve(__dirname, "..");


const run = (...cmd) => {
  const [ cmdName, ...args ] = cmd;
  return execa(cmdName, args, { cwd: tunnelNowPath });
  if (opts.echo) {
    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stderr);
  }
  return p;
};

const runEcho = (...cmd) => {
  const p = run(...cmd);
  p.stdout.pipe(process.stdout);
  return p;
};

const main = async () => {
  let { _: [ alias ] } = yargs
    .usage('tunnel.deploy [alias]')
    .help()
    .argv;

  const { stdout: deployedUrl } = await run("now", "deploy", "-V", "1");
  const hostname = deployedUrl.replace(/https?:\/\//, "");
  console.log(`tunnel.now host has been deployed to ${hostname}`);
  alias = alias ? alias : userSettings.get('defaultAlias')
  if (alias) {
    console.log(`setting alias "${alias}"...\n`);
    await runEcho("now", "alias", "set", hostname, alias);
    console.log("");
  }
  console.log("Done!");
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
