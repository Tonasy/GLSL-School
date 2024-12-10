precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform vec4 param;

const float PI = 3.1415926;


void main() {
  vec2 coord = gl_FragCoord.xy / resolution;
  vec2 signedCoord = coord * 2.0 - 1.0;

  // 座標系の回転
  float s = sin(time * param.w);
  float c = cos(time * param.w);
  signedCoord = mat2(c, -s, s, c) * signedCoord;

  // 極座標変換
  float a = atan(signedCoord.y, signedCoord.x);
  float r = length(signedCoord) * 2.0 - 1.0;
  signedCoord = vec2(a / PI, r);

  // 座標系の複製
  float scale = 10.0; 
  float space = 1.0; 
  signedCoord = mod(signedCoord * scale, space) - space * 0.5;

  // モザイク化
  float block = param.w * 100.0;
  signedCoord = floor(signedCoord * block) / block;



  // ループを使ってラインを複数処理する
  float lightness = 0.0;
  for (int i = 0; i < 12; ++i) {
    float f = 0.25 + float(i) * 0.1;
    lightness +=  0.001 / abs(signedCoord.y * sin(signedCoord.x * time * f) * param.y);
  }

  vec3 rgb = vec3(coord, abs(sin(time)) * param.x);

  gl_FragColor = vec4(rgb * lightness, 1.0);
}
