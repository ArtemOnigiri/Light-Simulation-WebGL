const cnv = document.getElementById('cnv');
const width = cnv.width = 900;
const height = cnv.height = 600;
const gl = cnv.getContext('webgl2');

const quad = [
	-1, -1,
	 1, -1,
	 1,  1,
	 1,  1,
	-1,  1,
	-1, -1,
];

const textCoords = [
	0, 0,
	1, 0,
	1, 1,
	1, 1,
	0, 1,
	0, 0,
];

let time = 0;
let mx = 0;
let my = 0;
let interval;
let originalProgram;
let waveProgram;
let renderProgram;

let textureAmp;
let textureAmp1;
let textureVel;
let textureVel1;
let textureAcc;
let textureAcc1;
let textureWalls;
let fb;
let fb1;

document.addEventListener('mousemove', mouseMove);

initGL();

function initGL() {
	gl.getExtension('EXT_color_buffer_float');
	gl.getExtension('EXT_float_blend');
	gl.getExtension('OES_texture_float_linear');

	gl.viewport(0, 0, width, height);
	
	waveProgram = makeWaveProgram(gl);
	originalProgram = makeOriginalProgram(gl);
	renderProgram = makeRenderProgram(gl);

	gl.useProgram(originalProgram.program);

	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quad), gl.STATIC_DRAW);

	gl.enableVertexAttribArray(originalProgram.positionAttribute);
	gl.vertexAttribPointer(originalProgram.positionAttribute, 2, gl.FLOAT, false, 0, 0);

	const texcoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textCoords), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(originalProgram.texcoordAttribute);
	gl.vertexAttribPointer(originalProgram.texcoordAttribute, 2, gl.FLOAT, false, 0, 0);

	gl.uniform2f(originalProgram.resolutionUniform, width, height);
	gl.uniform1f(originalProgram.timeUniform, 0);
	gl.uniform2f(originalProgram.mouseUniform, 0, 0);

	textureAmp = gl.createTexture();
	textureAmp1 = gl.createTexture();
	textureVel = gl.createTexture();
	textureVel1 = gl.createTexture();
	textureAcc = gl.createTexture();
	textureAcc1 = gl.createTexture();
	textureWalls = gl.createTexture();

	makeTexture(textureAmp);
	makeTexture(textureAmp1);
	makeTexture(textureVel);
	makeTexture(textureVel1);
	makeTexture(textureAcc);
	makeTexture(textureAcc1);
	makeTexture(textureWalls);

	fb = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureAmp, 0);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, textureVel, 0);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, textureWalls, 0);

	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
	gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureAmp, 0);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, textureVel, 0);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, textureAcc, 0);

	fb1 = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb1);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureAmp1, 0);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, textureVel1, 0);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, textureAcc1, 0);

	gl.useProgram(renderProgram.program);
	gl.uniform2f(renderProgram.resolutionUniform, width, height);
	gl.uniform1i(renderProgram.textureUniform, 0);
	gl.uniform1i(renderProgram.textureWallsUniform, 1);

	gl.useProgram(waveProgram.program);
	gl.uniform2f(waveProgram.resolutionUniform, width, height);
	gl.uniform1f(waveProgram.timeUniform, 0);
	gl.uniform2f(waveProgram.mouseUniform, 0, 0);
	gl.uniform1i(waveProgram.textureAmpUniform, 0);
	gl.uniform1i(waveProgram.textureVelUniform, 1);
	gl.uniform1i(waveProgram.textureAccUniform, 2);
	gl.uniform1i(waveProgram.textureWallUniform, 3);

	window.requestAnimationFrame(update);
}

function makeTexture(texture) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function logic() {
	gl.useProgram(waveProgram.program);
	gl.uniform1f(waveProgram.timeUniform, time / 1000.0);
	gl.uniform2f(waveProgram.mouseUniform, mx, my);
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb1);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textureAmp);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, textureVel);
	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, textureAcc);
	gl.activeTexture(gl.TEXTURE3);
	gl.bindTexture(gl.TEXTURE_2D, textureWalls);
	gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textureAmp1);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, textureVel1);
	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, textureAcc1);
	gl.activeTexture(gl.TEXTURE3);
	gl.bindTexture(gl.TEXTURE_2D, textureWalls);
	gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	time += 17;
}

function render() {
	gl.useProgram(renderProgram.program);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textureAcc);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, textureWalls);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function update() {
	for(let i = 0; i < 4; i++) logic();
	render();
	window.requestAnimationFrame(update);
}

function mouseMove(e) {
	mx = (e.clientX / width - 0.5) * (width / height);
	my = -e.clientY / height + 0.5;
}