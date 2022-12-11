function makeRenderProgram(gl) {
	const vertexShaderCode =
		`#version 300 es

		in vec2 a_position;
		in vec2 a_texcoord;

		out vec2 v_texcoord;
		
		void main() {
			v_texcoord = a_texcoord;
			gl_Position = vec4(a_position, 0.0, 1.0);
		}
	`;

	const fragmentShaderCode =
		`#version 300 es
		precision highp float;

		uniform vec2 u_resolution;
		uniform sampler2D u_texture;
		uniform sampler2D u_textureWall;

		in vec2 v_texcoord;

		layout(location = 0) out vec4 outCol;

		void main() {
			vec2 uv = v_texcoord - 0.5;
			uv.x *= u_resolution.x / u_resolution.y;
			vec3 col = texture(u_texture, v_texcoord).rgb;
			col = clamp(col, 0.0, 1.0);
			col *= col;
			float d = texture(u_textureWall, v_texcoord).r;
			float colorSum = col.r + col.g + col.b;
			float blue = col.b / colorSum;
			blue = max(0.0, blue);
			blue = pow(blue, 4.0) * col.b;
			col.r += blue;
			col += vec3(0.2, 0.25, 0.3) * sqrt(1.0 - d);
			outCol = vec4(col, 1.0);
		}
	`;
	const vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexShaderCode);
	gl.compileShader(vertexShader);
	const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, fragmentShaderCode);
	gl.compileShader(fragmentShader);
	const log = gl.getShaderInfoLog(fragmentShader);
	if(log) console.log(log);

	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	const positionAttribute = gl.getAttribLocation(program, 'a_position');
	const texcoordAttribute = gl.getAttribLocation(program, "a_texcoord");
	const resolutionUniform = gl.getUniformLocation(program, 'u_resolution');
	const textureUniform = gl.getUniformLocation(program, 'u_texture');
	const textureWallsUniform = gl.getUniformLocation(program, 'u_textureWall');
	return {program, positionAttribute, texcoordAttribute, resolutionUniform, textureUniform, textureWallsUniform};
}