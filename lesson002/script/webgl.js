import { WebGLUtility, ShaderProgram } from '../../lib/webgl.js';
import { WebGLMath } from '../../lib/math.js';
import { Pane } from '../../lib/tweakpane-4.0.0.min.js';
import Lenis from '../../lib/lenis.js';

export default class WebGLApp {
  static CAMERA_PARAMS = {
    fov: 60,
    near: 0.1,
    far: 10000.0
  };

  /**
   * @constructor
   */
  constructor() {
    // lenis
    this.lenis = new Lenis({
      smooth: true,
      lerp: 0.1
    });

    // 汎用的なプロパティ
    this.canvas = null;
    this.gl = null;
    this.running = false;

    // planeの情報
    this.planes = [];
    this.scaleMat = WebGLMath.Mat4.identity(); //  メッシュのスケール行列
    this.translateMat = WebGLMath.Mat4.identity(); // メッシュの平行移動行列

    // カメラの情報
    this.camera = {
      aspect: 0.0,
      distance: 0.0
    };

    // アニメーションの情報
    this.duration = 800; // アニメーションの所要時間

    // this を固定するためメソッドをバインドする
    this.onResize = this.onResize.bind(this);
    this.render = this.render.bind(this);

    // 各種パラメータや uniform 変数用
    this.time = 0.0; // 時間
    this.previousTime = 0; // 直前のフレームのタイムスタンプ
    this.uTextureResolution0 = [0.0, 0.0]; // uniform 変数 resolution 用
    this.uTextureResolution1 = [0.0, 0.0]; // uniform 変数 resolution 用
    this.uMeshResolution = [0.0, 0.0]; // uniform 変数 meshResolution 用

    // スクロールの情報
    this.scroll = 0.0;
    this.scrollPrev = 0.0;
    this.scrollDiff = 0.0;

    // scrollEffect の設定
    this.scrollEffect = 1.0;

    // hoverDistortion の設定
    this.distortionStrength = 0.05;
    this.distortionFrequency = 10.0;
    this.distortionSpeed = 2.0;
  }
  /**
   * WebGL を実行するための初期化処理を行う。
   * @param {HTMLDivElement | string} plane - 同期する対象のDOM要素かそのクラス名のいずれか
   * @param {HTMLCanvasElement|string} canvas - canvas への参照か canvas の id 属性名のいずれか
   * @param {object} [option={}] - WebGL コンテキストの初期化オプション
   */
  init(plane, canvas, option = {}) {
    // 同期する対象の DOM 要素の設定
    if (plane instanceof HTMLDivElement === true) {
      this.planeElement = plane;
    } else if (Object.prototype.toString.call(plane) === '[object String]') {
      const p = document.querySelector(`.${plane}`);
      if (p instanceof HTMLDivElement === true) {
        this.planeElement = p;
      }
    }

    // webgl コンテキストを取得
    if (canvas instanceof HTMLCanvasElement === true) {
      this.canvas = canvas;
    } else if (Object.prototype.toString.call(canvas) === '[object String]') {
      const c = document.querySelector(`#${canvas}`);
      if (c instanceof HTMLCanvasElement === true) {
        this.canvas = c;
      }
    }
    if (this.canvas == null) {
      throw new Error('invalid argument');
    }
    this.gl = this.canvas.getContext('webgl', option);
    if (this.gl == null) {
      throw new Error('webgl not supported');
    }
  }

  /**
   * TweakPane のセットアップ
   */
  setupPane() {
    // tweakpane を初期化
    const pane = new Pane();
    pane
      .addBlade({
        view: 'list',
        label: 'scrollEffect',
        options: [
          { text: 'none', value: 0.0 },
          { text: 'rgbShift', value: 1.0 },
          { text: 'grayScale', value: 2.0 },
          { text: 'luminance', value: 3.0 }
        ],
        value: 1.0
      })
      .on('change', v => {
        this.scrollEffect = v.value;
      });

    const folder = pane.addFolder({
      title: 'hoverDistortion',
      expanded: true
    });
    folder
      .addBinding(this, 'distortionStrength', {
        min: 0.0,
        max: 0.5,
        step: 0.01
      })
      .on('change', v => {
        this.distortionStrength = v.value;
      });
    folder
      .addBinding(this, 'distortionFrequency', {
        min: 1.0,
        max: 50.0,
        step: 1.0
      })
      .on('change', v => {
        this.distortionFrequency = v.value;
      });
    folder
      .addBinding(this, 'distortionSpeed', {
        min: 1.0,
        max: 10.0,
        step: 1.0
      })
      .on('change', v => {
        this.distortionSpeed = v.value;
      });
  }

  /**
   * シェーダやテクスチャ用の画像など非同期で読み込みする処理を行う。
   * @return {Promise}
   */
  async load() {
    const vs = await WebGLUtility.loadFile('./main.vert');
    const fs = await WebGLUtility.loadFile('./main.frag');
    this.shaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: vs,
      fragmentShaderSource: fs,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [
        'mvpMatrix',
        'textureUnit0',
        'textureUnit1',
        'progress',
        'texResolution0',
        'texResolution1',
        'meshResolution',
        'scrollDiff',
        'scrollEffect',
        'distortionStrength',
        'distortionFrequency',
        'distortionSpeed'
      ],
      type: [
        'uniformMatrix4fv',
        'uniform1i',
        'uniform1i',
        'uniform1f',
        'uniform2fv',
        'uniform2fv',
        'uniform2fv',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform1f'
      ]
    });
  }
  // - 各設定値のセットアップ ---------------------------------------------------
  /**
   * WebGL のレンダリングを開始する前のセットアップを行う。
   */
  async setup() {
    const gl = this.gl;

    // planeElements の取得
    this.planeElements = document.querySelectorAll('.webgl-plane');

    this.setupGeometry();
    await this.setTextures();
    this.setVBO();

    this.onResize();
    this.running = true;
    this.previousTime = Date.now();

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);

    // カメラと plane の設定
    this.setCamera();
    this.setPlaneSize();
    this.setPlanePosition();
  }
  /**
   * ジオメトリ（頂点情報）を構築するセットアップを行う。
   */
  setupGeometry() {
    this.planeElements.forEach((planeElement, index) => {
      const planeSize = {
        width: 1.0,
        height: 1.0
      };
      const color = [1.0, 1.0, 1.0, 1.0];
      const segments = { x: 10.0, y: 10.0 };

      // 初期化
      this.planes[index] = this.planeGeometry(planeSize.width, planeSize.height, color, segments.x, segments.y);
      this.planes[index].textures = [];
      this.planes[index].uniforms = {};
      this.planes[index].matrices = {};

      // IBO の生成
      this.planes[index].ibo = WebGLUtility.createIbo(this.gl, this.planes[index].index);

      this.planes[index].element = planeElement; // 紐づく DOM 要素
    });
  }
  /**
   * テクスチャを設定する
   */
  async setTextures() {
    const gl = this.gl;
    for (const plane of this.planes) {
      // テクスチャのソースを取得
      const texSources = [plane.element.dataset['texSrc0'], plane.element.dataset['texSrc1']];

      // uniform 変数に渡す値を設定
      const [tex1, tex0] = await Promise.all([
        this.createTextureFromFile(gl, texSources[1]),
        this.createTextureFromFile(gl, texSources[0])
      ]);

      // 1つ目のテクスチャ
      plane.textures.push(tex0.texture);
      plane.uniforms.uTextureResolution0 = [tex0.width, tex0.height];

      // 2つ目のテクスチャ
      plane.textures.push(tex1.texture);
      plane.uniforms.uTextureResolution1 = [tex1.width, tex1.height];
    }
  }
  /**
   * VBO を設定する
   */
  setVBO() {
    this.planes.forEach(plane => {
      const posVBO = WebGLUtility.createVbo(this.gl, plane.position);
      const texVBO = WebGLUtility.createVbo(this.gl, plane.texCoord);
      plane.vbo = [posVBO, texVBO];
    });
  }
  /**
   * カメラの設定を調整する
   */
  setCamera() {
    // アスペクト比
    this.camera.aspect = window.innerWidth / window.innerHeight;
    // カメラの距離
    this.camera.distance = this.calcViewportDistance(window.innerHeight, WebGLApp.CAMERA_PARAMS.fov);
  }
  /**
   * planeのサイズを設定
   */
  setPlaneSize() {
    const m4 = WebGLMath.Mat4;
    const v3 = WebGLMath.Vec3;

    this.planes.forEach(plane => {
      // planeElement のサイズを取得
      plane.size = {
        width: plane.element.clientWidth,
        height: plane.element.clientHeight
      };

      const planeSize = v3.create(plane.size.width, plane.size.height, 1.0);

      // メッシュのサイズを設定
      const scaleMat = m4.scale(m4.identity(), planeSize);

      // モデル変換行列を設定
      plane.matrices.scaleMat = scaleMat;

      // uniform 変数に渡す値を設定
      plane.uniforms.uMeshResolution = [plane.size.width, plane.size.height];
    });
  }
  /**
   * planeの位置を調整する
   */
  setPlanePosition() {
    const m4 = WebGLMath.Mat4;
    const v3 = WebGLMath.Vec3;

    const rendererSize = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    this.planes.forEach(plane => {
      // 画面左上原点にそろえたうえでメッシュの原点を設定
      const meshOrigin = {
        x: -rendererSize.width / 2 + plane.size.width / 2,
        y: rendererSize.height / 2 - plane.size.height / 2
      };

      // planeElementの位置を取得
      const planeElementPosition = {
        x: plane.element.offsetLeft,
        y: plane.element.offsetTop
      };

      // メッシュの位置を設定
      const planeMeshPosition = {
        x: meshOrigin.x + planeElementPosition.x,
        y: meshOrigin.y - planeElementPosition.y + this.scroll
      };

      // メッシュの位置を反映
      plane.matrices.translateMat = m4.translate(
        m4.identity(),
        v3.create(planeMeshPosition.x, planeMeshPosition.y, 0.0)
      );

      plane.position = [planeMeshPosition.x, planeMeshPosition.y, 0.0];

      // uniform 変数に渡す値を設定
      plane.uniforms.uScrollDiff = this.scroll || 0.0;
    });
  }
  // ---------------------------------------------------------------------------

  // - レンダリング処理 ---------------------------------------------------------
  /**
   * WebGL を利用して描画を行う。
   * @param {number} time - 経過時間
   */
  render() {
    // 短く書けるようにローカル変数に一度代入する
    const gl = this.gl;
    const m4 = WebGLMath.Mat4;
    const v3 = WebGLMath.Vec3;
    const v2 = WebGLMath.Vec2;

    // スクロールの情報
    this.scroll = this.lenis.scroll;
    this.scrollDiff = this.scroll - this.scrollPrev;

    // ビューポートの設定と背景色・深度値のクリア
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // mesh の位置を更新
    this.setPlanePosition();

    // 直前のフレームからの経過時間を取得
    const now = performance.now();

    // 慣性スクロールの更新
    this.lenis.raf(now);

    // 各 plane に対して描画処理を行う
    this.planes.forEach(plane => {
      // - アニメーションの更新 -------------------------------------------------
      this.uNowTime = performance.now(); // 現在時刻をわたす

      let uProgress = 0.0;
      if (plane.animation && plane.animation.animating) {
        const elapsedTime = now - plane.animation.enteringTime; // 経過時間
        let progress = Math.min(elapsedTime / this.duration, 1.0); // 進行度合い
        progress = easeOut(progress); // イーズアウト処理

        // 順再生の場合
        if (!plane.animation.leaving) {
          uProgress = progress;
        } else {
          // 逆再生の場合
          const playbackElapsedTime = now - plane.animation.leavingTime; // 開始時刻を渡す
          const playbackDuration = this.duration * plane.animation.currentProgress; // 逆再生時の所要時間

          const playBackProgress = Math.min(playbackElapsedTime / playbackDuration, 1.0);

          uProgress = 1.0 - easeOut(playBackProgress); // 反転
        }
      }

      // - 各種行列を生成する ---------------------------------------------------
      const m = plane.matrices;
      const u = plane.uniforms;

      // モデル座標変換行列
      const mMat = m4.multiply(m.translateMat, m.scaleMat);

      // ビュー座標変換行列
      const eye = v3.create(0.0, 0.0, this.camera.distance); // カメラの位置
      const center = v3.create(0.0, 0.0, 0.0); // カメラの注視点
      const upDirection = v3.create(0.0, 1.0, 0.0); // カメラの天面の向き
      const vMat = m4.lookAt(eye, center, upDirection);

      // プロジェクション座標変換行列
      const fovy = WebGLApp.CAMERA_PARAMS.fov;
      const aspect = this.camera.aspect;
      const near = WebGLApp.CAMERA_PARAMS.near;
      const far = WebGLApp.CAMERA_PARAMS.far;
      const pMat = m4.perspective(fovy, aspect, near, far);

      // 行列を乗算して MVP 行列を生成する（行列を掛ける順序に注意）
      const vpMat = m4.multiply(pMat, vMat);
      const mvpMat = m4.multiply(vpMat, mMat);
      // ------------------------------------------------------------------------

      // ２つのユニットにそれぞれのテクスチャをバインド
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, plane.textures[0]);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, plane.textures[1]);
      // ------------------------------------------------------------------------

      // プログラムオブジェクトを指定し、VBO と uniform
      const uTextureResolution0 = v2.create(u.uTextureResolution0[0], u.uTextureResolution0[1]);
      const uTextureResolution1 = v2.create(u.uTextureResolution1[0], u.uTextureResolution1[1]);
      const uMeshResolution = v2.create(u.uMeshResolution[0], u.uMeshResolution[1]);

      this.shaderProgram.use();
      this.shaderProgram.setAttribute(plane.vbo, plane.ibo);
      this.shaderProgram.setUniform([
        mvpMat,
        0,
        1,
        uProgress,
        uTextureResolution0,
        uTextureResolution1,
        uMeshResolution,
        this.scrollDiff,
        this.scrollEffect,
        this.distortionStrength,
        this.distortionFrequency,
        this.distortionSpeed
      ]);

      // 設定済みの情報を使って、頂点を画面にレンダリングする
      gl.drawElements(gl.TRIANGLES, plane.index.length, gl.UNSIGNED_SHORT, 0);

      // スクロールの情報を更新
      this.scrollPrev = this.scroll;
    });

    // running が true の場合は requestAnimationFrame を呼び出す
    if (this.running === true) {
      requestAnimationFrame(this.render);
    }
  }
  // ---------------------------------------------------------------------------

  // - イベント処理 -------------------------------------------------------------
  /**
   * イベントの登録
   */
  addEventListeners() {
    window.addEventListener('resize', this.onResize, false);
    this.planes.forEach(plane => {
      plane.element.addEventListener('mouseenter', () => this.onMouseEnter(plane), false);
    });
    this.planes.forEach(plane => {
      plane.element.addEventListener('mouseleave', () => this.onMouseLeave(plane), false);
    });
  }
  /**
   * リサイズ時の処理
   */
  onResize() {
    // キャンバスのリサイズ
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // カメラの再設定
    this.setCamera();

    // planeのサイズと位置を再設定
    this.setPlaneSize();
    this.setPlanePosition();
  }
  /**
   * マウスエンター時の処理
   * @param {object} plane - plane の情報
   */
  onMouseEnter(plane) {
    // 初期化処理
    if (!plane.animation) {
      plane.animation = {};
    }

    plane.animation.animating = true;
    plane.animation.enteringTime = performance.now();
    plane.animation.leaving = false;
  }
  /**
   * マウスリーブ時の処理
   * @param {object} plane - plane の情報
   */
  onMouseLeave(plane) {
    // 初期化処理
    if (!plane.animation) {
      plane.animation = {};
    }
    const now = performance.now();
    const elapsedTime = now - plane.animation.enteringTime;
    let progress = Math.min(elapsedTime / this.duration, 1.0);
    plane.animation.currentProgress = easeOut(progress);

    plane.animation.animating = true;
    plane.animation.leaving = true;
    plane.animation.leavingTime = now;
  }
  // ---------------------------------------------------------------------------

  // - ジオメトリの生成 ---------------------------------------------------------
  /**
   * 平面のジオメトリを生成する
   * @param {number} width - 横幅
   * @param {number} height - 高さ
   * @param {number[]} color - 色
   * @param {number} [segmentsX=1] - X 軸方向の分割数
   * @param {number} [segmentsY=1] - Y 軸方向の分割数
   * @return {object}
   */
  planeGeometry(width, height, color, segmentsX = 1, segmentsY = 1) {
    // 初期化
    const w = width / 2; // 横幅の半分
    const h = height / 2; // 高さの半分

    const pos = []; // 頂点座標
    const nor = []; // 法線
    const col = []; // カラー
    const st = []; // テクスチャ座標
    const idx = []; // インデックス

    // 頂点情報の計算
    for (let i = 0; i <= segmentsY; i++) {
      const v = i / segmentsY; // v方向の割合
      const py = h - v * height; // Y座標

      for (let j = 0; j <= segmentsX; j++) {
        const u = j / segmentsX; // u方向の割合
        const px = -w + u * width; // X座標

        // 頂点座標
        pos.push(px, py, 0.0);
        // 法線
        nor.push(0.0, 0.0, 1.0);
        // カラー
        col.push(color[0], color[1], color[2], color[3]);
        // テクスチャ座標
        st.push(u, v);
      }

      // インデックスの計算
      for (let i = 0; i < segmentsY; i++) {
        for (let j = 0; j < segmentsX; j++) {
          const k = i * (segmentsX + 1); // 現在の行
          const l = (i + 1) * (segmentsX + 1); // 次の行

          const idx0 = k + j;
          const idx1 = k + j + 1;
          const idx2 = l + j;
          const idx3 = l + j + 1;

          // 三角形を構成するインデックス
          idx.push(idx0, idx2, idx1); // 1つ目の三角形
          idx.push(idx1, idx2, idx3); // 2つ目の三角形
        }
      }
    }
    return { position: pos, normal: nor, color: col, texCoord: st, index: idx };
  }

  // ---------------------------------------------------------------------------

  /**
   * カメラの距離を計算
   */
  calcViewportDistance(viewportHeight, cameraFov) {
    const halfFovRad = (cameraFov * Math.PI) / 180 / 2; // 視野角の半分をラジアンに変換
    const halfViewpotHeight = viewportHeight / 2; // ビューポートの高さの半分

    // カメラの距離を計算して返す
    return halfViewpotHeight / Math.tan(halfFovRad);
  }

  /**
   * 画像ファイルを読み込み、テクスチャを生成してコールバックで返却する。
   * @param {WebGLRenderingContext} gl - WebGL コンテキスト
   * @param {string} source - ソースとなる画像のパス
   * @return {Promise}
   */
  createTextureFromFile(gl, source) {
    return new Promise(resolve => {
      const img = new Image();
      img.addEventListener(
        'load',
        () => {
          const tex = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.bindTexture(gl.TEXTURE_2D, null);
          resolve({
            texture: tex,
            width: img.width,
            height: img.height
          });
        },
        false
      );
      img.src = source;
    });
  }
}

/**
 * イーズアウト関数
 * @param {number} p - 進行度
 */
function easeOut(p) {
  return 1 - Math.pow(1 - p, 2);
}

/**
 * イーズイン関数
 * @param {number} p - 進行度
 */
function easeIn(p) {
  return p * p;
}
