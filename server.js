const express=require("express");
const http=require("http");
const WebSocket=require("ws");
const fs=require("fs");
const path=require("path");
const app=express(); app.use(express.json());
const server=http.createServer(app); const wss=new WebSocket.Server({server});
const PORT=process.env.PORT||3000, DB=path.join(__dirname,"database");
fs.mkdirSync(DB,{recursive:true});
const f=n=>path.join(DB,n);
function load(n,d){try{return fs.existsSync(f(n))?JSON.parse(fs.readFileSync(f(n),"utf8")):d}catch{return d}}
function save(n,d){fs.writeFileSync(f(n),JSON.stringify(d,null,2))}
const players=load("players.json",{}), activity=load("activity.json",[]);
const banks=load("banks.json",require("./config/banks.json"));
const events=require("./config/events.json"), missions=require("./missions/missions.json");
for(const b of Object.values(banks)) b.accounts ||= {};
const online=new Map();
function broadcast(x){const s=JSON.stringify(x);for(const c of wss.clients)if(c.readyState===1)c.send(s)}
function newAccount(bankId){let n;do n=String(Math.floor(1000000000+Math.random()*9000000000));while(banks[bankId].accounts[n]);return n}

app.get("/",(_,r)=>r.json({name:"Supreme Empire Server",status:"online"}));
app.get("/api/health",(_,r)=>r.json({status:"ok"}));
app.get("/api/status",(_,r)=>r.json({status:"online",onlinePlayers:online.size}));
app.get("/api/events",(_,r)=>r.json(events));
app.get("/api/missions",(_,r)=>r.json(missions));
app.get("/api/banks",(_,r)=>r.json(Object.values(banks).map(b=>({id:b.id,name:b.name}))));

app.post("/api/account",(q,r)=>{
 const {playerId,bankId}=q.body;if(!playerId||!banks[bankId])return r.status(400).json({error:"Invalid player or bank"});
 const n=newAccount(bankId);banks[bankId].accounts[n]={playerId,balance:0,createdAt:new Date().toISOString()};
 save("banks.json",banks);r.json({bank:banks[bankId].name,accountNumber:n,balance:0});
});
app.post("/api/transfer",(q,r)=>{
 const {fromBank,fromAccount,toBank,toAccount,amount}=q.body;
 if(!banks[fromBank]||!banks[toBank]||!Number.isFinite(amount)||amount<=0)return r.status(400).json({error:"Invalid transfer"});
 const a=banks[fromBank].accounts[fromAccount],b=banks[toBank].accounts[toAccount];
 if(!a||!b)return r.status(404).json({error:"Account not found"});
 if(a.balance<amount)return r.status(400).json({error:"Insufficient funds"});
 a.balance-=amount;b.balance+=amount;save("banks.json",banks);
 activity.push({type:"bank_transfer",amount,fromBank,toBank,fromAccount,toAccount,time:new Date().toISOString()});save("activity.json",activity);
 r.json({ok:true,balance:a.balance});
});
app.get("/api/players",(_,r)=>r.json([...online.values()].map(p=>({id:p.id,level:p.level,nickname:p.nickname}))));

wss.on("connection",s=>{
 let p=null;
 s.on("message",raw=>{
  let m;try{m=JSON.parse(raw)}catch{return}
  if(m.type==="login"){
   p={id:String(m.playerId||Date.now()),nickname:String(m.nickname||"Player"),level:Number(m.level||1),lastState:m.state||{},connectedAt:new Date().toISOString()};
   online.set(p.id,p);s.send(JSON.stringify({type:"login_ok",player:p}));
   broadcast({type:"players",players:[...online.values()].map(x=>({id:x.id,level:x.level,nickname:x.nickname}))});return;
  }
  if(!p)return;
  if(m.type==="activity"){
   p.lastState=m.state||p.lastState;activity.push({playerId:p.id,type:m.activity||"activity",state:p.lastState,time:new Date().toISOString()});
   save("activity.json",activity);save("players.json",Object.fromEntries(online));
  }
  if(m.type==="chat")broadcast({type:"chat",playerId:p.id,nickname:p.nickname,text:String(m.text||"")});
 });
 s.on("close",()=>{if(p){online.delete(p.id);save("players.json",Object.fromEntries(online));broadcast({type:"players",players:[...online.values()].map(x=>({id:x.id,level:x.level,nickname:x.nickname}))})}});
});
let last="";
setInterval(()=>{
 const d=new Date(),m=d.getMinutes(),sec=d.getSeconds();
 for(const e of events)if(m===(e.minute+55)%60&&sec<2){
  const k=d.toDateString()+"-"+e.id+"-"+m;if(k!==last){last=k;broadcast({type:"announcement",text:`📢 GAME CENTER: ${e.name} starts in 5 minutes! Head to the Game Center to register.`})}
 }
},1000);
server.listen(PORT,()=>console.log("Supreme Empire server listening on "+PORT));
