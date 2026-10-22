(function(root){
 'use strict';
 function matches(line,date=new Date()){
  if(!line)return false;const day=date.getDay()||7,hour=date.getHours();
  if(line.days.length&&!line.days.includes(day))return false;
  const h=line.hours;return !h||(h.start<h.end?hour>=h.start&&hour<h.end:hour>=h.start||hour<h.end);
 }
 function eligible(snapshot,event,date=new Date()){
  const lines=new Map(snapshot.catalog.lines.map(line=>[line.id,line]));
  const candidates=(snapshot.clips[event]||[]).filter(c=>c.lineId==='generic'||(lines.get(c.lineId)?.event===event&&matches(lines.get(c.lineId),date)));
  const priority=c=>c.lineId==='generic'?0:lines.get(c.lineId).priority;
  const highest=Math.max(...candidates.map(priority));return candidates.filter(c=>priority(c)===highest);
 }
 const api={matches,eligible};if(typeof module==='object'&&module.exports)module.exports=api;else root.AnzukiVoiceRules=api;
})(globalThis);
