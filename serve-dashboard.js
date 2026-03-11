const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 5000;
const dashboardDir = path.join(__dirname, 'simulation-dashboard');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  let filePath = path.join(dashboardDir, req.url === '/' ? 'admin.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Dashboard server running at http://localhost:${port}/`);
  console.log(`Admin dashboard: http://localhost:${port}/admin.html`);
});
