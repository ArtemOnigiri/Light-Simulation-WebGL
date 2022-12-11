function makeOriginalProgram(gl) {
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

		uniform float u_time;
		uniform vec2 u_resolution;
		uniform vec2 u_mouse;

		in vec2 v_texcoord;

		layout(location = 0) out vec4 outAmp;
		layout(location = 1) out vec4 outVel;
		layout(location = 2) out vec4 outWall;

		const float INDEX_OF_REFRACTION = 3.0 / 5.0;

		float triangle(vec2 p) {
			const float k = sqrt(3.0);
			p.x = abs(p.x) - 1.0;
			p.y = p.y + 1.0 / k;
			if(p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
			p.x -= clamp(p.x, -2.0, 0.0);
			return -length(p) * sign(p.y);
		}

		float mandelbrot(in vec2 c) {
			float c2 = dot(c, c);
			if( 256.0*c2*c2 - 96.0*c2 + 32.0*c.x - 3.0 < 0.0 ) return 0.0;
			if( 16.0*(c2+2.0*c.x+1.0) - 1.0 < 0.0 ) return 0.0;
			const float B = 256.0;
			float l = 0.0;
			vec2 z  = vec2(0.0);
			for(int i = 0; i < 512; i++) {
				z = vec2( z.x*z.x - z.y*z.y, 2.0*z.x*z.y ) + c;
				if( dot(z,z)>(B*B) ) break;
				l += 1.0;
			}
			if( l>511.0 ) return 0.0;
			float sl = l - log2(log2(dot(z,z))) + 4.0;
			return sl;
		}

		void main() {
			vec2 uv = v_texcoord - 0.5;
			uv.x *= u_resolution.x / u_resolution.y;
			vec3 col = vec3(0.0);
			vec3 vel = vec3(0.0);
			outAmp = vec4(col, 1.0);
			outVel = vec4(vel, 1.0);

			// float d = length(uv) - 0.2;
			float d = triangle(uv * 3.0 + vec2(0.0, 0.2));
			// float d = mandelbrot((uv - vec2(0.35, 0.0)) * 2.5) - 1.0;
			
			d = d < 0.0 ? INDEX_OF_REFRACTION : 1.0;
			outWall = vec4(d, 0.0, 0.0, 1.0);
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
	const mouseUniform = gl.getUniformLocation(program, 'u_mouse');
	const timeUniform = gl.getUniformLocation(program, 'u_time');
	return {program, positionAttribute, texcoordAttribute, resolutionUniform, mouseUniform, timeUniform};
}