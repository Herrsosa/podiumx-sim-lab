const http = require('http');
const fs = require('fs');

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" fill="hsl(0, 70%, 92%)"/><rect x="6" y="3" width="1" height="1" fill="hsl(0, 75%, 44%)"/></svg>';
const uri = 'data:image/svg+xml,' + encodeURIComponent(svg);

const html = `
<!DOCTYPE html>
<html>
<body>
  <h1>Test Image</h1>
  <img id="testimg" src="${uri}" style="border: 2px solid red;" />
</body>
</html>
`;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}).listen(8081, () => {
  console.log('Server running closely on 8081');
});
