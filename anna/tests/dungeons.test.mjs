import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DUNGEON_IDS} from '../bundle/dungeon.mjs';
import {THEMES} from '../bundle/dungeon-map.mjs';
import {BOSS_ART} from '../bundle/dungeon-enemies.mjs';
import {messages} from '../bundle/i18n.mjs';

test('every region has a theme, bilingual names and a boss that the renderer can draw',()=>{
 assert.deepEqual(DUNGEON_IDS,['hellgate','icekingdom','dreamforest','sunkenpalace','clockworkcity']);
 for(const id of DUNGEON_IDS){
  for(const key of ['floor','tile','wall','edge','glow','void'])assert.match(THEMES[id][key],/^#[0-9a-f]{6}$/,`${id}.${key}`);
  for(const prefix of ['dungeon_','boss_','dungeonScene_']){
   const pair=messages[prefix+id];assert.ok(Array.isArray(pair)&&pair.length===2&&pair.every(s=>s.trim()),prefix+id);
  }
 }
 for(const id of DUNGEON_IDS){
  const art=BOSS_ART[id];assert.ok(art.column===undefined?art.row>=0&&art.row<art.rows:art.column>=0&&art.column<art.columns,id);
  assert.ok([56,84].includes(art.cellHeight),id);
 }
});
