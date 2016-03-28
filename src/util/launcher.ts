import { platform } from 'os';
import { accessSync, X_OK } from 'fs';
import { connect, Socket } from 'net';
import { spawn, ChildProcess } from 'child_process';
import { LaunchConfiguration } from '../adapter/launchConfiguration';

export function launchFirefox(config: LaunchConfiguration): ChildProcess {

	let firefoxPath = getFirefoxExecutablePath(config);	
	
	let port = config.port || 6000;
	let firefoxArgs: string[] = [ '--start-debugger-server', String(port), '--no-remote' ];
	if (config.profile) {
		firefoxArgs.push('-P', config.profile);
	}
	if (Array.isArray(config.firefoxArgs)) {
		firefoxArgs = firefoxArgs.concat(config.firefoxArgs);
	}
	if (config.file) {
		firefoxArgs.push(config.file);
	} else if (config.url) {
		firefoxArgs.push(config.url);
	}
	
	let childProc = spawn(firefoxPath, firefoxArgs, { detached: true, stdio: 'ignore' });
	childProc.unref();
	return childProc;
}

export function waitForSocket(): Promise<Socket> {
	return new Promise<Socket>((resolve, reject) => {
		tryConnect(200, 25, resolve, reject);
	});
}

function getFirefoxExecutablePath(config: LaunchConfiguration): string {

	if (config.firefoxExecutable) {
		return config.firefoxExecutable;
	}
	
	let candidates: string[] = [];
	switch (platform()) {
		
		case 'linux':
		case 'freebsd':
		case 'sunos':
			candidates = [
				'/usr/bin/firefox'
			]
			break;

		case 'darwin':
			candidates = [
				'/Applications/Firefox.app/Contents/MacOS/firefox'
			]
			break;

		case 'win32':
			candidates = [
				'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
				'C:\\Program Files\\Mozilla Firefox\\firefox.exe'
			]
			break;
	}

	for (let i = 0; i < candidates.length; i++) {
		if (isExecutable(candidates[i])) {
			return candidates[i];
		}
	}
	
	return null;
}

function isExecutable(path: string): boolean {
	try {
		accessSync(path, X_OK);
		return true;
	} catch (e) {
		return false;
	}
}

function tryConnect(retryAfter: number, tries: number, resolve: (sock: Socket) => void, reject: (err: any) => void) {
	let socket = connect(6000);
	socket.on('connect', () => resolve(socket));
	socket.on('error', (err) => {
		if (tries > 0) {
			setTimeout(() => tryConnect(retryAfter, tries - 1, resolve, reject), retryAfter);
		} else {
			reject(err);
		}
	});
}