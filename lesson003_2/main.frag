precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform vec4 param;

const float PI = 3.1415926;

float rand(vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}


void main() {
  vec2 coord = gl_FragCoord.xy / resolution;
  vec2 signedCoord = coord * 2.0 - 1.0;
  vec2 signedCoord2 = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

  // 極座標変換
  float r = length(signedCoord2);
  float theta = atan(signedCoord2.y, signedCoord2.x);

  // 渦
  float noise1 = rand(coord * 0.1 + time * 0.05);
  float noise2 = rand(coord * 0.5 + time * 0.1);
  float spiral1 = sin(10.0 * theta + time + r + noise1) * 0.1;
  float spiral2 = sin(20.0 * theta + time + r * 14.0 + noise1) * 0.08;
  float spiral3 = cos(50.0 * theta + time * 2.0 + r * 26.0 + noise2) * 0.06;
  float spiral4 = sin(80.0 * theta + time * 0.5 + r * 60.0 + noise1) * 0.04;
  float spiral5 = cos(160.0 * theta + time * 0.25 + r * 120.0 + noise2) * 0.025;
  float spiralMix = spiral1 + spiral2 + spiral3 + spiral4 + spiral5;
  float edgeBlur = smoothstep(0.0, 1.0, r);
  spiralMix *= edgeBlur;
  spiralMix += noise1 * 0.025;

    // 逆回転のスパイラル
  float inverseSpiral1 = sin(-10.0 * theta + time + r + noise1) * 0.02;
  float inverseSpiral2 = sin(-20.0 * theta + time + r * 14.0 + noise1) * 0.015;
  float inverseSpiral3 = cos(-50.0 * theta + time * 2.0 + r * 26.0 + noise2) * 0.0125;
  float inverseSpiral4 = sin(-80.0 * theta + time * 0.5 + r * 60.0 + noise1) * 0.01;
  float inverseSpiral5 = cos(-160.0 * theta + time * 0.25 + r * 120.0 + noise2) * 0.007;
  float inverseSpiralMix = inverseSpiral1 + inverseSpiral2 + inverseSpiral3 + inverseSpiral4 + inverseSpiral5;
  inverseSpiralMix *= edgeBlur;
  inverseSpiralMix += noise1 * 0.025;

  // 色の波
  vec3 colorWave = vec3(
    sin(time * 0.5 + signedCoord2.x * 5.0),
    cos(time * 0.7 + signedCoord2.y * 5.0),
    sin(time * 0.3 + length(signedCoord2) * 5.0)
  ) * 0.05 * param.x;
  vec3 spiralColor = vec3(
      sin(spiralMix * 10.0),
      cos(spiralMix * 12.0),
      sin(spiralMix * 7.0)
  ) * 0.075 * param.x;

  // 中心部を光らせる
  float glow = 0.05 / (0.01 + length(signedCoord2));
  float pulsatingGlow = glow * sin(time * 0.75) * param.w;

  // ループを使って複製
  float lightness = 0.0;
  for(int i = 0; i < 36; ++i) {
    float f = 0.5 + float(i) * 0.5;

    // offsetを一定フレームごとに更新
    vec2 offset = vec2(rand(vec2(f, 1.0 - f)), rand(vec2(1.0 - f, f))) - 0.5;
    offset *= sin(time * f * rand(offset) * rand(vec2(f, f)) * param.y * 0.25);
    signedCoord += offset;

    // フラッシュ
    float flash =  0.002 * abs(sin(time * f)) / abs(signedCoord.y);
    flash *= 0.002 * abs(sin(time * f)) / abs(signedCoord.x);
    lightness += flash;

    

    // 星
    vec2 randomCoord = vec2(rand(coord.xy), rand(coord.yx));
    float star = 0.01 / abs(randomCoord.y * f + abs(sin(randomCoord.x * time * f * 0.5)) * param.z);
    lightness += star;
  }

  vec3 rgb = vec3(coord, 0.75 + sin(1.0 - time * 0.75) * 2.0);

  // 最終的な色を計算
  vec3 outColor = rgb * lightness
    + spiralMix
    + inverseSpiralMix
    + spiralColor
    + colorWave
    + pulsatingGlow
    ;

  gl_FragColor = vec4(outColor, 1.0);
}
