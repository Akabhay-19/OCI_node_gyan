import { spawn } from 'child_process';

const proc = spawn('node', ['backend/server.js'], {
    cwd: process.cwd(),
    stdio: 'pipe'
});

proc.stdout.on('data', (data) => {
    console.log(data.toString());
});

proc.stderr.on('data', (data) => {
    console.error(data.toString());
});

proc.on('close', (code) => {
    console.log('Exit code:', code);
});

setTimeout(() => proc.kill(), 10000);
