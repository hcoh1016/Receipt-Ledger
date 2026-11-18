const fs=require('fs'),path=require('path');
const p=path.join(__dirname,'../node_modules/@react-native/gradle-plugin/settings.gradle.kts');
if(fs.existsSync(p)){const s=fs.readFileSync(p,'utf8');const next=s.replace(/(id\("org.gradle.toolchains.foojay-resolver-convention"\)\.version\(")0\.5\.0("\))/,'$11.0.0$2');if(next!==s){fs.writeFileSync(p,next);console.log('Updated Foojay resolver to 1.0.0 for Gradle 9');}}
