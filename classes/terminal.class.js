const { spawn } = require("child_process");
class Terminal {
  constructor(shell = "/bin/bash") {
    this.shell = shell;
    this.process = spawn(this.shell, [], {
      env: process.env,
      shell: true
    });
  }

  write(input) {
    this.process.stdin.write(input);
  }

  onData(callback) {
    this.process.stdout.on("data", callback);
    this.process.stderr.on("data", callback);
  }

  close() {
    this.process.kill();
  }
}
module.exports = { Terminal };
