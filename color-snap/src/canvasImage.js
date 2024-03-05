/**
 * Canvas对象
 * */
class CanvasImage {
  constructor(image, { blurAmount = 5, maxDimensions = 1600 * 1200 }) {
    this.image = image;
    this.blurAmount = blurAmount; // 模糊半径
    this.maxDimensions = maxDimensions; // 最大尺寸图片
    this.scaleRatio = Math.sqrt( (this.image.height * this.image.width) / (1600 * 1200) ) < 1 ? 1 : Math.sqrt( (this.image.height * this.image.width) / (800 * 1200) );    
    console.log('this.scaleRatio===>', this.scaleRatio)
  }
  getImageDataFromCanvas() {
    return new Promise((res, rej) => {
      console.time('生成canvas时间')
      let imageData = {}; // 图像数据
      // 检测浏览器是否支持OffscreenCanvas
      const isOffscreenCanvasSupported = typeof OffscreenCanvas !== "undefined";
      if (isOffscreenCanvasSupported) {
        // 获取worker URL
        const canvasWorkerUrl = new URL(
          "./worker/canvas.worker.js",
          import.meta.url
        );
        const worker = new Worker(canvasWorkerUrl);
        // 监听Web Worker传回的消息
        worker.onmessage = function (event) {
          if (event.data.error) {
            rej("worker处理canvas异常:", event.data.error);
          } else {
            // 在主线程中绘制Web Worker传回的Canvas图像数据
            imageData = event.data;
            console.timeEnd("生成canvas时间");
            res(imageData);
            worker.terminate(); // 关闭worker
          }
        };

        // 向Web Worker发送开始绘制的消息
        worker.postMessage({
          status: "start",
          image: this.image,
          scaleRatio: this.scaleRatio,
          blurAmount: this.blurAmount,
        });
        // todo 清除worker
      } else {
        try {
          // 浏览器不支持OffscreenCanvas的场景
          const canvas = document.createElement("canvas");
          canvas.height = Math.floor(
            this.image.height / this.scaleRatio
          );
          canvas.width = Math.floor(
            this.image.width / this.scaleRatio
          );
          const ctx = canvas.getContext("2d");
          // 在原始画布上绘制缩放后的图像并应用模糊效果
          // this.image.onload = function () {
          debugger;
          ctx.drawImage(this.image, 0, 0, canvas.width, canvas.height);
          // }
          ctx.filter = `blur(${this.blurAmount}px)`;
          ctx.drawImage(
            canvas,
            0,
            0,
            canvas.width,
            canvas.height,
            0,
            0,
            canvas.width,
            canvas.height
          );
          ctx.filter = "none"; // 清除 filter，避免影响后续绘制
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          res(imageData);
        } catch (e) {
          rej("canvas绘制异常:", e.message);
        }
      }
    });
  }
}
export default CanvasImage;
