export const WALK_MS=12000,ROUND_MS=1500,EXIT_MS=3000,REST_MS=4500;
export function roomsOf(run){return run?.rooms?.length?run.rooms:[{index:0,kind:'boss',enemy:'guardian',start_hp:run?.max_hp_me,combat:run}];}
export function duration(room,last=false){return WALK_MS+(room.kind==='rest'?REST_MS:(room.combat?.turns?.length||0)*ROUND_MS)+(last?0:EXIT_MS);}
export function journey(run,elapsed=0,finished=false){
 const rooms=roomsOf(run);let time=Math.max(0,elapsed);
 if(run?.pending){const room=rooms[0];return {room,index:room.index,total:run.room_count,phase:time<WALK_MS?'travel':'choice',time:Math.min(time,WALK_MS),turn:0,beat:0,frame:{hp_me:room.start_hp,hp_enemy:0},done:false};}
 for(let i=0;i<rooms.length;i++){
  const room=rooms[i],length=duration(room,i===rooms.length-1);
  if(time<length||i===rooms.length-1){
   const phase=finished?'finished':time<WALK_MS?'travel':time<WALK_MS+(room.kind==='rest'?REST_MS:room.combat.turns.length*ROUND_MS)?room.kind==='rest'?'rest':'battle':'exit';
   const combat=room.combat,bt=Math.max(0,time-WALK_MS),turn=Math.min((combat?.turns.length||1)-1,Math.floor(bt/ROUND_MS));
   const frame=phase==='travel'?{hp_me:room.start_hp,hp_enemy:combat?.max_hp_enemy||0}:phase==='rest'?{hp_me:room.hp_me,hp_enemy:0}:finished||phase==='exit'?combat:combat?.turns[turn];
   return {room,index:room.index??i,total:run?.room_count||rooms.length,phase,time,turn,beat:bt%ROUND_MS/ROUND_MS,frame,done:finished||i===rooms.length-1&&time>=length};
  }time-=length;
 }
}
export function totalDuration(run){const rooms=roomsOf(run);return rooms.reduce((n,r,i)=>n+duration(r,i===rooms.length-1),0);}
