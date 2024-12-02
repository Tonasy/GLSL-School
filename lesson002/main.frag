precision mediump float;

uniform sampler2D textureUnit0;
uniform sampler2D textureUnit1;
uniform float progress;
uniform vec2 texResolution0;
uniform vec2 texResolution1;
uniform vec2 meshResolution;
uniform float time;
uniform float scroll;
uniform float scrollEffect;
uniform float distortionStrength;
uniform float distortionFrequency;
uniform float distortionSpeed;

varying vec2 vTexCoord;
varying float vScrollDiff;


vec2 getCoveredUV(vec2 baseUv, vec2 meshResolution, vec2 texResolution, vec2 origin) {
    vec2 ratio = vec2(
    min((meshResolution.x / meshResolution.y) / (texResolution.x / texResolution.y), 1.),
    min((meshResolution.y / meshResolution.x) / (texResolution.y / texResolution.x), 1.)
    );

    vec2 coverUv = vec2(
    baseUv.x * ratio.x + (1. - ratio.x) * origin.x,
    baseUv.y * ratio.y + (1. - ratio.y) * origin.y
    );

    return coverUv;
}

void main() {

  // テクスチャ座標
  vec2 uv = vTexCoord;

  // 歪みエフェクト
  vec2 distortionUv = uv;
  float distortionEffectFactor = smoothstep(0.0, 0.5, progress) * (1.0 - smoothstep(0.5, 1.0, progress));
  if (progress > 0.0 && progress < 1.0) {
      distortionUv.x += sin(distortionUv.y * distortionFrequency + progress * distortionSpeed) * distortionStrength * distortionEffectFactor;
      distortionUv.y += cos(distortionUv.x * distortionFrequency + progress * distortionSpeed) * distortionStrength * distortionEffectFactor;
  }
  vec2 uvTexture0 = getCoveredUV(distortionUv, meshResolution, texResolution0, vec2(0.5));
  vec2 uvTexture1 = getCoveredUV(distortionUv, meshResolution, texResolution1, vec2(0.5));

  // テクスチャからそれぞれサンプリング（抽出）する
  vec4 samplerColor0 = texture2D(textureUnit0, uvTexture0);
  vec4 samplerColor1 = texture2D(textureUnit1, uvTexture1);

  // スクロールエフェクト
  if(scrollEffect == 1.0) {
    // rgbシフト
    float diff = vScrollDiff / 1000.0;
    samplerColor0.r = texture2D(textureUnit0, uvTexture0 + vec2(diff, 0.)).r;
    samplerColor0.g = texture2D(textureUnit0, uvTexture0 + vec2(0., diff)).g;
    samplerColor0.b = texture2D(textureUnit0, uvTexture0 + vec2(-diff, 0.)).b;
    samplerColor1.r = texture2D(textureUnit1, uvTexture1 + vec2(diff, 0.)).r;
    samplerColor1.g = texture2D(textureUnit1, uvTexture1 + vec2(0., diff)).g;
    samplerColor1.b = texture2D(textureUnit1, uvTexture1 + vec2(-diff, 0.)).b;
  } else if(scrollEffect == 2.0){
    // グレースケール
    float diff = clamp(abs(vScrollDiff), 0.0, 1.0);
    float gray = (samplerColor0.r + samplerColor0.g + samplerColor0.b) / 3.0;
    samplerColor0.rgb = mix(samplerColor0.rgb, vec3(gray), diff);
    gray = (samplerColor1.r + samplerColor1.g + samplerColor1.b) / 3.0;
    samplerColor1.rgb = mix(samplerColor1.rgb, vec3(gray), diff);
  } else if(scrollEffect == 3.0){
    // 輝度変動
    float luminance = dot(samplerColor0.rgb, vec3(0.299, 0.587, 0.114));
    if(vScrollDiff != 0.0){
    float diff = clamp(abs(vScrollDiff), 0.0, 1.0); 
      if(vScrollDiff > 0.0) {
        // 明るくする
          samplerColor0.rgb = mix(samplerColor0.rgb, samplerColor0.rgb + vec3(luminance), diff);
          samplerColor1.rgb = mix(samplerColor1.rgb, samplerColor1.rgb + vec3(luminance), diff);
      } else {
        // 暗くする
          samplerColor0.rgb = mix(samplerColor0.rgb, samplerColor0.rgb - vec3(.25), diff);
          samplerColor1.rgb = mix(samplerColor1.rgb, samplerColor1.rgb - vec3(.25), diff);
      }
    }
  }

    vec4 outColor = mix(samplerColor0, samplerColor1, progress);

    // ラインエフェクト
    float lineX1 = smoothstep(0.88, 1.0, fract(uv.x + progress));
    float lineX2 = smoothstep(0.88, 1.0, fract(-uv.x + progress));
    float lineY1 = smoothstep(0.88, 1.0, fract(uv.y + progress));
    float lineY2 = smoothstep(0.88, 1.0, fract(-uv.y + progress));
    outColor.rgb -= (lineX1 + lineX2 + lineY1 + lineY2) * 0.2;

    // 四隅を明るくする
    float circle = smoothstep(0.5, 0.75, length(uv - vec2(0.5)));
    outColor.rgb += circle * 0.5;

  // 出力
  gl_FragColor = outColor;
}
