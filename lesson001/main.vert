
attribute vec3 position;
attribute vec4 color;
attribute float size;

uniform float displacement;
uniform vec2 mouse;
uniform float time;

varying vec4 vColor;
varying float vTime;

// 疑似乱数生成器
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vColor = color;
  vTime = time;

  // 頂点の基本サイズ
  float baseSize = 10.0;

  // 頂点座標からマウスの位置を指すベクトル
  vec2 toMouse = mouse - position.xy;
  // ベクトルの長さを測る
  float distanceToMouse = length(toMouse);
  // ベクトルの単位化 
  vec2 normalizedToMouse = normalize(toMouse);
  // 方向ベクトルへのオフセット
  vec2 offset = normalizedToMouse * 0.01 * (1.0 - distanceToMouse);
  // マウスの周辺は頂点が離れる
  vec4 position = vec4(position.x - offset.x, position.y - offset.y, position.z, 1.0);
  gl_Position = position;

  // ベクトルの長さを考慮して頂点のサイズを変化させる
  gl_PointSize = size * rand(position.xy * time) * displacement  + baseSize;

}
