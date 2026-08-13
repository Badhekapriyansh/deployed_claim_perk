require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { fork } = require("child_process");
const path = require("path");

console.log("Starting backend server process...");
const serverProcess = fork(path.join(__dirname, "..", "server.js"), [], {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit"
});

// Wait for server to start listening
setTimeout(() => {
  console.log("\nLaunching JWT verification test script...\n");
  const testProcess = fork(path.join(__dirname, "testJwtAuth.js"), [], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit"
  });

  testProcess.on("exit", (code) => {
    console.log(`\nTest script finished with code ${code}. Stopping backend server...`);
    serverProcess.kill("SIGTERM");
    process.exit(code);
  });
}, 3000);
