const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const source = fs.readFileSync(require('path').join(__dirname, '../src/ExpoApp.js'), 'utf8');
const start = source.indexOf('  const translation = useRef(', source.indexOf('function MapViewport'));
const code = source.slice(start, source.indexOf('  return <GestureHandlerRootView', start));
const refs = []; const locks = []; let index = 0, effects = [], callbacks = {}, settings = {};
class ValueXY { constructor(value) {this.value=value;} setValue(value) {this.value=value;} }
const chain = {};
for (const name of ['enabled','minDistance','maxPointers','shouldCancelWhenOutside','runOnJS']) chain[name]=value=>{settings[name]=value;return chain;};
for (const name of ['onStart','onUpdate','onTouchesDown','onTouchesUp','onTouchesCancelled','onFinalize']) chain[name]=callback=>{callbacks[name]=callback;return chain;};
const context = { zoom: 2, mapSize: {width:400,height:500}, Animated:{ValueXY, Value:ValueXY}, Gesture:{Pan:()=>chain},
 useRef:value=>{const i=index++;return refs[i]||(refs[i]={current:value});}, useMemo:callback=>callback(), onInteractionChange:value=>locks.push(value), useEffect:callback=>effects.push(callback) };
function render(zoom){context.zoom=zoom;index=0;effects=[];vm.runInNewContext('{'+code+'}',context);effects.forEach(effect=>effect());}
render(2); assert.equal(settings.enabled,true);assert.equal(settings.maxPointers,1);
callbacks.onStart(); callbacks.onUpdate({translationX:50,translationY:70});
assert.equal(refs[0].current.value.x,50); assert.equal(refs[0].current.value.y,70);
callbacks.onStart(); callbacks.onUpdate({translationX:20,translationY:-10});
assert.equal(refs[0].current.value.x,70); assert.equal(refs[0].current.value.y,60);
callbacks.onUpdate({translationX:900,translationY:-900});
assert.equal(refs[0].current.value.x,200); assert.equal(refs[0].current.value.y,-250);
render(1);assert.equal(settings.enabled,false);assert.equal(Math.abs(refs[0].current.value.x),0);assert.equal(Math.abs(refs[0].current.value.y),0);
console.log('PASS: diagonal single-finger pan, consecutive drags, map bounds, and reset to 1x.');
// At every zoom level, every corner of the viewport stays covered by the map.
for (const zoom of [1, 1.5, 2, 2.5, 3]) {
 render(zoom);
 for (const [x,y] of [[10000,10000],[-10000,-10000],[10000,-10000],[-10000,10000]]) {
  callbacks.onStart();callbacks.onUpdate({translationX:x,translationY:y});
  const pan=refs[0].current.value;
  assert.ok(200+pan.x-200*zoom<=0); assert.ok(200+pan.x+200*zoom>=400);
  assert.ok(250+pan.y-250*zoom<=0); assert.ok(250+pan.y+250*zoom>=500);
 }
}
render(1.5);
assert.ok(Math.abs(refs[0].current.value.x)<=100);
assert.ok(Math.abs(refs[0].current.value.y)<=125);
console.log('PASS: all four map edges stay within bounds at every zoom, including after zooming out.');
// Zoom buttons must update the animated scale without any drag callback.
render(1); assert.equal(refs[4].current.value,1);
render(2); assert.equal(refs[4].current.value,2);
render(1.5); assert.equal(refs[4].current.value,1.5);
render(1); assert.equal(refs[4].current.value,1);
console.log('PASS: zoom in, zoom out, and reset update native scale without dragging.');
callbacks.onTouchesDown();assert.equal(locks.at(-1),true);
callbacks.onTouchesUp({numberOfTouches:1});assert.equal(locks.at(-1),true);
callbacks.onTouchesUp({numberOfTouches:0});assert.equal(locks.at(-1),false);
callbacks.onTouchesDown();callbacks.onTouchesCancelled();assert.equal(locks.at(-1),false);
callbacks.onTouchesDown();callbacks.onFinalize();assert.equal(locks.at(-1),false);
console.log('PASS: page scrolling locks on map touch and unlocks after release or cancellation.');

// Leaving Map invokes this callback during cleanup. Web scroll refs have no
// setNativeProps method, and must still release the declarative scrolling lock.
const interactionCallback = source.match(/const onMapInteractionChange = useCallback\(\(touching\) => \{([\s\S]*?)\n  \}, \[\]\);/)[1];
for (const scrollRef of [null, {}, { setNativeProps() {} }]) {
 const stateUpdates = [], nativeUpdates = [];
 const context = { pageScroll: { current: scrollRef }, setMapTouching: value => stateUpdates.push(value), nativeUpdates };
 // Bind the native mock here so it captures this iteration's updates.
 if (scrollRef?.setNativeProps) scrollRef.setNativeProps = props => nativeUpdates.push(props);
 const update = vm.runInNewContext('(touching) => {' + interactionCallback + '}', context);
 update(true); update(false);
 assert.deepEqual(stateUpdates, [true, false]);
 if (scrollRef?.setNativeProps) assert.deepEqual(nativeUpdates.map(props => props.scrollEnabled), [false, true]);
}
console.log('PASS: leaving Map safely unlocks scrolling with native, web, and detached refs.');
