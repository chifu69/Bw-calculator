const $ = id => document.getElementById(id);
const HISTORY_KEY = "bw-tools-history-v2";
let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
let debounceTimer;

function setMode(mode){
  const bw = mode === "bw";
  $("tab-bw").classList.toggle("active", bw);
  $("tab-ft").classList.toggle("active", !bw);
  $("panel-bw").hidden = !bw;
  $("panel-ft").hidden = bw;
  localStorage.setItem("bw-tools-mode", mode);
}

function setChoice(group, value){
  document.querySelectorAll(`[data-group="${group}"]`).forEach(b=>{
    b.classList.toggle("active", b.dataset.value === String(value));
  });
  $(group).value = value;
  localStorage.setItem(group, value);
  scheduleCalculation();
}

function numberValue(id){
  const n = Number($(id).value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function scheduleCalculation(){
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(()=>{
    calculateBW();
    calculateFT();
  }, 180);
}

function addHistory(entry){
  const signature = JSON.stringify(entry);
  if (history[0] && JSON.stringify(history[0]) === signature) return;
  history.unshift(entry);
  history = history.slice(0,10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function calculateBW(){
  const mandrel = numberValue("bw-mandrel");
  const weight = numberValue("bw-weight");
  const length = numberValue("bw-length");
  $("bw-error").textContent = "";
  if(!weight || !length || !mandrel){
    $("bw-value").textContent = "—";
    return;
  }
  const result = (weight * 453.59237) / ((length * 12 * mandrel) / 100);
  const formatted = result.toFixed(3);
  $("bw-value").textContent = formatted;
  addHistory({type:"BW", mandrel, weight, length, result:formatted});
}

function calculateFT(){
  const mandrel = numberValue("ft-mandrel");
  const bw = numberValue("ft-bw");
  const weight = numberValue("ft-weight");
  $("ft-error").textContent = "";
  if(!bw || !weight || !mandrel){
    $("ft-value").textContent = "—";
    return;
  }
  const result = (weight * 453.59237 * 100) / (bw * 12 * mandrel);
  const formatted = `${result.toFixed(2)} ft`;
  $("ft-value").textContent = formatted;
  addHistory({type:"FT", mandrel, bw, weight, result:formatted});
}

function renderHistory(){
  const list = $("history-list");
  if(!history.length){
    list.innerHTML = '<div class="empty-state">No calculations yet.</div>';
    return;
  }
  list.innerHTML = history.map(item=>{
    const details = item.type === "BW"
      ? `${item.mandrel}" mandrel • ${item.weight} lb • ${item.length} ft`
      : `${item.mandrel}" mandrel • BW ${item.bw} • ${item.weight} lb`;
    return `<div class="history-item">
      <div><div class="history-main">Calculate ${item.type}</div><div class="history-meta">${details}</div></div>
      <div class="history-result">${item.result}</div>
    </div>`;
  }).join("");
}

async function copyText(text){
  if(!text || text === "—") return;
  try{ await navigator.clipboard.writeText(text); }
  catch{
    const t=document.createElement("textarea"); t.value=text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
  }
  showToast("Copied");
}

async function shareResult(type){
  const text = type === "bw"
    ? `Basis Weight: ${$("bw-value").textContent}`
    : `Roll Length: ${$("ft-value").textContent}`;
  if(text.endsWith("—")) return;
  if(navigator.share){
    try{ await navigator.share({title:"BW Tools", text}); }catch{}
  }else{
    await copyText(text);
  }
}

function showToast(text){
  const toast=$("toast"); toast.textContent=text; toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"),1300);
}

function applyTheme(theme){
  document.documentElement.classList.toggle("light", theme === "light");
  $("theme-toggle").textContent = theme === "light" ? "☀" : "☾";
  localStorage.setItem("bw-tools-theme", theme);
}

$("tab-bw").onclick=()=>setMode("bw");
$("tab-ft").onclick=()=>setMode("ft");
document.querySelectorAll(".choice").forEach(b=>b.onclick=()=>setChoice(b.dataset.group,b.dataset.value));
["bw-weight","bw-length","ft-bw","ft-weight"].forEach(id=>$(id).addEventListener("input",scheduleCalculation));
document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>copyText($(b.dataset.copy).textContent));
document.querySelectorAll("[data-share]").forEach(b=>b.onclick=()=>shareResult(b.dataset.share));
$("clear-history").onclick=()=>{history=[];localStorage.removeItem(HISTORY_KEY);renderHistory();};
$("theme-toggle").onclick=()=>{
  const isLight=document.documentElement.classList.contains("light");
  applyTheme(isLight ? "dark" : "light");
};

setChoice("bw-mandrel", localStorage.getItem("bw-mandrel") || "51");
setChoice("ft-mandrel", localStorage.getItem("ft-mandrel") || "51");
setMode(localStorage.getItem("bw-tools-mode") || "bw");
applyTheme(localStorage.getItem("bw-tools-theme") || "dark");
renderHistory();

if("serviceWorker" in navigator){
  addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
