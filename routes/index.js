var express = require('express');
var router = express.Router();
const Instagram = require('./instx.js');
var request = require("request");
const FileCookieStore = require('tough-cookie-filestore');
const Telegraf = require('telegraf');
var fs = require("fs");

//Cookies File
var cookieStore = new FileCookieStore('./user/cookies.json');

// //Config
// var username = "samawisamer1",
//     password = "";
var Config = JSON.parse(fs.readFileSync("./user/data.json"));

//Set Process False
Config.Start = false;

var client = new Instagram({ cookieStore });

// (async function () {
// await client.login();
// // console.log("logined");
// // var result = await client.getHashtag("love");
// // console.log(result);
// // var s = await client.addComment({ mediaId: result, text: 'hi' });
// // console.log(s);
// })();


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
var i = 0;
var c = 0;
var err2 = 0;
async function Start() {
if (Config.times > Config.tags.length) Config.times = Config.tags.length;
for (var n=0; n<Config.times; n++) {
var ms = rand(800, 1200);
if (n > 0) await sleep(2 * ms);
var e = 0;
var tag = Config.tags[i];
console.log(tag);
var result = await client.getHashtag(tag)
.catch(er => {e={code:1, data:er}});
if (e) {
  onError(e);
  return;
}
console.log(result);
var s = await client.addComment({ mediaId: result.id, text: Config.text })
.catch(er => {e={code:2, data:er}});
if (e) {
  onError(e, result);
  return;
}
//console.log(s);
if (s.status == 'ok') {
  if (err2 == 1) err2 = 0;
  var code = client.getShortcodeFromId(result);
  var url = "https://www.instagram.com/p/" + result.code;
  if (Config.report.posts.length >= 10) Config.report.posts.shift();
  Config.report.posts.push(url);
  Config.report.len++;
  saveConfig();
}
else {
  tel.reply(`**** Error Code 3 ****`);
  return;
}
if (i == Config.tags.length - 1) i = 0; else i++;
}
if (Config.Start) { //process is true
  await sleep(Config.time * rand(900,1100));
  Start();
}
}

async function onError(er, ob) {
  console.log("Error Code: " + er.code);
  stop();
  if (er.code == 2) {
    fs.writeFileSync("user/error.json", JSON.stringify(ob));
    //if (err2 == 1) return tel.reply(`*** ERROR CODE ${er.code} ***`);
    Config.report.errors++;
    err2 = 1;
    // await sleep(1 * 1000);
    // logout();
    // var er1;
    // await client.login({username:Config.user.email, password:Config.user.pass})
    // .catch(e => {er1=1;});
    // if (!isLogin() && er1) {
    //   tel.reply("حدث خطأ بالمصادقة");
    //   stop();
    //   return;
    // }
    // Config.Start = true;
    // Start();
    
    // tel.reply("started");
    // Start();
    tel.reply(`حدث خطأ
    رقم: 2
    تم ايقاف العمليات
    الاجراءات الازمة
    -تسجيل الخروج واعادة الدخول
    -البدأ من جديد`);
    fs.writeFileSync("user/error.json", er.data.toString());
    return;
  }
  tel.reply(`*** ERROR CODE ${er.code} ***`);
  await sleep(10 * 1000 * 60);
  fs.writeFileSync("user/error.json", er.data.toString());
  console.log(er.data);
  Start();
  Config.Start = true;

}


async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stop() {
  //Stop process
  Config.Start = false;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}


//************** Telegram BOT ***************** *//
const bot = new Telegraf(Config.token);
bot.start((ctx) => {
  var username = ctx.update.message.chat.username;
  if (Config.username !== username) {
    ctx.reply("تم رفض الوصول");
    return;
  }
  if (! client.isLogin()) return ctx.reply("Please Login !!");
  if (!Config.Start) {
    Config.Start = !Config.Start;
    Start();
    var asiaTime = new Date().toLocaleString("en-US", {timeZone: "Asia/Baghdad"});
    Config.report.start = asiaTime;
    tel = ctx;
    ctx.reply("تم تفعيل الخدمة بنجاح");
  }
  else {
    ctx.reply("الخدمة مفعلة مسبقاً");
  }
  
  
});

bot.use((ctx, next) => {
  var username = ctx.update.message.chat.username;
  if (username == Config.admin) {
    var text = ctx.update.message.text;
    var sp = text.split(" ");
    var cmd = sp[0];
    var v = sp[1];
    if (cmd == "/setuser") {
      if (!v) return ctx.reply("user not valid");
      config.username = v;
      saveConfig();
      ctx.reply("Success!");
    }
    else next();
  } else next();
  
});

bot.use((ctx, next) => {
  var username = ctx.update.message.chat.username;
  if (Config.username !== username) {
    ctx.reply("تم رفض الوصول");
    return;
  }
  return next()
});

bot.use((ctx, next) => {
  tel = ctx;
  return next()
})
bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.on('sticker', (ctx) => ctx.reply('👍'));

bot.command("login", async (ctx) => {
  var text = ctx.update.message.text;
  tel = ctx;
  var ob = text.split(" ");
  var username = ob[1];
  var password = ob[2];
  if ( !(username && password) )  {
    return ctx.reply(`Use:\n/login [YourUsername] [YourPassword]`);
  }
  var e;
  await client.login({username, password}).catch(er => {e=1});
  if (!e && client.isLogin()) {
    ctx.reply('تم تسجيل الدخول بنجاح');
    Config.user = {
      email:username,
      pass:password
    }
    saveConfig();
  }
  else {
    ctx.reply("فشلت المصادقة");
  }
  
});
bot.command("stop", ctx => {
  if (Config.Start) {
    stop();
    ctx.reply("تم ايقاف الخدمة");
  }
  else {
    ctx.reply("الخدمة متوقفة");
  }
});

bot.command("settags", ctx => {
  if (Config.Start) return ctx.reply("لا يمكن تنفيذ هذا الاجراء والعمليات تعمل");
  var text = ctx.update.message.text;
  var list = text.split(" ");
  list.shift();
  if (list.length > 0) {
    Config.tags = list;
    saveConfig();
    ctx.reply("Success");
  }
  else ctx.reply("Use: \n settags [LIST HASHTAGS]");
});

bot.command("settext", ctx => {
  var text = ctx.update.message.text;
  var newtext = text.split(/ (.+)/).slice(1,100).join("");
  if (!newtext) return ctx.reply("Use: \n [settext YOUR NEW TEXT]");
  Config.text = newtext;
  saveConfig();
  ctx.reply("Success");
});

bot.command("text", ctx => {ctx.reply(Config.text)});
bot.command("tags", ctx => {ctx.reply(Config.tags.join(" "))});
bot.command("report", ctx => {
  var s = '';
  s += "العمليات: " + (Config.Start? "تعمل": "متوقفة") + "\n";
  if (Config.Start) {
    // var d = new Date(Config.report.start);
    // var mins = d.getMinutes(); if (mins < 10) mins = "0" + mins;
    // var hours = d.getHours(); if (hours < 10) hours = "0" + hours;
    // var month = d.getMonth() + 1; if (month < 10) month = "0" + month;
    // var day = d.getDate(); if (day < 10) day = "0" + day;
    // s += "تاريخ البدأ: " + hours + ":" + mins + "  " + day + "/" + month + "\n";
    s+= "تم البدأ بتاريخ: " + Config.report.start + "\n";
  }
  s += "تم تنفيذ " + Config.report.len + " عملية" + "\n\n";
  if (Config.report.errors > 0) s+= "عدد الاخطاء: " + Config.report.errors + "\n";
  s += Config.report.posts.join("\n");
  ctx.reply(s);
});

bot.command("clear", ctx => {
  Config.report = {
    posts: [],
    len: 0,
    start:0,
    errors:0
  }
  saveConfig();
  ctx.reply("تمت العملية بنجاح");
});

bot.command("time", ctx => {
  ctx.reply(Config.time);
});

bot.command("times", ctx => {
  ctx.reply(Config.times);
});

bot.command("settime", ctx => {
  var text = ctx.update.message.text;
  var time = text.split(" ")[1];
  if (time && isFinite(time)) {
    Config.time = +time;
    saveConfig();
    ctx.reply("تم حفظ التغيرات بنجاح");
  }
  else {
    ctx.reply("الرجاء ادخال قيمة صالحة");
  }
});

bot.command("settimes", ctx => {
  var text = ctx.update.message.text;
  var times = text.split(" ")[1];
  if (times && isFinite(times)) {
    Config.times = times;
    saveConfig();
    ctx.reply("تم حفظ التغيرات بنجاح");
  }
});

bot.hears("/logout", async ctx => {
  if (Config.Start) {
    return ctx.reply("يجب ايقاف العمليات قبل هذا الاجراء");
  }
  logout();
  ctx.reply("تمت العملية بنجاح");
})

bot.launch();
//********************************************************************** */

function saveConfig() {
  fs.writeFileSync("./user/data.json", JSON.stringify(Config, null, 4));
}

function logout() {
  fs.writeFileSync("./user/cookies.json", "{}", "UTF-8");
   cookieStore = new FileCookieStore('./user/cookies.json');
  client = new Instagram({ cookieStore });
}

/* Skip Automatic Stop the Server */
/* Some free hosting stops the server  if it is not active during a short period like "reple.it" */
if (Config.url) {
  setInterval(() => {
request.get(Config.url, () => {console.log(Config.url)});
}, 1 * 1000 * 60);
}


module.exports = router;
