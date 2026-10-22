(function(root){
 'use strict';
 function matches(line,date=new Date()){
  if(!line)return false;const day=date.getDay()||7,hour=date.getHours();
  if(line.days?.length&&!line.days.includes(day))return false;
  const h=line.hours;return !h||(h.start<h.end?hour>=h.start&&hour<h.end:hour>=h.start||hour<h.end);
 }
 function normalizeSchedule(value,policy){
  if(!value||!policy.dayTypes.some(d=>d.id===value.dayType)||!policy.periods.some(p=>p.id===value.period))throw new Error('無效的播放條件');
  return {dayType:value.dayType,period:value.period};
 }
 function scheduleMatches(value,policy,date){
  try{const s=normalizeSchedule(value,policy),day=date.getDay();return (s.dayType==='all'||(s.dayType==='holiday'?(day===0||day===6):(day!==0&&day!==6)))&&matches({hours:policy.periods.find(p=>p.id===s.period).hours},date);}catch{return false;}
 }
 function eligible(snapshot,event,date=new Date()){
  const lines=new Map([...(snapshot.catalog.legacyLines||[]),...snapshot.catalog.lines].map(line=>[line.id,line]));
  const candidates=(snapshot.clips[event]||[]).filter(c=>c.schedule?scheduleMatches(c.schedule,snapshot.policy,date):c.lineId==='generic'||(lines.get(c.lineId)?.event===event&&matches(lines.get(c.lineId),date)));
  const priority=c=>c.schedule?((c.schedule.dayType==='all'?0:10)+(c.schedule.period==='all'?0:10)):c.lineId==='generic'?0:lines.get(c.lineId).priority;
  const highest=Math.max(...candidates.map(priority));return candidates.filter(c=>priority(c)===highest);
 }
 const api={matches,eligible,normalizeSchedule,scheduleMatches};if(typeof module==='object'&&module.exports)module.exports=api;else root.AnzukiVoiceRules=api;
})(globalThis);
