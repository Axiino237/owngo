const fs = require('fs');

const code = fs.readFileSync('frontend/dist/assets/index-ClaH-O50.js', 'utf8');

const regex = /\blw\b/g;
let match;
while ((match = regex.exec(code)) !== null) {
  console.log('Match at', match.index, ':', code.slice(Math.max(0, match.index - 50), Math.min(code.length, match.index + 80)));
}
