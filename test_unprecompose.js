const fs = require('fs'), vm = require('vm'), assert = require('assert');
let source = fs.readFileSync(require('path').join(__dirname,'Un_Precompose.jsx'),'utf8').replace(/^#target.*$/m,'');
source = source.replace('var ui = host instanceof Panel', 'host.test = {extract:extract, copyProperty:copyProperty}; return; var ui = host instanceof Panel');
const ctx = {PropertyType:{PROPERTY:1},PropertyValueType:{LAYER_INDEX:9}};
vm.createContext(ctx); vm.runInContext(source,ctx);
function prop(v) { return {value:v,numKeys:0,setValue(v){this.value=v;}}; }
function layer(name,comp) {
    const transform = {};
    ['ADBE Anchor Point','ADBE Position','ADBE Scale','ADBE Rotate Z'].forEach((n,i)=>transform[n]=prop(i===3?0:[50,50]));
    const l = {name,comp,locked:false,parent:null,startTime:0,inPoint:0,outPoint:5,enabled:true,hasAudio:true,audioEnabled:true,solo:false,guideLayer:false,motionBlur:false,numProperties:0,label:1,
        property(){return {property(n){return transform[n];}};},
        setParentWithJump(p){this.parent=p;},
        moveBefore(p){const a=this.comp.items;a.splice(a.indexOf(this),1);a.splice(a.indexOf(p),0,this);},
        remove(){const a=this.comp.items;a.splice(a.indexOf(this),1);},
        copyToComp(c){if(this.fail)throw Error('simulated copy failure');const cp=layer(this.name,c);['startTime','inPoint','outPoint','enabled','audioEnabled','solo','locked'].forEach(k=>cp[k]=this[k]);c.items.unshift(cp);},
        setTrackMatte(m,t){this.trackMatteLayer=m;this.trackMatteType=t;this.hasTrackMatte=true;},
        removeTrackMatte(){this.hasTrackMatte=false;}
    };
    Object.defineProperty(l,'index',{get(){return this.comp.items.indexOf(this)+1;}});
    return l;
}
function comp() {
    const c={items:[],duration:20,layer(i){return this.items[i-1];}};
    Object.defineProperty(c,'numLayers',{get(){return this.items.length;}});
    c.layers={addNull(){const l=layer('Null',c);c.items.unshift(l);return l;}};return c;
}
function fixture() {
    const c=comp(),s=comp();s.items=[layer('Top',s),layer('Bottom',s),layer('Outside',s)];
    s.items[1].parent=s.items[0];s.items[1].hasTrackMatte=true;s.items[1].trackMatteLayer=s.items[0];s.items[1].trackMatteType=7;
    s.items[2].inPoint=8;s.items[2].outPoint=10;
    const pre=layer('Pre',c);pre.source=s;pre.startTime=2;pre.inPoint=3;pre.outPoint=6;
    const external=layer('External child',c);external.parent=pre;external.locked=true;
    c.items=[pre,external];return {c,s,pre,external};
}
{
    const {c,s,pre,external}=fixture();const result=ctx.test.extract(pre,c);
    assert.equal(result,3);assert.deepEqual(c.items.map(l=>l.name),['Pre [UnPrecompose CTRL]','Top','Bottom','Outside','External child']);
    assert.equal(c.items[1].parent,c.items[0]);assert.equal(c.items[2].parent,c.items[1]);
    assert.equal(c.items[2].trackMatteLayer,c.items[1]);assert.equal(c.items[2].trackMatteType,7);
    assert.equal(c.items[1].startTime,2);assert.equal(c.items[1].inPoint,3);assert.equal(c.items[1].outPoint,6);
    assert.equal(c.items[3].enabled,false);assert.equal(c.items[3].audioEnabled,false);
    assert.equal(external.parent,c.items[0]);assert.equal(external.locked,true);
    assert.equal(s.items.length,3);assert.equal(s.items[0].startTime,0);
    console.log('PASS: stack, source preservation, time offset, trim, parenting, matte, disabled nonoverlap, external children');
}
{
    const {c,s,pre,external}=fixture();s.items[1].fail=true;
    assert.throws(()=>ctx.test.extract(pre,c),/simulated/);
    assert.deepEqual(c.items,[pre,external]);assert.equal(external.parent,pre);assert.equal(external.locked,true);
    console.log('PASS: failed-copy cleanup preserves original layers and parent links');
}
{
    const {c,s,pre}=fixture();s.items[0].solo=true;ctx.test.extract(pre,c);
    assert.equal(c.items[1].enabled,true);assert.equal(c.items[2].enabled,false);assert.equal(c.items[1].solo,false);
    console.log('PASS: internal solo is scoped to extracted group');
}
console.log('Mock tests do not validate the real Adobe host or rendered output.');


