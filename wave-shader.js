function makeWaveProgram(gl) {
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

		uniform sampler2D u_textureAmp;
		uniform sampler2D u_textureVel;
		uniform sampler2D u_textureAcc;
		uniform sampler2D u_textureWall;

		in vec2 v_texcoord;

		layout(location = 0) out vec4 outAmp;
		layout(location = 1) out vec4 outVel;
		layout(location = 2) out vec4 outAcc;

		const float ACCUMULATED_EXPOSURE = 0.002;
		const float FREQUENCY = 700.0;
		const float RADIUS = 0.02;
		const vec3 COLOR_SHIFT = vec3(0.002, 0.0, -0.004) * 10.0;

		mat2 rot(float a) {
			float s = sin(a);
			float c = cos(a);
			return mat2(c, -s, s, c);
		}

		float box(vec2 p, vec2 b) {
			vec2 d = abs(p) - b;
			return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
		}

		float circleWave(vec2 point, vec2 circlePosition, float frequency, float size) {
			float r = pow(point.x - circlePosition.x, 2.0) + pow(point.y - circlePosition.y, 2.0);
			float fade = exp(-r / 2.0 / pow(size, 2.0) ) / size;
			return fade * cos(frequency * point.x) * abs(sin(u_time * 3.0));
		}
		
		void border(inout vec3 amp, inout vec3 vel) {
			float falloff = 1.0 - clamp(box(v_texcoord - 0.5, vec2(0.45)), 0.0, 1.0);
			amp *= falloff;
			vel *= falloff;
		}

		void main() {
			vec2 uv = v_texcoord - 0.5;
			uv.x *= u_resolution.x / u_resolution.y;
			
			vec3 offset = vec3(vec2(1.0) / u_resolution, 0.0);
			vec3 amp = texture(u_textureAmp, v_texcoord).rgb;
			vec3 ampUp = texture(u_textureAmp, v_texcoord + offset.zy).rgb;
			vec3 ampRight = texture(u_textureAmp, v_texcoord + offset.xz).rgb;
			vec3 ampDown = texture(u_textureAmp, v_texcoord - offset.zy).rgb;
			vec3 ampLeft = texture(u_textureAmp, v_texcoord - offset.xz).rgb;
			vec3 vel = texture(u_textureVel, v_texcoord).rgb;
			vec3 speed = texture(u_textureWall, v_texcoord).rrr;

			speed += COLOR_SHIFT * smoothstep(0.91, 0.9, speed);
			vec3 force = ampUp + ampRight + ampDown + ampLeft;
			vel += (force * 0.25 - amp) * speed;
			amp += vel;
			
			border(amp, vel);

			if(u_time < 0.1) {
				amp += circleWave(uv * rot(-0.2), vec2(-0.4, 0.1), FREQUENCY, RADIUS);
			}

			vec3 acc = texture(u_textureAcc, v_texcoord).rgb;
			acc += abs(amp) * ACCUMULATED_EXPOSURE;
			outAmp = vec4(amp, 1.0);
			outVel = vec4(vel, 1.0);
			outAcc = vec4(acc, 1.0);
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
	const textureAmpUniform = gl.getUniformLocation(program, 'u_textureAmp');
	const textureVelUniform = gl.getUniformLocation(program, 'u_textureVel');
	const textureAccUniform = gl.getUniformLocation(program, 'u_textureAcc');
	const textureWallUniform = gl.getUniformLocation(program, 'u_textureWall');
	const timeUniform = gl.getUniformLocation(program, 'u_time');
	return {
		program,
		positionAttribute,
		texcoordAttribute,
		resolutionUniform,
		mouseUniform,
		textureAmpUniform,
		textureVelUniform,
		textureAccUniform,
		textureWallUniform,
		timeUniform
	};
}