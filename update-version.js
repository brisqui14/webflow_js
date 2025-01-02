const { execSync } = require('child_process');
const fs = require('fs');

// Get the latest commit hash
const hash = execSync('git rev-parse --short HEAD').toString().trim();

// Create the CDN URL
const cdnUrl = `https://cdn.jsdelivr.net/gh/brisqui14/webflow_js@${hash}/src/job-board.js`;

console.log('\nLatest commit hash:', hash);
console.log('\nCDN URL:', cdnUrl);
console.log('\nWebflow import script:');
console.log(`<script type="module">
  import JobBoard from '${cdnUrl}';
  
  document.addEventListener('DOMContentLoaded', () => {
    JobBoard.init();
  });
</script>`);