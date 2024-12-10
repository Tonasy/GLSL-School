precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform vec4 param;

const float PI = 3.14159265;
const float EPS = 0.0001; // イプシロン（微小な値の意）
const int ITR = 52; // イテレーション回数

// 空間の複製
vec3 repetition(vec3 p, vec3 width) {
  return mod(p, width) - width * 0.5;
}

// 補間
float smoothMin(float d1, float d2, float k){
    float h = exp(-k * d1) + exp(-k * d2);
    return -log(h) / k;
}

// 回転行列
mat2 rot (float r){
    return mat2(cos(r),sin(r),-sin(r),cos(r));
}

float sphereInstance(vec3 p, int seed) {
  // 球の中心座標
  vec3 center = vec3(
        sin(time * 0.02 + float(seed) * 2.3),
        cos(time * 0.01 + float(seed) * 2.1),
        sin(time * 0.005 + float(seed) * 1.75)
  ) * 1.75;

  // 球のサイズ
  float radius = abs(2.0 + 0.75 * sin(time * length(center) * 0.25) * (1.0 + param.w * 2.0));

  // 球の距離関数
  p.y += 0.1 * sin(p.z * 5.0 + time); // 波打たせる
  p.x += 0.1 * sin(p.y * 3.0 + time); // 波打たせる
  p.xy *= rot(time * 0.25 + float(seed) * 0.5); // 回転
  float dist = length(p - center) - radius;

  return dist;
}

float map(vec3 p) {
  // 最小距離の初期化
  float minDist = 1000.0;

  // 距離を計算
  for(int i = 0; i < 4; i++) {
      float dist = sphereInstance(p, i);
      minDist = smoothMin(minDist, dist, 10.0);
  }
  return minDist;
}

// 法線を算出するための関数
vec3 generateNormal(vec3 p) {
  return normalize(vec3(
    map(p + vec3(EPS, 0.0, 0.0)) - map(p + vec3(-EPS, 0.0, 0.0)),
    map(p + vec3(0.0, EPS, 0.0)) - map(p + vec3(0.0, -EPS, 0.0)),
    map(p + vec3(0.0, 0.0, EPS)) - map(p + vec3(0.0, 0.0, -EPS))
  ));
}


void main() {
  // スクリーン座標の正規化
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

  // カメラ
  float camRadius = 8.0; // カメラの回転する半径
  float camPhi = time * 0.5 + time * abs(param.y * 2.5); // カメラの回転角
  vec3 camPos = vec3(camRadius * cos(camPhi), 0.0, camRadius * sin(camPhi)); // カメラの位置
  vec3 camTar = vec3(0.0); // カメラの注視点
  vec3 camDir = normalize(camTar - camPos); // カメラの向き
  vec3 camUp = vec3(0.0, 1.0, 0.0); 
  vec3 camSide = normalize(cross(camDir, camUp)); // カメラの横方向
  camUp = normalize(cross(camSide, camDir)); // カメラの上方向

  // レイの向き
  vec3 rayDir = normalize(camSide * p.x + camUp * p.y + camDir);

  // マーチングループ
  float dist = 0.0;  // レイとオブジェクトの最短距離
  float rayLength = 0.0; // レイにつぎ足す長さ
  vec3 rayPos = camPos; // 初期位置はカメラの位置
  for (int i = 0; i < ITR; ++i) {
    // 距離関数を使って距離を計測
    dist = map(rayPos);
    // レイを計測した距離分だけ進める
    rayLength += dist;
    rayPos = camPos + rayDir * rayLength;
    // 距離が十分に小さい場合はループを抜ける
    if (abs(dist) < EPS) {
      break;
    }
  }

  // 最終的に出力される色
  vec3 destColor = vec3(0.0);

  // 最終的な距離が十分に小さい場合は白にする
  if (abs(dist) < EPS) {
    // ライティング
    vec3 lightDir1 = normalize(vec3(1.0, 1.0, param.z));
    vec3 lightDir2 = normalize(vec3(-1.0, 1.0, -param.z));
    vec3 lightDir3 = normalize(vec3(0.0, -1.0, 0.0));
    vec3 normal = generateNormal(rayPos);
    float diffuse = clamp(dot(normal, lightDir1), 0.01, 1.0) * 0.2;
    diffuse += clamp(dot(normal, lightDir2), 0.01, 1.0) * 0.2;
    diffuse += clamp(dot(normal, lightDir3), 0.3, 1.0);
    destColor = vec3(diffuse);
  }
  destColor = pow(destColor, vec3(0.5 + abs(param.x) / 0.5 * abs(sin(time * 0.25))));

  gl_FragColor = vec4(destColor, 1.0);
}
