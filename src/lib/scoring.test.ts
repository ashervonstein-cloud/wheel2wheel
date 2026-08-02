import { calculatePoints, applyBoost, canBoostRace, BOOSTS_PER_SEASON } from './scoring';
let f=0; const ok=(c:boolean,l:string)=>{if(!c)f++;console.log(`${c?'PASS':'FAIL'}  ${l}`)};

const score=(correct:number,total:number,dbl:boolean,boosted:boolean)=>
  applyBoost(calculatePoints(correct,total,dbl),boosted,dbl);

ok(BOOSTS_PER_SEASON===2,'2 boosts per season');
ok(score(3,3,false,false)===6,'3/3 unboosted = 6');
ok(score(3,3,false,true)===12,'3/3 boosted = 12');
ok(score(2,3,false,true)===6,'2/3 boosted = 6 (was 3)');
ok(score(1,3,false,true)===2,'1/3 boosted = 2');
ok(score(0,3,false,true)===0,'0/3 boosted = 0 — a boost cannot invent points');
// stacking is blocked, so even if a row existed the multiplier must not compound
ok(score(4,4,true,true)===12,'4/4 on an admin 2x week stays 12, boost does not stack');
ok(score(4,4,true,false)===12,'4/4 admin 2x unchanged by the feature');
ok(score(2,3,false,false)===3,'unboosted scores are untouched');

ok(canBoostRace({status:'OPEN',isDoublePoints:false}).ok,'open normal race is boostable');
ok(!canBoostRace({status:'OPEN',isDoublePoints:true}).ok,'admin 2x week is blocked');
ok(!canBoostRace({status:'CLOSED',isDoublePoints:false}).ok,'closed race is blocked');
ok(!canBoostRace({status:'COMPLETED',isDoublePoints:false}).ok,'completed race is blocked');
ok(!canBoostRace({status:'UPCOMING',isDoublePoints:false}).ok,'upcoming race is blocked');
ok(!!canBoostRace({status:'CLOSED',isDoublePoints:false}).reason,'blocked cases carry a reason for the UI');

console.log(f?`\n${f} FAILURE(S)`:'\nAll scoring assertions passed.');
process.exit(f?1:0);
