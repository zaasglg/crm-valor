const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Chat Clone...');

// Start the server
const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.kill();
  process.exit();
});