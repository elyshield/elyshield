#!/usr/bin/env bash
# Publish elyshield-mcp ke npm sebagai akun `elyshield`.
#
# Jalanin ini HANYA setelah `npm login` selesai dan `npm whoami` balikin `elyshield`.
# Script berhenti sendiri kalau akunnya salah — jangan publish paket ini dari akun lain,
# karena sekali terbit, kepemilikan paket pindah permanen ke akun itu.

set -euo pipefail

export PATH="$HOME/.nvm/versions/node/v24.18.1/bin:$PATH"
cd "$(dirname "$0")/../packages/mcp"

EXPECTED_USER="elyshield"
EXPECTED_PKG="elyshield-mcp"

echo "=== 1. cek akun ==="
WHO=$(npm whoami 2>/dev/null || echo "")
if [ -z "$WHO" ]; then
  echo "GAGAL: belum login. Jalankan 'npm login --auth-type=web' dulu." >&2
  exit 1
fi
if [ "$WHO" != "$EXPECTED_USER" ]; then
  echo "GAGAL: login sebagai '$WHO', harusnya '$EXPECTED_USER'." >&2
  echo "       Logout dulu: npm logout" >&2
  exit 1
fi
echo "  OK: $WHO"

echo "=== 2. cek manifest ==="
node -e "
const p=require('./package.json');
const bad=[];
if(p.name!=='$EXPECTED_PKG') bad.push('name='+p.name);
if(p.bin['$EXPECTED_PKG']!=='dist/server.js') bad.push('bin');
if(p.publishConfig.access!=='public') bad.push('access');
if(bad.length){console.error('  GAGAL: '+bad.join(', '));process.exit(1);}
console.log('  OK: '+p.name+'@'+p.version+' (public)');
"

echo "=== 3. rebuild dari sumber terbaru ==="
npm run build 2>&1 | grep -E "Build success|error" | tail -2
[ -f dist/server.js ] || { echo "GAGAL: dist/server.js tidak ada" >&2; exit 1; }

echo "=== 4. smoke test: server harus hidup & punya 6 tool ==="
node -e "
const {spawn}=require('child_process');
const p=spawn('node',['dist/server.js'],{stdio:['pipe','pipe','pipe']});
let buf='';let done=false;
const fin=(ok,msg)=>{if(done)return;done=true;console.log(ok?'  OK: '+msg:'  GAGAL: '+msg);try{p.kill()}catch{};process.exit(ok?0:1)};
setTimeout(()=>fin(false,'timeout'),15000);
p.stdout.on('data',d=>{
  buf+=d;
  for(const line of buf.split('\n')){
    if(!line.trim())continue;
    let m;try{m=JSON.parse(line)}catch{continue}
    if(m.id===1&&m.result){
      p.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized',params:{}})+'\n');
      p.stdin.write(JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list',params:{}})+'\n');
    }
    if(m.id===2&&m.result){
      const t=m.result.tools||[];
      fin(t.length===6&&t.every(x=>x.name.startsWith('elyshield_')),t.length+' tools elyshield_*');
    }
  }
});
p.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'prepublish',version:'1'}}})+'\n');
"

echo "=== 5. publish ==="
npm publish --access public
echo
echo "=== 6. verifikasi registry ==="
sleep 4
npm view "$EXPECTED_PKG" version dist-tags.latest 2>&1 | head -3
