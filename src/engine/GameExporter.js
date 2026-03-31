/**
 * NovaStar Game Exporter v0.4.1
 * Generates standalone, playable HTML builds from editor scenes.
 * 
 * Export modes:
 * - Web (single HTML file with embedded Three.js)
 * - Desktop (triggers electron-builder)
 */

import * as THREE from 'three';

export class GameExporter {
  constructor(engine) {
    this.engine = engine;
  }

  /**
   * Export the current scene as a standalone HTML game
   * @param {Array} entities - Editor entity array
   * @param {object} projectConfig - Project configuration
   * @returns {string} Complete HTML file content
   */
  exportToHTML(entities, projectConfig = {}) {
    const config = {
      name: projectConfig.name || 'NovaStar Game',
      width: projectConfig.resolution?.width || 1280,
      height: projectConfig.resolution?.height || 720,
      gravity: projectConfig.physics?.gravity || -25,
      skyTop: projectConfig.renderer?.skyColorTop || '#6ec6ff',
      skyBottom: projectConfig.renderer?.skyColorBottom || '#b8e8ff',
      ...projectConfig,
    };

    // Serialize entities to lightweight format
    const sceneData = entities.map(e => {
      const matConfig = e.mesh?.material?.userData?._novaConfig || 
        { type: 'toon', color: '#' + (e.mesh?.material?.color?.getHexString?.() || '66bb55') };
      
      return {
        name: e.name,
        type: e.type,
        position: { x: e.position.x, y: e.position.y, z: e.position.z },
        rotation: { x: e.rotation.x, y: e.rotation.y, z: e.rotation.z },
        scale: { x: e.scale.x, y: e.scale.y, z: e.scale.z },
        material: matConfig,
      };
    });

    return this._generateHTML(config, sceneData);
  }

  /**
   * Trigger the export — downloads the HTML file
   */
  async export(entities, projectConfig = {}) {
    const html = this.exportToHTML(entities, projectConfig);
    const blob = new Blob([html], { type: 'text/html' });

    if (typeof window !== 'undefined' && window.novastarDesktop) {
      // Desktop: use save dialog
      try {
        const result = await window.novastarDesktop.saveDialog(
          (projectConfig.name || 'game').replace(/\s+/g, '_') + '.html'
        );
        if (result && !result.canceled && result.filePath) {
          await window.novastarDesktop.writeFile(result.filePath, html);
          return { success: true, path: result.filePath };
        }
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // Browser fallback: download
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (projectConfig.name || 'game').replace(/\s+/g, '_') + '.html';
    a.click();
    URL.revokeObjectURL(a.href);
    return { success: true, browser: true };
  }

  // ─── HTML Generation ──────────────────────────────────
  _generateHTML(config, sceneData) {
    const entitiesJSON = JSON.stringify(sceneData);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>${this._esc(config.name)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{overflow:hidden;background:#000;font-family:sans-serif}
canvas{display:block;width:100vw;height:100vh}
#hud{position:fixed;top:16px;left:16px;z-index:10;display:flex;gap:12px}
.hud-box{background:rgba(0,0,0,.6);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px 16px;color:#fff;font-size:13px;font-weight:700}
.hud-box span{color:#4ee6a0}
#splash{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:100;color:#fff}
#splash h1{font-size:48px;margin-bottom:8px;background:linear-gradient(135deg,#4ee6a0,#4da8ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
#splash p{color:#888;margin-bottom:32px;font-size:14px}
#splash button{background:#4ee6a0;color:#0a0c10;border:none;padding:14px 40px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer}
#splash button:hover{background:#6bf0b6}
#splash.hidden{display:none}
#controls{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);color:#666;font-size:12px;z-index:10}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="hud"><div class="hud-box">Score: <span id="score">0</span></div><div class="hud-box">Stars: <span id="stars">0</span></div></div>
<div id="splash"><h1>${this._esc(config.name)}</h1><p>Built with NovaStar Engine</p><button id="playBtn">PLAY</button></div>
<div id="controls">WASD/Arrows to move &middot; Space to jump</div>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.162.0/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
// Sky gradient
const skyCanvas = document.createElement('canvas');
skyCanvas.width=2;skyCanvas.height=512;
const skyCtx=skyCanvas.getContext('2d');
const grad=skyCtx.createLinearGradient(0,0,0,512);
grad.addColorStop(0,'${config.skyTop}');grad.addColorStop(1,'${config.skyBottom}');
skyCtx.fillStyle=grad;skyCtx.fillRect(0,0,2,512);
scene.background=new THREE.CanvasTexture(skyCanvas);

const camera = new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,0.1,1000);
camera.position.set(0,8,12);

// Lighting
scene.add(new THREE.HemisphereLight(0x88bbff,0x445522,0.6));
const sun=new THREE.DirectionalLight(0xfff4e0,1.0);
sun.position.set(5,10,7);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.near=0.5;sun.shadow.camera.far=50;
sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;
scene.add(sun);
scene.add(new THREE.AmbientLight(0x404050,0.2));

// Material helpers
function createGradTex(steps){const c=document.createElement('canvas');c.width=Math.max(steps,2);c.height=1;const x=c.getContext('2d');for(let i=0;i<steps;i++){const t=i/(steps-1);const v=Math.round(t*255);x.fillStyle='rgb('+v+','+v+','+v+')';x.fillRect(i,0,1,1);}const tex=new THREE.CanvasTexture(c);tex.minFilter=THREE.NearestFilter;tex.magFilter=THREE.NearestFilter;return tex;}
function makeMat(cfg){if(!cfg)return new THREE.MeshToonMaterial({color:'#66bb55',gradientMap:createGradTex(3)});
if(cfg.type==='pbr')return new THREE.MeshStandardMaterial({color:cfg.color||'#fff',metalness:cfg.metalness||0,roughness:cfg.roughness||0.5,flatShading:cfg.flatShading||false});
if(cfg.type==='unlit')return new THREE.MeshBasicMaterial({color:cfg.color||'#fff',wireframe:cfg.wireframe||false});
return new THREE.MeshToonMaterial({color:cfg.color||'#66bb55',gradientMap:createGradTex(cfg.steps||3)});}

// Build scene from data
const entities=${entitiesJSON};
const runtimeEnts=[];

function buildMesh(e){let mesh;const mat=makeMat(e.material);
switch(e.type){
case'platform':{const g=new THREE.Group();const box=new THREE.Mesh(new THREE.BoxGeometry(4,.5,4),mat);box.castShadow=true;box.receiveShadow=true;g.add(box);mesh=g;break;}
case'character':{const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(.4,.36,.72,8),mat);body.position.y=.36;body.castShadow=true;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.34,8,6),mat);head.position.y=.84;head.castShadow=true;g.add(head);const eyeMat=new THREE.MeshBasicMaterial({color:'#fff'});[-1,1].forEach(s=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.08,6,4),eyeMat);eye.position.set(s*.14,.88,.27);g.add(eye);const pupil=new THREE.Mesh(new THREE.SphereGeometry(.05,6,4),new THREE.MeshBasicMaterial({color:'#222'}));pupil.position.set(s*.14,.88,.31);g.add(pupil);});mesh=g;break;}
case'star':{const geo=new THREE.OctahedronGeometry(.3,0);geo.scale(1,1.5,1);mesh=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color:e.material?.color||'#ffdd44',emissive:new THREE.Color(e.material?.color||'#ffdd44').multiplyScalar(.3),gradientMap:createGradTex(3)}));mesh.castShadow=true;break;}
case'enemy':{const g=new THREE.Group();const bd=new THREE.Mesh(new THREE.SphereGeometry(.6,8,6),new THREE.MeshToonMaterial({color:e.material?.color||'#dd4444',gradientMap:createGradTex(3)}));bd.scale.set(1,.7,1);bd.position.y=.42;bd.castShadow=true;g.add(bd);mesh=g;break;}
case'tree':{const g=new THREE.Group();g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(.15,.25,1.5,6),new THREE.MeshToonMaterial({color:'#886644',gradientMap:createGradTex(3)})),{position:new THREE.Vector3(0,.75,0)}));for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(1.5*(1-i*.2),1.05,6),new THREE.MeshToonMaterial({color:'#44aa33',gradientMap:createGradTex(3)}));c.position.y=1.35+i*.6;c.castShadow=true;g.add(c);}mesh=g;break;}
default:mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mat);}
mesh.position.set(e.position.x,e.position.y,e.position.z);
mesh.rotation.set(e.rotation.x,e.rotation.y,e.rotation.z);
mesh.scale.set(e.scale.x,e.scale.y,e.scale.z);
scene.add(mesh);
return{mesh,type:e.type,name:e.name,vel:new THREE.Vector3(),grounded:false,patrolDir:1,patrolOrigin:new THREE.Vector3(e.position.x,e.position.y,e.position.z),patrolRange:3+Math.random()*2,bobPhase:Math.random()*6.28,collected:false,dead:false};}

entities.forEach(e=>runtimeEnts.push(buildMesh(e)));

const player=runtimeEnts.find(e=>e.type==='character');
let score=0,starCount=0;

// Input
const keys={};
window.addEventListener('keydown',e=>{keys[e.code]=true;});
window.addEventListener('keyup',e=>{keys[e.code]=false;});

function getGround(x,z){let y=0;runtimeEnts.forEach(e=>{if(e.type!=='platform')return;const p=e.mesh.position,s=e.mesh.scale;const hw=s.x*2,hd=s.z*2;if(x>=p.x-hw&&x<=p.x+hw&&z>=p.z-hd&&z<=p.z+hd){const top=p.y+s.y*.25+.25;if(top>y)y=top;}});return y;}

// Game loop
const clock=new THREE.Clock();
let started=false;

function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.1);
if(!started)return;
runtimeEnts.forEach(e=>{if(e.dead||e.collected)return;const p=e.mesh.position;
if(e.type==='character'&&player===e){let mx=0,mz=0;
if(keys.KeyW||keys.ArrowUp)mz=-1;if(keys.KeyS||keys.ArrowDown)mz=1;
if(keys.KeyA||keys.ArrowLeft)mx=-1;if(keys.KeyD||keys.ArrowRight)mx=1;
if(mx||mz){const d=new THREE.Vector3(mx,0,mz).normalize();p.x+=d.x*6*dt;p.z+=d.z*6*dt;e.mesh.rotation.y=Math.atan2(d.x,d.z);}
if(keys.Space&&e.grounded){e.vel.y=10;e.grounded=false;}
e.vel.y+=${config.gravity}*dt;p.y+=e.vel.y*dt;
const gy=getGround(p.x,p.z);if(p.y<=gy){p.y=gy;e.vel.y=0;e.grounded=true;}
// Pickups
runtimeEnts.forEach(o=>{if(o.type==='star'&&!o.collected&&p.distanceTo(o.mesh.position)<1.2){o.collected=true;o.mesh.visible=false;score+=100;starCount++;document.getElementById('score').textContent=score;document.getElementById('stars').textContent=starCount;}});
// Enemy hit
runtimeEnts.forEach(o=>{if(o.type==='enemy'&&!o.dead&&p.distanceTo(o.mesh.position)<1){if(e.vel.y<-1&&p.y>o.mesh.position.y+.3){o.dead=true;o.mesh.visible=false;score+=200;document.getElementById('score').textContent=score;e.vel.y=6;}else{const kb=new THREE.Vector3().subVectors(p,o.mesh.position).normalize();p.add(kb.multiplyScalar(.5));e.vel.y=4;}}});
camera.position.lerp(new THREE.Vector3(p.x,p.y+8,p.z+12),5*dt);camera.lookAt(p.x,p.y+1,p.z);}
if(e.type==='enemy'&&!e.dead){p.x+=e.patrolDir*2*dt;if(Math.abs(p.x-e.patrolOrigin.x)>e.patrolRange)e.patrolDir*=-1;e.bobPhase+=dt*3;p.y=e.patrolOrigin.y+Math.sin(e.bobPhase)*.15;}
if(e.type==='star'&&!e.collected){e.mesh.rotation.y+=dt*2;e.bobPhase+=dt*2.5;p.y=e.patrolOrigin.y+Math.sin(e.bobPhase)*.2;}
});renderer.render(scene,camera);}

clock.start();loop();

document.getElementById('playBtn').addEventListener('click',()=>{started=true;document.getElementById('splash').classList.add('hidden');});
window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
<\/script>
</body>
</html>`;
  }

  _esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
