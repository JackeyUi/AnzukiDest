#!/usr/bin/env python3
"""Build a signed, development Android APK using Android SDK 35; no Gradle needed."""
from pathlib import Path
import argparse, hashlib, json, os, shutil, subprocess, sys, time, zipfile

ROOT=Path(__file__).resolve().parents[1]
def run(args):
    result=subprocess.run([str(a) for a in args],capture_output=True,text=True)
    if result.returncode:
        print(result.stdout);print(result.stderr,file=sys.stderr)
        raise SystemExit(result.returncode)
    return result.stdout

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--sdk',default=os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT'))
    parser.add_argument('--keystore',default=str(ROOT/'.local/android-signing/debug.keystore'))
    parser.add_argument('--out',default=str(ROOT/'android/releases/Anzuki-Android.apk'))
    parser.add_argument('--version-code',type=int,default=int(time.time()//60))
    args=parser.parse_args()
    if not args.sdk:parser.error('Pass --sdk /path/to/android-sdk, or set ANDROID_HOME')
    sdk=Path(args.sdk);tools=sdk/'build-tools/35.0.0';platform=sdk/'platforms/android-35/android.jar'
    if not platform.exists() or not (tools/'aapt2').exists():parser.error('Android platform 35 and build-tools 35.0.0 are required')
    run([sys.executable,ROOT/'scripts/sync-android-assets.py'])
    work=ROOT/'.local/android-build'
    if work.exists():shutil.rmtree(work)
    (work/'classes').mkdir(parents=True);(work/'dex').mkdir()
    source=ROOT/'android/app/src/main'
    java=shutil.which('java')
    if not java:parser.error('Java JDK 17+ is required')
    index=json.loads((source/'assets/animations.json').read_text())
    version='0.1.'+index['revision'][:8]
    run([java,'com.sun.tools.javac.Main','-source','8','-target','8','-classpath',platform,
         '-d',work/'classes',*sorted((source/'java').rglob('*.java'))])
    jar=work/'classes.jar'
    with zipfile.ZipFile(jar,'w') as z:
        for p in sorted((work/'classes').rglob('*.class')):z.write(p,p.relative_to(work/'classes'))
    run([java,'-cp',tools/'lib/d8.jar','com.android.tools.r8.D8','--min-api','28',
         '--lib',platform,'--output',work/'dex',jar])
    run([tools/'aapt2','compile','--dir',source/'res','-o',work/'resources.zip'])
    run([tools/'aapt2','link','-I',platform,'--manifest',source/'AndroidManifest.xml',
         '-A',source/'assets','-0','webp','--version-code',args.version_code,
         '--version-name',version,'-o',work/'base.apk',work/'resources.zip'])
    with zipfile.ZipFile(work/'base.apk','a',zipfile.ZIP_DEFLATED) as z:
        for p in sorted((work/'dex').glob('*.dex')):z.write(p,p.name)
    run([tools/'zipalign','-f','4',work/'base.apk',work/'aligned.apk'])
    keystore=Path(args.keystore);keystore.parent.mkdir(parents=True,exist_ok=True)
    if not keystore.exists():
        keytool=shutil.which('keytool') or str(Path(java).resolve().parent/'keytool')
        run([keytool,'-genkeypair','-keystore',keystore,'-alias','androiddebugkey',
             '-storepass','android','-keypass','android','-dname','CN=Anzuki Development',
             '-keyalg','RSA','-keysize','2048','-validity','10000','-storetype','JKS','-noprompt'])
    out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
    run([java,'-jar',tools/'lib/apksigner.jar','sign','--ks',keystore,
         '--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android',
         '--out',out,work/'aligned.apk'])
    verification=run([java,'-jar',tools/'lib/apksigner.jar','verify','--verbose','--print-certs',out])
    badging=run([tools/'aapt2','dump','badging',out])
    (out.parent/'apk-metadata.json').write_text(json.dumps({
        'package':'com.jackeyui.anzukipet','versionName':version,'versionCode':args.version_code,
        'minimumAndroid':9,'minimumSdk':28,'targetSdk':35,'assetRevision':index['revision'],
        'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'bytes':out.stat().st_size,
        'signing':'development key; private keystore is not published'},indent=2)+'\n')
    print(verification);print(badging.splitlines()[0]);print('APK:',out)
if __name__=='__main__':main()
