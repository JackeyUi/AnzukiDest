// Compatibility entry point: verify the current lossless desktop assets.
// Deprecated low-resolution WebM files must never be installed as defaults.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const result=spawnSync(process.execPath,[fileURLToPath(new URL('./launch.mjs',import.meta.url)),'--check'],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
if(!process.exitCode)console.log('Use Start-Windows.cmd or node launch.mjs to start Anzuki.');
