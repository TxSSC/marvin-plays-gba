// Node server for receiving hubot commands and forwarding them to a client

var http = require('http'),
    path = require('path'),
    fs = require('fs'),
    _html = null,
    _retry = null,
    _client = null,
    PORT = process.env.GBA_PORT || 3000;

fs.readFile(__dirname + '/index.html', function (err, html) {
  if (err) {
    throw err;
  }
  _html = html;
});

function contentType(ext) {
  var ct;

  switch (ext) {
    case '.html':
      ct = 'text/html';
      break;
    case '.css':
      ct = 'text/css';
      break;
    case '.js':
      ct = 'text/javascript';
      break;
    default:
      ct = 'text/plain';
      break;
  }
  return { 'Content-Type': ct };
}

// Start the keep alive connection with the client
function startBeat() {
  _client.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin' : '*',
    'Connection': 'keep-alive'
  });

  _client.write('retry: 10000\n');
  _client.write('data: '+Date()+'\n\n');

  _retry = setInterval(function () {
    _client.write('data: '+Date()+'\n\n');
  }, 10000);
}

// Forward data to the client
function sendData(event, data) {
  try {
    _client.write('id: '+new Date().getMilliseconds()+'\n');
    _client.write('event: '+event+'\n');
    _client.write('data: '+data+'\n\n');
    console.log('Sending: '+event+' '+data);
  } catch(err) {
    console.log('Error: no client');
  }
}

var server = http.createServer(function (req, res) {
  var data = '',
      dataType = '';

// Open and close connection with client
  if (req.headers.accept && req.headers.accept == 'text/event-stream') {
    if(req.url == '/events') {
      _client = res;
      startBeat();
      console.log('Connection opened with client');
    }

    req.on('close', function () {
      clearInterval(_retry);
      console.log('Connection closed by client');
    });
  }

// Receive hubot data and forward it to the client
  else if (req.method == 'POST') {
    req.on('data', function (chunk) {
      data += chunk;
    });

    req.on('end', function () {
      res.writeHead(200, {'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin' : '*'
      });
      data = require('url').parse(req.url).query;
      console.log('Received data: '+data)

      dataType = data.slice(0, data.indexOf('='));
      data = data.slice(data.indexOf('=')+1);

      if(dataType == 'load') {
        res.end(data);
        sendData('load', data);
      }
      else {
        res.end();
        dataType = data.slice(0, data.indexOf('&'));
        data = data.slice(data.indexOf('=')+1);
        sendData('push', dataType+' '+data);
      }
    });

// Return static pages and files
  } else {
    var filePath = (req.url == '/' ? 'index.html' : '.' + req.url),
        fileExt = path.extname(filePath);

    fs.exists(filePath, function (f) {
      if (f) {
        // Serve index.html
        if (filePath == 'index') {
          res.writeHeader(200, {'Content-Type': 'text/html'});
          res.end(_html);
        }
        // Serve any other file
        else {
          fs.readFile(filePath, function (err, content) {
            if (err) {
              res.writeHead(500);
              res.end();
            } else {
              res.writeHead(200, contentType(fileExt));
              res.end(content);
            }
          });
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    // res.writeHeader(200, contentType(fileExt));
    // res.end(_html);
  }
});

server.listen(PORT);
console.log('Server running on port: ' + PORT);
