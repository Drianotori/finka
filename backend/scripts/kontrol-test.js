// Tes kontrol orang tua (limit harian & blokir kartu). Butuh backend jalan dgn data demo (npm run seed / dev).
const B=process.env.BASE_URL||'http://localhost:3001/api'
const call=async(m,p,t,b)=>{const r=await fetch(B+p,{method:m,headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:b?JSON.stringify(b):undefined});return [r.status,await r.json().catch(()=>({}))]}
const L=async(u,p)=>(await call('POST','/auth/login',null,{username:u,password:p}))[1]
const ortu=await L('ortu.sari','123456'), admin=await L('admin','admin123'), pic=await L('pic.kantin.utama','123456'), sis=await L('aditya.p','123456')
const id=sis.user.id
// isi saldo 100rb
const [,t]=await call('POST','/topup',ortu.token,{siswa_id:id,nominal:100000}); await call('POST',`/topup/${t.id}/approve`,admin.token)
const qr=async()=>(await call('GET','/pos/qr',sis.token))[1].token
const beli=async(q)=>call('POST','/pos/transaksi',pic.token,{siswa_id:id,pin:'135790',items:[{produk_id:1,qty:1}],qr_token:q}) // 15000
let gagal=0
const ok=(n,c,x)=>{if(!c)gagal++;console.log(c?'OK   ':'GAGAL',n,c?'':JSON.stringify(x))}
let r=await call('GET',`/ortu/anak/${id}/kontrol`,ortu.token); ok('default: limit nonaktif',r[1].limit_aktif===false&&r[1].kartu_diblokir===false,r)
r=await call('PUT',`/ortu/anak/${id}/kontrol`,ortu.token,{limit:20000,limit_aktif:true}); ok('ortu set limit 20rb',r[0]===200&&r[1].limit===20000,r)
r=await beli(await qr()); ok('belanja 15rb lolos (di bawah limit)',r[0]===200,r)
r=await beli(await qr()); ok('belanja ke-2 15rb ditolak (total 30rb > 20rb) 403',r[0]===403&&/limit/i.test(r[1].error),r)
r=await call('GET',`/ortu/anak/${id}/kontrol`,ortu.token); ok('terpakai_hari_ini=15000, sisa=5000',r[1].terpakai_hari_ini===15000&&r[1].sisa_limit===5000,r)
r=await call('PUT',`/ortu/anak/${id}/kontrol`,ortu.token,{limit_aktif:false}); r=await beli(await qr()); ok('limit dimatikan -> belanja lolos',r[0]===200,r)
await call('PUT',`/ortu/anak/${id}/kontrol`,ortu.token,{kartu_diblokir:true})
r=await beli(await qr()); ok('kartu diblokir -> transaksi ditolak 403',r[0]===403&&/blokir/i.test(r[1].error),r)
r=await call('POST','/pos/qr/resolve',pic.token,{token:await qr()}); ok('kartu diblokir -> scan QR ditolak 403',r[0]===403,r)
r=await call('PUT',`/ortu/anak/${id}/kontrol`,ortu.token,{kartu_diblokir:false}); r=await beli(await qr()); ok('blokir dibuka -> lolos',r[0]===200,r)
const ortu2=await call('POST','/admin/users',admin.token,{role:'ortu',nama:'Ortu Lain',username:'ortu.lain.'+Date.now(),password:'rahasia123'})
const o2=await L(ortu2[1].user?.username||ortu2[1].username||'x','rahasia123')
r=await call('PUT',`/ortu/anak/${id}/kontrol`,o2.token,{kartu_diblokir:true}); ok('ortu lain tidak boleh ubah kontrol anak orang (403)',r[0]===403,r)
r=await call('PUT',`/ortu/anak/${id}/kontrol`,ortu.token,{limit:5}); ok('limit tak valid ditolak 400',r[0]===400,r)
console.log(gagal?`${gagal} TEST GAGAL`:'SEMUA TEST LULUS'); process.exit(gagal?1:0)
