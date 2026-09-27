const assert=require("node:assert/strict");
const {normalizeEvents,scoreCutCandidate,buildCutPlan}=require("../src/events.js");
const {buildTimelineCutPlan,buildSegments}=require("../src/cut-plan.js");

function test(name,fn){try{fn();console.log("✓",name)}catch(error){console.error("✗",name);throw error}}

test("normalization keeps the strongest event in a spacing collision",()=>{
  const events=normalizeEvents([
    {time:.2,confidence:.8,type:"onset"},
    {time:.25,confidence:.9,type:"beat"},
    {time:.8,confidence:.7,type:"onset"}
  ]);
  assert.equal(events.length,2);
  assert.equal(events[0].type,"beat");
});

test("equal-confidence collision prefers downbeat over beat",()=>{
  const events=normalizeEvents([
    {time:1,confidence:.8,type:"beat"},
    {time:1.05,confidence:.8,type:"downbeat"}
  ]);
  assert.equal(events[0].type,"downbeat");
});

test("nearby onset increases a candidate score",()=>{
  const base={time:2,type:"beat",confidence:.8,strength:3,source:"native-dsp"};
  const plain=scoreCutCandidate(base);
  const reinforced=scoreCutCandidate(base,{hasNearbyOnset:true});
  assert.ok(reinforced>plain);
});

test("minimum shot length prevents dense cut clusters",()=>{
  const plan=buildCutPlan([
    {time:1,type:"beat",confidence:1,strength:4,source:"native-dsp"},
    {time:1.2,type:"beat",confidence:1,strength:4,source:"native-dsp"},
    {time:1.8,type:"beat",confidence:1,strength:4,source:"native-dsp"}
  ],{threshold:.5,minShotLength:.35});
  assert.equal(plan.length,2);
  assert.equal(plan[0].time,1);
  assert.equal(plan[1].time,1.8);
});

test("timeline mapping preserves source and sequence times",()=>{
  const mapping={sequenceStartSeconds:10,sourceInSeconds:2,speed:1.25};
  const plan=buildTimelineCutPlan([{time:4,type:"beat",confidence:1,strength:4,source:"native-dsp"}],mapping,{threshold:.5});
  assert.equal(plan.length,1);
  assert.equal(plan[0].sequenceTime,11.6);
  assert.equal(plan[0].sourceTime,4);
});

test("segment builder creates deterministic boundaries",()=>{
  const segments=buildSegments([{sequenceTime:2},{sequenceTime:5}],0,8);
  assert.deepEqual(segments.map(s=>[s.start,s.end]),[[0,2],[2,5],[5,8]]);
  assert.equal(segments[1].cutAtStart,true);
  assert.equal(segments[1].cutAtEnd,true);
});

console.log("BeatCheat Pro JS regression suite passed.");
