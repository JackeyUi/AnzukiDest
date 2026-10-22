import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<12))throw new Error('Please install Node.js 22.12+ from https://nodejs.org/');
const args=process.argv.slice(2);
if(args.some(a=>!['--check','--prepare-only'].includes(a)))throw new Error('Usage: node launch.mjs [--check | --prepare-only]');
const index=JSON.parse(await readFile(join(root,'pet','animations.json'),'utf8'));
if(index.width!==720||index.height!==1280)throw new Error('Original-resolution artwork is required');
for(const a of Object.values(index.animations))await readFile(join(root,'pet','anzuki-animation',a.file));
for(const name of ['voice-config.json','voice-lines.json'])JSON.parse(await readFile(join(root,'pet',name),'utf8'));
console.log('Anzuki original-resolution lossless artwork ready: '+index.revision);
if(!args.includes('--check')&&!args.includes('--prepare-only')){
 const npmArgs=['exec','--yes','--package=electron@43.3.0','--','electron','desktop'];
 const child=process.platform==='win32'
  ?spawn(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm '+npmArgs.join(' ')],{cwd:root,env:process.env,stdio:'inherit'})
  :spawn('npm',npmArgs,{cwd:root,env:process.env,stdio:'inherit'});
 child.on('error',e=>{console.error(e.message);process.exitCode=1;});
 child.on('exit',code=>{process.exitCode=code??1;});
}
