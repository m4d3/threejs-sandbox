c = {};
c.CAM_FOV  = 45;
c.CAM_NEAR = 1;
c.CAM_FAR  = 200;
c.FOG_NEAR = 10;
c.FOG_FAR  = 200;

g = {};
g.width, g.height;
g.container, g.renderer, g.scene, g.camera, g.controls
g.composer, g.postprocess;

function init() {
  // container
  g.container = document.getElementById("container");
  g.width  = window.innerWidth;
  g.height = window.innerHeight;

  // renderer
  g.renderer = new THREE.WebGLRenderer({ 
    clearAlpha: 1, 
    clearColor: 0x000000,
    antialias: true
  });
  g.renderer.setSize( g.width, g.height );
  g.renderer.autoClear = false;  
  g.container.appendChild( g.renderer.domElement );

  // camera
  g.camera = new THREE.PerspectiveCamera(
    c.CAM_FOV, 
    g.width/g.height,
    c.CAM_NEAR,
    c.CAM_FAR
  );
  g.camera.position.set(0, 5, 10);
  g.camera.lookAt(new THREE.Vector3());

  // scene
  g.scene = new THREE.Scene();
  g.scene.add(g.camera);

  // trackball controls
  g.controls = new THREE.TrackballControls(g.camera, g.container);
  g.controls.rotateSpeed = 1.0;
  g.controls.zoomSpeed = 1.2;
  g.controls.panSpeed = 1.0;    
  g.controls.dynamicDampingFactor = 0.3;
  g.controls.staticMoving = false;
  g.controls.noZoom = false;
  g.controls.noPan = false;

  initScene();

  // postprocessing 
  g.postprocess = {};
  g.postprocess.enabled = true;
  g.postprocess.depthMaterial = new THREE.MeshDepthMaterial();
  initPostprocessing();

  // insert stats
  g.stats = new Stats();
  g.stats.domElement.style.position = 'absolute';
  g.stats.domElement.style.top = '0px';
  g.stats.domElement.style.zIndex = 100;
  g.container.appendChild( g.stats.domElement );

  window.addEventListener( 'resize', onWindowResize, false );
}

function update() {
  animate();
  g.stats.update();
  g.controls.update();

  // render
  g.renderer.clear();
  
  if (g.postprocess.enabled) {
    g.scene.overrideMaterial = g.postprocess.depthMaterial;
    g.renderer.render( g.scene, g.camera, g.postprocess.rtDepth, true );

    g.composer.render(0.1);
  }
  else {
    g.renderer.render( g.scene, g.camera );
  }

  requestAnimationFrame(update);
};

function onWindowResize(event) {
  g.width  = window.innerWidth;
  g.height = window.innerHeight;

  g.renderer.setSize( g.width, g.height );

  g.camera.aspect = g.width / g.height;
  g.camera.updateProjectionMatrix();

  g.controls.screen.width = g.width;
  g.controls.screen.height = g.height;
  g.controls.radius = ( g.width + g.height ) / 4;

  if (g.postprocess.enabled) {
    g.composer.reset( new THREE.WebGLRenderTarget( g.width, g.height ) );
    g.postprocess.hDOF.uniforms[ "h" ].value = 1.0/g.width;
    g.postprocess.vDOF.uniforms[ "v" ].value = 1.0/g.height;
  }
};

function animate() {
  // DEBUGTEST
  for (var i=4; i<g.scene.children.length; i++) {
    g.scene.children[i].rotation.x += 0.01;
    g.scene.children[i].rotation.y += 0.01;
  }
}

function initPostprocessing() {
  // init depth buffer
  var pars = { 
    minFilter: THREE.LinearFilter, 
    magFilter: THREE.LinearFilter, 
    format: THREE.RGBFormat 
  };
  g.postprocess.rtDepth = new THREE.WebGLRenderTarget( g.width, g.height, pars );

  // passes
  var renderPass = new THREE.RenderPass( g.scene, g.camera );

  // horizontal dof pass
  g.postprocess.hDOF = new THREE.ShaderPass( Shaders["hDOF"] );
  g.postprocess.hDOF.uniforms[ "tDepth" ].texture = g.postprocess.rtDepth;
  g.postprocess.hDOF.uniforms[ "focus" ].value = 1.0;
  g.postprocess.hDOF.uniforms[ "maxblur" ].value = 2.0;
  g.postprocess.hDOF.uniforms[ "h" ].value = 1.0/g.width;

  // vertical dof pass
  g.postprocess.vDOF = new THREE.ShaderPass( Shaders["vDOF"] );
  g.postprocess.vDOF.uniforms[ "tDepth" ].texture = g.postprocess.rtDepth;
  g.postprocess.vDOF.uniforms[ "focus" ].value = 1.0;
  g.postprocess.vDOF.uniforms[ "maxblur" ].value = 2.0;
  g.postprocess.vDOF.uniforms[ "v" ].value = 1.0/g.height;
  g.postprocess.vDOF.renderToScreen = true;

  // composer
  g.composer = new THREE.EffectComposer( g.renderer );
  g.composer.addPass( renderPass );
  g.composer.addPass( g.postprocess.hDOF );
  g.composer.addPass( g.postprocess.vDOF );
}

function initScene() {
  var light, mesh, node;

  // front light
  light = new THREE.PointLight( 0xffffff, 0.8, 1000 );
  light.position.set( 15, 20, 10 );
  g.scene.add( light );

  // back light
  light = new THREE.PointLight( 0xffffff, 0.2, 1000 );
  light.position.set( -10, 10, -15 );
  g.scene.add( light );

  // ground
  (function() {
    var imageCanvas = document.createElement( "canvas" );
    var context = imageCanvas.getContext( "2d" );

    imageCanvas.width = imageCanvas.height = 128;

    context.fillStyle = "#CCC";
    context.fillRect( 0, 0, 128, 128 );

    context.fillStyle = "#fff";
    context.fillRect( 0, 0, 64, 64);
    context.fillRect( 64, 64, 64, 64 );

    var textureCanvas = new THREE.Texture( imageCanvas, 
      THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping );
    var materialCanvas = new THREE.MeshBasicMaterial( { map: textureCanvas } );

    textureCanvas.needsUpdate = true;
    textureCanvas.repeat.set( 1000, 1000 );

    var geometry = new THREE.PlaneGeometry( 100, 100 );

    var meshCanvas = new THREE.Mesh( geometry, materialCanvas );
    meshCanvas.scale.set( 100, 100, 100 );

    g.scene.add(meshCanvas);
  })();

  // red cube
  for (var x=-80; x<=80; x+=10)
  for (var z=-200; z<=0; z+=10) {
    mesh = new THREE.Mesh(
      new THREE.CubeGeometry( 2.5, 2.5, 2.5 ),
      new THREE.MeshLambertMaterial( { color: 0xFF0000 } )
    );
    mesh.position.set(x, 1.0, z);
    g.scene.add(mesh);
  }

  g.scene.fog = new THREE.Fog( 0x000000, c.FOG_NEAR, c.FOG_FAR );
}

$(function() {
  init();  
  update();
});