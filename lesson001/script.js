import { WebGLUtility, ShaderProgram } from '../lib/webgl.js';
import { Pane } from '../lib/tweakpane-4.0.0.min.js';

window.addEventListener(
  'DOMContentLoaded',
  async () => {
    // WebGLApp クラスの初期化とリサイズ処理の設定
    const app = new WebGLApp();
    window.addEventListener('resize', app.resize, false);
    // アプリケーションのロードと初期化
    // 画像の読み込みと情報取得
    await app.loadImg();
    app.init('main-canvas');
    await app.load();
    // セットアップして描画を開始
    app.setup();
    app.render();
  },
  false
);

class WebGLApp {
  /**
   * @constructor
   */
  constructor() {
    // 汎用的なプロパティ
    this.canvas = null;
    this.gl = null;
    this.running = false;
    this.frame = null;

    // 画像を格納するプロパティ
    this.image = null;
    this.imageData = null;

    // this を固定するためメソッドをバインドする
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);

    // uniform 変数用
    this.uDisplacement = 1.0;
    this.uMouse = [0.0, 0.0];
    this.uTime = 0.0;
    this.uFrame = 0;

    // tweakpane を初期化
    const pane = new Pane();
    pane
      .addBlade({
        view: 'slider',
        label: 'displacement',
        step: 1.0,
        min: 1.0,
        max: 10.0,
        value: this.uDisplacement
      })
      .on('change', v => {
        this.uDisplacement = v.value;
      });

    // マウス座標用のイベントを設定 @@@
    window.addEventListener(
      'pointermove',
      mouseEvent => {
        // カーソルの位置はスクリーン空間の値なので、スクリーンの幅や高さで割って正規化する @@@
        const x = mouseEvent.pageX / window.innerWidth;
        const y = mouseEvent.pageY / window.innerHeight;
        // ２倍して１を引くことで、0.0 ～ 1.0 の範囲だった値を -1.0 ～ 1.0 の範囲に変換する @@@
        const signedX = x * 2.0 - 1.0;
        const signedY = y * 2.0 - 1.0;

        this.uMouse[0] = signedX;
        this.uMouse[1] = -signedY; // スクリーン空間とは正負が逆である点に注意
      },
      false
    );
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
      attribute: ['position', 'color', 'size'],
      stride: [3, 4, 1],
      uniform: ['displacement', 'mouse', 'time', 'frame'],
      type: ['uniform1f', 'uniform2fv', 'uniform1f', 'uniform1f']
    });
  }
  /**
   * WebGL のレンダリングを開始する前のセットアップを行う。
   */
  setup() {
    this.getImageInfo();
    this.setupGeometry();
    this.resize();
    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.running = true;
    this.frame = 0;
  }
  /**
   * ジオメトリ（頂点情報）を構築するセットアップを行う。
   */
  setupGeometry() {
    // 初期化
    this.position = [];
    this.color = [];
    this.pointSize = [];

    // imageData から座標と色を設定
    const colors = this.imageData.data;

    for (let i = 0; i < this.imageData.height; i += 3) {
      for (let j = 0; j < this.imageData.width; j += 3) {
        const index = (i * this.imageData.width + j) * 4;

        // カラー
        let r = colors[index] / 255;
        let g = colors[index + 1] / 255;
        let b = colors[index + 2] / 255;

        // 座標
        const y = (i / this.imageData.height) * 2.0 - 1.0;
        const x = (j / this.imageData.width) * 2.0 - 1.0;

        this.position.push(x, -y, 0.0);
        this.color.push(r, g, b, 1.0);
        this.pointSize.push(2.0);
      }
    }

    this.vbo = [
      WebGLUtility.createVbo(this.gl, this.position),
      WebGLUtility.createVbo(this.gl, this.color),
      WebGLUtility.createVbo(this.gl, this.pointSize)
    ];
  }
  /**
   * WebGL を利用して描画を行う。
   */
  render() {
    const gl = this.gl;

    // running が true の場合は requestAnimationFrame を呼び出す
    if (this.running === true) {
      requestAnimationFrame(this.render);
    }

    // 時間の更新 (5フレーム毎に更新)
    if (this.frame % 5 === 0) {
      this.uTime = performance.now();
    }
    this.uFrame = this.frame;

    // ビューポートの設定と背景のクリア
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // プログラムオブジェクトを指定し、VBO と uniform 変数を設定
    this.shaderProgram.use();
    this.shaderProgram.setAttribute(this.vbo);
    this.shaderProgram.setUniform([this.uDisplacement, this.uMouse, this.uTime, this.uFrame]);

    // 設定済みの情報を使って、頂点を画面にレンダリングする
    gl.drawArrays(gl.POINTS, 0, this.position.length / 3);

    // フレームをシェーダに送りインクリメント
    this.frame++;

  }
  /**
   * リサイズ処理を行う。
   */
  resize() {
    this.subCanvas.width = window.innerWidth;
    this.subCanvas.height = window.innerHeight;

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  /**
   * WebGL を実行するための初期化処理を行う。
   * @param {HTMLCanvasElement|string} canvas - canvas への参照か canvas の id 属性名のいずれか
   * @param {object} [option={}] - WebGL コンテキストの初期化オプション
   */
  init(canvas, option = {}) {
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

    // webgl コンテキストの取得
    this.gl = this.canvas.getContext('webgl', option);
    if (this.gl == null) {
      throw new Error('webgl not supported');
    }
  }

  /**
   * 画像データの読み込み
   * @return {Promise}
   */
  async loadImg() {
    return new Promise((resolve, reject) => {
      this.image = new Image();
      this.image.src = './cat03.png';
      this.image.addEventListener('load', () => {
        resolve();
      });
      this.image.addEventListener('error', () => {
        reject(new Error('Failed to load image'));
      });
    });
  }

  /**
   * 画像情報の取得
   */
  getImageInfo() {
    // キャンバス要素の取得
    this.subCanvas = document.getElementById('sub-canvas');
    this.subCanvas.width = window.innerWidth;
    this.subCanvas.height = window.innerHeight;

    // canvas2D コンテキストの取得
    const ctx = this.subCanvas.getContext('2d');

    // 画像データの読み込み
    const imageSize = this.subCanvas.width / 2;
    const sx = (this.subCanvas.width - imageSize) / 2;
    const sy = (this.subCanvas.height - imageSize) / 2;
    // キャンバス全体を黒で塗りつぶす
    ctx.fillStyle = '#000000';
    ctx.rect(0, 0, this.subCanvas.width, this.subCanvas.height);
    ctx.fill();
    // 画像を描画
    ctx.drawImage(this.image, sx, sy, imageSize, imageSize);
    const imageData = ctx.getImageData(0, 0, this.subCanvas.width, this.subCanvas.height);
    this.imageData = imageData;
  }
}
