const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// Enable CORS for Webflow
app.use(cors());

// Serve files from your existing src directory
app.use(express.static('src'));

// Start server
app.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
  console.log(`Access your files at: http://localhost:${port}/index.js`);
});