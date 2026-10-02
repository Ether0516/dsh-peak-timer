const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
fs.mkdirSync(path.join(root,'lib'),{recursive:true});
fs.writeFileSync(path.join(root,'lib/index.js'),read('src/index.js'));
fs.writeFileSync(path.join(root,'lib/client.js'),`window.__ModuleLoader__.load({id:"dsh-peak-timer",factory:(require)=>{const module={exports:{}};const exports=module.exports;\n${read('src/calendar.cjs').replace(/module\.exports = [^\n]+;/,'')}\nconst TIMER_CSS=${JSON.stringify(read('src/timer.css'))};\n${read('src/client.cjs')}\nreturn module.exports;}});\n`);
console.log('Built dsh-peak-timer (offline).');
