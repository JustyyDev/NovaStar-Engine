/**
 * NovaStar Game Exporter v0.5.0
 * Exports games as:
 * - Standalone HTML (runs in browser)
 * - Windows .exe (via Electron packaging)
 * - Linux AppImage (via Electron packaging)
 */

import * as THREE from 'three';

export class GameExporter {
  constructor(engine) {
    this.engine = engine;
  }

  /**
   * Export as standalone HTML (web)
   */
  async exportWeb(entities, projectConfig = {}) {
    const html = this.generateHTML(entities, projectConfig);
    const name = projectConfig.name || 'NovaStar Game';

    if (window.novastarDesktop?.exportGameWeb) {
      return await window.novastarDesktop.exportGameWeb(html, name);
    }

    // Browser fallback
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name.replace(/\s+/g, '_') + '.html';
    a.click();
    URL.revokeObjectURL(a.href);
    return { success: true, browser: true };
  }

  /**
   * Export as .exe / desktop app
   * Creates a project folder with build scripts the user can run
   */
  async exportDesktop(entities, projectConfig = {}) {
    const html = this.generateHTML(entities, projectConfig);
    const name = projectConfig.name || 'NovaStar Game';

    if (window.novastarDesktop?.exportGameExe) {
      return await window.novastarDesktop.exportGameExe(html, name);
    }

    // Fallback: just download HTML
    return this.exportWeb(entities, projectConfig);
  }

  /**
   * Convenience: export with format selection
   */
  async export(entities, projectConfig = {}, format = 'web') {
    if (format === 'exe' || format === 'desktop') {
      return this.exportDesktop(entities, projectConfig);
    }
    return this.exportWeb(entities, projectConfig);
  }

  /**
   * Generate the standalone HTML game
   */
  generateHTML(entities, projectConfig = {}) {
    const config = {
      name: projectConfig.name || 'NovaStar Game',
      gravity: projectConfig.physics?.gravity || -25,
      skyTop: projectConfig.renderer?.skyColorTop || '#6ec6ff',
      skyBottom: projectConfig.renderer?.skyColorBottom || '#b8e8ff',
    };

    const sceneData = entities.map(e => {
      const matConfig = e.mesh?.material?.userData?._novaConfig ||
        { type: 'toon', color: '#' + (e.mesh?.material?.color?.getHexString?.() || '66bb55') };
      return {
        name: e.name, type: e.type,
        position: { x: e.position.x, y: e.position.y, z: e.position.z },
        rotation: { x: e.rotation.x, y: e.rotation.y, z: e.rotation.z },
        scale: { x: e.scale.x, y: e.scale.y, z: e.scale.z },
        material: matConfig,
      };
    });

    return this._buildHTML(config, sceneData);
  }

  _buildHTML(config, sceneData) {
    const entJSON = JSON.stringify(sceneData);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no">
<title>${this._esc(config.name)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{overflow:hidden;background:#000;font-family:sans-serif}canvas{display:block;width:100vw;height:100vh}#hud{position:fixed;top:16px;left:16px;z-index:10;display:flex;gap:12px}.hud-box{background:rgba(0,0,0,.6);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px 16px;color:#fff;font-size:13px;font-weight:700}.hud-box span{color:#4ee6a0}#splash{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:100;color:#fff}#splash h1{font-size:48px;margin-bottom:8px;background:linear-gradient(135deg,#4ee6a0,#4da8ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}#splash p{color:#888;margin-bottom:32px;font-size:14px}#splash button{background:#4ee6a0;color:#0a0c10;border:none;padding:14px 40px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer}#splash button:hover{background:#6bf0b6}#splash.hidden{display:none}#controls{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);color:#666;font-size:12px;z-index:10}</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="hud"><div class="hud-box">Score: <span id="score">0</span></div><div class="hud-box">Stars: <span id="stars">0</span></div></div>
<div id="splash"><h1>${this._esc(config.name)}</h1><p>Built with NovaStar Engine</p><button id="playBtn">PLAY</button></div>
<div id="controls">WASD/Arrows to move &middot; Space to jump</div>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.162.0/build/three.module.js"}}<\/script>
<script type="module">
import*as THREE from'three';const canvas=document.getElementById('c');const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(window.innerWidth,window.innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;const scene=new THREE.Scene();const skyC=document.createElement('canvas');skyC.width=2;skyC.height=512;const skyX=skyC.getContext('2d');const gr=skyX.createLinearGradient(0,0,0,512);gr.addColorStop(0,'${config.skyTop}');gr.addColorStop(1,'${config.skyBottom}');skyX.fillStyle=gr;skyX.fillRect(0,0,2,512);scene.background=new THREE.CanvasTexture(skyC);const camera=new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,0.1,1000);camera.position.set(0,8,12);scene.add(new THREE.HemisphereLight(0x88bbff,0x445522,0.6));const sun=new THREE.DirectionalLight(0xfff4e0,1.0);sun.position.set(5,10,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.near=0.5;sun.shadow.camera.far=50;sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;scene.add(sun);scene.add(new THREE.AmbientLight(0x404050,0.2));
function gTex(s){const c=document.createElement('canvas');c.width=Math.max(s,2);c.height=1;const x=c.getContext('2d');for(let i=0;i<s;i++){const v=Math.round(i/(s-1)*255);x.fillStyle='rgb('+v+','+v+','+v+')';x.fillRect(i,0,1,1);}const t=new THREE.CanvasTexture(c);t.minFilter=THREE.NearestFilter;t.magFilter=THREE.NearestFilter;return t;}
function mMat(c){if(!c)return new THREE.MeshToonMaterial({color:'#66bb55',gradientMap:gTex(3)});if(c.type==='pbr')return new THREE.MeshStandardMaterial({color:c.color||'#fff',metalness:c.metalness||0,roughness:c.roughness||0.5});if(c.type==='unlit')return new THREE.MeshBasicMaterial({color:c.color||'#fff',wireframe:c.wireframe||false});return new THREE.MeshToonMaterial({color:c.color||'#66bb55',gradientMap:gTex(c.steps||3)});}
const ents=${entJSON};const rt=[];
function bM(e){let m;const mt=mMat(e.material);switch(e.type){case'platform':{const g=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(4,.5,4),mt);b.castShadow=true;b.receiveShadow=true;g.add(b);m=g;break;}case'character':{const g=new THREE.Group();g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(.4,.36,.72,8),mt),{castShadow:true}));g.children[0].position.y=.36;const h=new THREE.Mesh(new THREE.SphereGeometry(.34,8,6),mt);h.position.y=.84;h.castShadow=true;g.add(h);const eM=new THREE.MeshBasicMaterial({color:'#fff'});[-1,1].forEach(s=>{g.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(.08,6,4),eM),{position:new THREE.Vector3(s*.14,.88,.27)}));g.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(.05,6,4),new THREE.MeshBasicMaterial({color:'#222'})),{position:new THREE.Vector3(s*.14,.88,.31)}));});m=g;break;}case'star':{const geo=new THREE.OctahedronGeometry(.3,0);geo.scale(1,1.5,1);m=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color:e.material?.color||'#ffdd44',emissive:new THREE.Color(e.material?.color||'#ffdd44').multiplyScalar(.3),gradientMap:gTex(3)}));m.castShadow=true;break;}case'enemy':{const g=new THREE.Group();const bd=new THREE.Mesh(new THREE.SphereGeometry(.6,8,6),new THREE.MeshToonMaterial({color:e.material?.color||'#dd4444',gradientMap:gTex(3)}));bd.scale.set(1,.7,1);bd.position.y=.42;bd.castShadow=true;g.add(bd);m=g;break;}case'tree':{const g=new THREE.Group();g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(.15,.25,1.5,6),new THREE.MeshToonMaterial({color:'#886644',gradientMap:gTex(3)})),{position:new THREE.Vector3(0,.75,0)}));for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(1.5*(1-i*.2),1.05,6),new THREE.MeshToonMaterial({color:'#44aa33',gradientMap:gTex(3)}));c.position.y=1.35+i*.6;c.castShadow=true;g.add(c);}m=g;break;}default:m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mt);}m.position.set(e.position.x,e.position.y,e.position.z);m.rotation.set(e.rotation.x,e.rotation.y,e.rotation.z);m.scale.set(e.scale.x,e.scale.y,e.scale.z);scene.add(m);return{mesh:m,type:e.type,name:e.name,vel:new THREE.Vector3(),grounded:false,patrolDir:1,po:new THREE.Vector3(e.position.x,e.position.y,e.position.z),pr:3+Math.random()*2,bp:Math.random()*6.28,col:false,dead:false};}
ents.forEach(e=>rt.push(bM(e)));const pl=rt.find(e=>e.type==='character');let score=0,stars=0;const keys={};window.addEventListener('keydown',e=>{keys[e.code]=true;});window.addEventListener('keyup',e=>{keys[e.code]=false;});
function gY(x,z){let y=0;rt.forEach(e=>{if(e.type!=='platform')return;const p=e.mesh.position,s=e.mesh.scale;const hw=s.x*2,hd=s.z*2;if(x>=p.x-hw&&x<=p.x+hw&&z>=p.z-hd&&z<=p.z+hd){const t=p.y+s.y*.25+.25;if(t>y)y=t;}});return y;}
const clock=new THREE.Clock();let started=false;
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.1);if(!started)return;rt.forEach(e=>{if(e.dead||e.col)return;const p=e.mesh.position;if(e.type==='character'&&pl===e){let mx=0,mz=0;if(keys.KeyW||keys.ArrowUp)mz=-1;if(keys.KeyS||keys.ArrowDown)mz=1;if(keys.KeyA||keys.ArrowLeft)mx=-1;if(keys.KeyD||keys.ArrowRight)mx=1;if(mx||mz){const d=new THREE.Vector3(mx,0,mz).normalize();p.x+=d.x*6*dt;p.z+=d.z*6*dt;e.mesh.rotation.y=Math.atan2(d.x,d.z);}if(keys.Space&&e.grounded){e.vel.y=10;e.grounded=false;}e.vel.y+=${config.gravity}*dt;p.y+=e.vel.y*dt;const gy=gY(p.x,p.z);if(p.y<=gy){p.y=gy;e.vel.y=0;e.grounded=true;}rt.forEach(o=>{if(o.type==='star'&&!o.col&&p.distanceTo(o.mesh.position)<1.2){o.col=true;o.mesh.visible=false;score+=100;stars++;document.getElementById('score').textContent=score;document.getElementById('stars').textContent=stars;}});rt.forEach(o=>{if(o.type==='enemy'&&!o.dead&&p.distanceTo(o.mesh.position)<1){if(e.vel.y<-1&&p.y>o.mesh.position.y+.3){o.dead=true;o.mesh.visible=false;score+=200;document.getElementById('score').textContent=score;e.vel.y=6;}else{const kb=new THREE.Vector3().subVectors(p,o.mesh.position).normalize();p.add(kb.multiplyScalar(.5));e.vel.y=4;}}});camera.position.lerp(new THREE.Vector3(p.x,p.y+8,p.z+12),5*dt);camera.lookAt(p.x,p.y+1,p.z);}if(e.type==='enemy'&&!e.dead){p.x+=e.patrolDir*2*dt;if(Math.abs(p.x-e.po.x)>e.pr)e.patrolDir*=-1;e.bp+=dt*3;p.y=e.po.y+Math.sin(e.bp)*.15;}if(e.type==='star'&&!e.col){e.mesh.rotation.y+=dt*2;e.bp+=dt*2.5;p.y=e.po.y+Math.sin(e.bp)*.2;}});renderer.render(scene,camera);}
clock.start();loop();document.getElementById('playBtn').addEventListener('click',()=>{started=true;document.getElementById('splash').classList.add('hidden');});window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
<\/script>
</body>
</html>`;
  }

  _esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
}
