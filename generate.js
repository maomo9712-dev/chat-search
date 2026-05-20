#!/usr/bin/env node
// Generate a searchable chat history HTML page from Claude Code session JSONL files.
// Usage: node generate.js <sessions-dir> [output-file]
//   sessions-dir: path to Claude projects directory
//   output-file:  output HTML path (default: ./chat.html in current dir)

const fs = require("fs");
const path = require("path");

const sessionsDir = process.argv[2];
if (!sessionsDir) {
  console.error("Usage: node generate.js <sessions-dir> [output-file]");
  console.error("  sessions-dir: path containing *.jsonl session files");
  process.exit(1);
}

const outputFile = process.argv[3] || path.join(process.cwd(), "chat.html");

function extractMessages(filePath) {
  const messages = [];
  if (!fs.existsSync(filePath)) return messages;

  const data = fs.readFileSync(filePath, "utf8");
  const lines = data.split("\n").filter(Boolean);
  let contentBuffer = "";
  let currentRole = "";
  let currentTs = "";

  for (const line of lines) {
    try {
      const d = JSON.parse(line);
      const role = d?.message?.role || "";
      if (role !== "user" && role !== "assistant") continue;

      const ts = d.timestamp || "";
      const content = d?.message?.content;
      let text = "";

      if (Array.isArray(content)) {
        for (const item of content) {
          if (item?.type === "text") text += item.text + "\n";
          if (item?.type === "tool_result") {
            const tc = item.content;
            if (Array.isArray(tc)) {
              for (const c of tc) {
                if (c?.type === "text") text += "[Tool]\n" + c.text + "\n";
              }
            }
          }
          if (item?.type === "tool_use") {
            text += "[Tool: " + (item.name || "unknown") + "]\n";
          }
        }
      } else if (typeof content === "string") {
        text = content;
      }

      if (!text.trim()) continue;

      if (role === currentRole) {
        contentBuffer += "\n" + text;
        if (ts) currentTs = ts;
      } else {
        if (currentRole && contentBuffer.trim()) {
          messages.push({ role: currentRole, text: contentBuffer.trim(), ts: currentTs });
        }
        currentRole = role;
        contentBuffer = text;
        currentTs = ts;
      }
    } catch { /* skip malformed lines */ }
  }

  if (currentRole && contentBuffer.trim()) {
    messages.push({ role: currentRole, text: contentBuffer.trim(), ts: currentTs });
  }
  return messages;
}

function main() {
  const files = fs.readdirSync(sessionsDir)
    .filter(f => f.endsWith(".jsonl"))
    .sort()
    .map(f => path.join(sessionsDir, f));

  let allMessages = [];
  for (const file of files) {
    allMessages = allMessages.concat(extractMessages(file));
  }

  const chatJson = JSON.stringify(allMessages.map((m, i) => ({
    i, r: m.role === "user" ? "u" : "a", t: m.text, d: m.ts
  })));

  const html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Chat Search</title>\n<style>\n' +
'  *{margin:0;padding:0;box-sizing:border-box}' +
'  body{font-family:-apple-system,"Noto Sans SC","PingFang SC",sans-serif;background:#faf9f7;color:#2c2c2c;font-size:15px}' +
'  .nav-bar{position:sticky;top:0;background:#faf9f7;padding:10px 20px;border-bottom:1px solid #e0ddd9;z-index:100;display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
'  .search-box{flex:1;min-width:160px;padding:6px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;background:#fff;outline:none}' +
'  .search-box:focus{border-color:#8b7e74}' +
'  .search-info{font-size:12px;color:#999}' +
'  .day-tabs{display:flex;gap:4px;padding:6px 20px;border-bottom:1px solid #eee;overflow-x:auto;background:#fcfcfa}' +
'  .day-tab{padding:2px 10px;border-radius:10px;font-size:12px;color:#999;cursor:pointer;white-space:nowrap;border:1px solid transparent;flex-shrink:0}' +
'  .day-tab:hover{border-color:#ddd;color:#666}' +
'  .day-tab.active{background:#8b7e74;color:#fff;border-color:#8b7e74}' +
'  .chat-container{max-width:720px;margin:0 auto;padding:12px 16px}' +
'  .msg{padding:8px 12px;margin:4px 0;border-radius:8px;max-width:87%}' +
'  .msg.user{background:#e8e3de;margin-right:auto;border-bottom-left-radius:4px}' +
'  .msg.assistant{background:#d4e0d8;margin-left:auto;border-bottom-right-radius:4px}' +
'  .msg .time{font-size:11px;color:#999;margin-bottom:2px}' +
'  .msg .text{white-space:pre-wrap;word-break:break-word}' +
'  .msg .text .hl{background:#f9e66b;padding:0 1px;border-radius:2px}' +
'  .day-divider{text-align:center;color:#bbb;font-size:12px;margin:16px 0 8px;position:relative}' +
'  .day-divider::before,.day-divider::after{content:"";position:absolute;top:50%;width:30%;height:1px;background:#eee}' +
'  .day-divider::before{left:0}' +
'  .day-divider::after{right:0}' +
'  .empty{text-align:center;color:#bbb;padding:40px;font-size:14px}' +
'  .load-more-wrap{text-align:center;padding:16px}' +
'  .load-more-btn{padding:6px 24px;border:1px solid #ddd;border-radius:16px;background:#fff;color:#666;font-size:13px;cursor:pointer}' +
'  .load-more-btn:hover{border-color:#8b7e74;color:#8b7e74}' +
'  .welcome{text-align:center;padding:60px 20px;color:#bbb}' +
'  .welcome p{margin:8px 0;font-size:14px}' +
'  .welcome .big{font-size:32px;margin-bottom:12px}' +
'  @media(prefers-color-scheme:dark){' +
'  body{background:#1a1a1a;color:#ddd}' +
'  .nav-bar{background:#1a1a1a;border-bottom-color:#333}' +
'  .search-box{background:#2a2a2a;border-color:#444;color:#ddd}' +
'  .search-box:focus{border-color:#a8988a}' +
'  .day-tabs{background:#222;border-bottom-color:#333}' +
'  .day-tab{color:#888}' +
'  .day-tab:hover{border-color:#555;color:#bbb}' +
'  .day-tab.active{background:#a8988a;color:#1a1a1a}' +
'  .msg.user{background:#333;color:#ddd}' +
'  .msg.assistant{background:#2a3a30;color:#ddd}' +
'  .day-divider{color:#555}' +
'  .day-divider::before,.day-divider::after{background:#333}' +
'  .load-more-btn{background:#2a2a2a;border-color:#444;color:#999}' +
'  .load-more-btn:hover{border-color:#a8988a;color:#a8988a}' +
'  }' +
'</style>\n</head>\n<body>\n' +
'<div class="nav-bar">' +
'  <input type="text" class="search-box" id="searchInput" placeholder="Search chat history..." autocomplete="off">' +
'  <span class="search-info" id="searchInfo"></span>' +
'</div>\n' +
'<div class="day-tabs" id="dayTabs"></div>\n' +
'<div class="chat-container" id="chatContainer">' +
'  <div id="welcome" class="welcome"><div class="big">&#x1F4AC;</div><p>Search keywords or select a date</p></div>' +
'</div>\n' +
'<div id="loadMoreWrap" class="load-more-wrap" style="display:none">' +
'  <button class="load-more-btn" id="loadMoreBtn">Load more</button>' +
'</div>\n' +
'<script>\n' +
'var chatData = ' + chatJson + ';\n' +
'var filtered = [];\n' +
'var renderIndex = 0;\n' +
'var currentQuery = "";\n' +
'var currentDay = "";\n' +
'var PAGE_SIZE = 30;\n' +
'\n' +
'function eHtml(t){var d=document.createElement("div");d.textContent=t;return d.innerHTML}\n' +
'function eRegExp(s){return s.replace(/[.*+?^\\x24{}()|[\\]\\\\]/g,"\\\\\\x24&")}\n' +
'function hText(t,q){if(!q)return eHtml(t);var r=new RegExp("("+eRegExp(eHtml(q))+")","gi");return eHtml(t).replace(r,\'<span class="hl">\\x241</span>\')}\n' +
'\n' +
'function buildDayTabs(){' +
'var days={};' +
'for(var i=0;i<chatData.length;i++){var m=chatData[i];if(m.d){var k=m.d.slice(0,10);days[k]=(days[k]||0)+1}}' +
'var s=Object.keys(days).sort();' +
'var c=document.getElementById("dayTabs");' +
'var a=document.createElement("span");a.className="day-tab";a.textContent="All ("+chatData.length+")";a.dataset.day="";c.appendChild(a);' +
'for(var j=s.length-1;j>=0;j--){var d=s[j];var t=document.createElement("span");t.className="day-tab";t.textContent=d+" ("+days[d]+")";t.dataset.day=d;c.appendChild(t)}' +
'c.addEventListener("click",function(e){var t=e.target.closest(".day-tab");if(!t)return;var ts=c.querySelectorAll(".day-tab");for(var i=0;i<ts.length;i++)ts[i].classList.remove("active");t.classList.add("active");currentDay=t.dataset.day;doSearch("")})' +
'}\n' +
'\n' +
'function doSearch(q){' +
'document.getElementById("welcome").style.display="none";' +
'currentQuery=q||document.getElementById("searchInput").value;' +
'filtered=[];' +
'for(var i=chatData.length-1;i>=0;i--){var m=chatData[i];if(currentDay&&(!m.d||m.d.indexOf(currentDay)!==0))continue;if(currentQuery&&m.t.toLowerCase().indexOf(currentQuery.toLowerCase())===-1)continue;filtered.push(m)}' +
'renderIndex=0;' +
'document.getElementById("chatContainer").innerHTML="";' +
'document.getElementById("loadMoreWrap").style.display=filtered.length>0?"":"none";' +
'renderMore();' +
'var info=document.getElementById("searchInfo");info.textContent=currentQuery?filtered.length+"/"+chatData.length:filtered.length>0?filtered.length+" msgs":""' +
'}\n' +
'\n' +
'function renderMore(){' +
'var c=document.getElementById("chatContainer");' +
'var end=Math.min(renderIndex+PAGE_SIZE,filtered.length);' +
'var h="",last="";' +
'for(var i=renderIndex;i<end;i++){var m=filtered[i];var dk=m.d?m.d.slice(0,10):"";if(dk&&dk!==last){h+=\'<div class="day-divider">\'+dk+\'</div>\';last=dk}' +
'var ts=m.d?m.d.slice(11,16):"";var cls=m.r==="u"?"user":"assistant";var lb=m.r==="u"?"You":"AI";' +
'h+=\'<div class="msg \'+cls+\'"><div class="time">\'+lb+(ts?" "+ts:"")+\'</div><div class="text">\'+hText(m.t,currentQuery)+\'</div></div>\'}' +
'c.insertAdjacentHTML("beforeend",h);' +
'renderIndex=end;' +
'var bw=document.getElementById("loadMoreWrap");' +
'if(renderIndex>=filtered.length){bw.style.display="none"}else{bw.style.display="";document.getElementById("loadMoreBtn").textContent="Load more ("+(filtered.length-renderIndex)+")"}' +
'}\n' +
'\n' +
'document.getElementById("loadMoreBtn").addEventListener("click",renderMore);' +
'document.getElementById("searchInput").addEventListener("input",function(){var q=this.value;var ts=document.querySelectorAll(".day-tab");for(var i=0;i<ts.length;i++)ts[i].classList.remove("active");currentDay="";setTimeout(function(){doSearch(q)},200)});' +
'buildDayTabs();' +
'</script>\n' +
'</body>\n</html>';

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, html, "utf8");
  console.log("Generated: " + outputFile + " (" + allMessages.length + " messages from " + files.length + " sessions)");
}

main();
