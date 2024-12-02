
attribute vec3 position;
attribute vec2 texCoord;

uniform mat4 mvpMatrix;
uniform mat4 modelMatrix;
uniform float scrollDiff;

varying vec2 vTexCoord;
varying float vScrollDiff;

void main() {
  vTexCoord = texCoord;
  vScrollDiff = scrollDiff;

  vec3 pos = position;

  float curveMax = 0.5;
  float curveMin = -0.5;

  float curveStrength = clamp(scrollDiff * 0.05, curveMin, curveMax);

  float curve = cos(pos.x) * curveStrength;

  pos.y -= curve;

  pos.y +=  curveStrength;
  
  gl_Position = mvpMatrix * vec4(pos, 1.0);


}
