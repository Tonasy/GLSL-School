precision mediump float;

uniform float frame;

varying vec4 vColor;
varying float vTime;


// シードを使った乱数生成関数
float rand(float seed) {
    // シードを利用して乱数を生成
    return fract(sin(seed) * 43758.5453123);
}

void main() {
  vec3 color = vColor.rgb;

  // 100フレーム毎に色を交互に切り替える
  bool toggle = mod(floor(frame / 100.0), 2.0) == 1.0;
  if(toggle) {

    // 白をランダムな色に変更
    if(color.r >= 0.6 && color.g >= 0.6 && color.b >= 0.6) {
      color = vec3(rand(gl_FragCoord.x * vTime * 0.00001), rand(gl_FragCoord.y * vTime * 0.000001), rand((gl_FragCoord.x + gl_FragCoord.y) * vTime * 0.001));
    }

    // 目を点滅させる
  if((color.r <= 0.25 && color.g >= 0.7 && color.b <= 0.25) || (color.r >= 0.7 && color.g <= 0.3 && color.b <= 0.3)) {
    if(mod(frame, 3.0) == 0.0){
    color = vec3(0.7, 0.7, 0.3);
    }
    if(mod(frame, 3.0) == 1.0){
    color = vec3(0.3, 0.7, 0.);
    }
    if(mod(frame, 3.0) == 2.0){
    color = vec3(0.7, 0.3, 0.7);
    }
  }
  }else {
    // 赤い部分を黒目にする
    if(color.r >= 0.7 && color.g <= 0.3 && color.b <= 0.3) {
      color = vec3(0.0, 0.0, 0.0);
    }
    // 緑の部分の色を調整
    if(color.r <= 0.25 && color.g >= 0.7 && color.b <= 0.25) {
        color = vec3(0.0, color.g - 0.35, color.b - 0.2);
    }
  }


  gl_FragColor = vec4(color, 1.0);
}
