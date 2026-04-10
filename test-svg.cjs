const fs = require('fs');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" fill="hsl(0, 70%, 92%)"/><rect x="6" y="3" width="1" height="1" fill="hsl(0, 75%, 44%)"/></svg>';
const uri = 'data:image/svg+xml,' + encodeURIComponent(svg);
const html = '<img src="' + uri + '" />';
fs.writeFileSync('test.html', html);
console.log(uri);
