#!/usr/bin/env node

const yargs = require("yargs");
const WebSocket = require("ws");
const { default: fetch, Headers } = require("node-fetch");

const Configstore = require('configstore');
const userSettings = new Configstore('tunnow'); // does not create file until first key is set
// {
//   defaultAlias: <url, no https://>,
//   defaultPort: <port number>,
// }

const {
  request: { decode: decodeRequest },
  response: { encode: encodeResponse }
} = require("./codec");


let { hostname, port } = yargs
  .usage('$0 --host <remote-hostname> --port <local-port>')
  .alias('h', 'hostname')
  .default('h', userSettings.get('defaultAlias'))
  .alias('p', 'port')
  .default('p', userSettings.get('defaultPort'))
  .demandOption(['h', 'p'])
  .help()
  .argv;
  // yargs is smart with defaults: if undefined, it's not set

if (!hostname) {
  console.error("You must supply a name for a remote host, listening on port 443.");
  process.exit(1);
}
if (!port) {
  console.error("You must indicate which local port that requests should be forwarded to.");
  process.exit(1);
}

const baseTargetUrl = `http://localhost:${port}`;

const uri = `wss://https://${hostname}:443`;
const socket = new WebSocket(uri);

socket.addEventListener("open", () => {
  console.log(`Connected to ${uri}.`);
  console.log(`Tunneling requests to ${baseTargetUrl}...`);
});

socket.addEventListener("message", ev => {
  const {
    id,
    url,
    method,
    headers,
    body
  } = decodeRequest(ev.data);

  console.log(`> ${method} ${url}`);

  fetch(`${baseTargetUrl}${url}`, {
    method,
    headers,
    // Alternately, `Buffer.from(body.slice().buffer)`.
    body: Buffer.from(body.buffer, body.byteOffset, body.length),
    redirect: "manual"
  }).then(response => {
    return response.buffer().then(body => {
      socket.send(encodeResponse({
        id,
        statusCode: response.status,
        headers: response.headers,
        body
      }));
    });
  });
});

const keepAliveId = setInterval(() => {
  socket.send("PING");
}, 60000);

socket.addEventListener("close", () => {
  clearInterval(keepAliveId);
  console.log("The connection has been terminated.");
});

socket.addEventListener("error", ev => {
  if (ev.code === "ECONNREFUSED") {
    console.log("We were unable to establish a connection with the server.");
  } else {
    console.log(ev.error.toString());
  }
});
