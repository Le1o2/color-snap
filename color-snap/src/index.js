import CanvasImage from "./canvasImage.js";
import medianCut from "./algorithm/medianCut.js"
import ocTree from './algorithm/ocTree.js'
export const AlgorithmType = {
  MEDIAN_CUT: 1, // 中位切分法
  OC_TREE: 2, // 八叉树
}

export class ColorSnap {
  constructor(image, imageOptions) {
    this.image = image; // 图片地址 ｜ DOM
    this.resolveFn = () => {};
    this.rejectFn = () => {};
    this.imageData = []; // 图片的RGB数组
    this.imageOptions = imageOptions || {}; // canvas配置 高斯模糊半径｜最大尺寸图片
  }
  /**
   * @param {Number} algorithmType: 算法类型
   * @param {Object} algorithmOptions: 算法配置
   * @param {Number} resultNum: 返回主题色数量
   * @returns {Array} 提取主题色结果数组
   * */
  getThemeColor({
    resultNum = 5,
    algorithmType = AlgorithmType.MEDIAN_CUT,
    extraParams = {}
  }) {
    return new Promise((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
      this.process(resultNum, algorithmType, extraParams);
    });
  }

  async getImageBitMap(image) {
    // 传入的为图片URL
    if (typeof image === "string") {
      return await this.convertToImgBitmap(image);
    }
    // 传入的为DOM对象
    if (image instanceof HTMLImageElement) {
      try {
        return await createImageBitmap(image);
      } catch (error) {
        this.rejectFn("解析dom失败", error);
      }
    }
  }
  /**
   * @description 将图片url转为imageBitMap对象
   * */
  async convertToImgBitmap(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);
      return imageBitmap;
    } catch (error) {
      this.rejectFn("加载或创建ImageBitmap失败：", error);
    }
  }

  // /**
  //  * @description 将本地js文件转为Blob文件
  //  * */
  // async convertToBlob(workerFileUrl) {
  //   try {
  //     // 使用 Fetch API 获取 worker 文件内容
  //     const response = await fetch(workerFileUrl);
  //     const blob = await response.blob();
  //     // 创建 Blob 对象
  //     const workerBlob = new Blob([blob], {
  //       type: "application/javascript",
  //     });
  //     const workerBlobUrl = URL.createObjectURL(workerBlob);
  //     return workerBlobUrl;
  //     // 最后，记得在不需要时释放 Blob URL 和 worker
  //     // URL.revokeObjectURL(workerBlobUrl);
  //     // worker.terminate();
  //   } catch (error) {
  //     this.rejectFn("获取worker文件失败", error);
  //   }
  // }
  /**
   * @description 处理worker逻辑
   * */
  async handleWorker(algorithmWorker, imageData, resultNum, extraParams) {
    return new Promise((resolve, reject) => {
      algorithmWorker.onmessage = (event) => {
        if (event.data.error) {
          reject("worker处理异常", event.data.error);
        } else {
          const themeColor = event.data;
          resolve(themeColor);
        }
      };
      // 向web-worker发送开始绘制的消息
      algorithmWorker.postMessage({
        status: "start",
        imageData: imageData,
        resultNum: resultNum,
        extraParams: extraParams,
      });
    });
  }
  async process(resultNum, algorithmType, extraParams) {
    if (!"createImageBitmap" in window) {
      // 浏览器不支持 ImageBitmap
      this.rejectFn("当前浏览器不支持imageBitMap, 建议使用最新版Chrome");
    }
    try {
      if (this.imageData.length === 0) {
        const imgBitmap = await this.getImageBitMap(this.image);
        const canvas = new CanvasImage(imgBitmap, this.imageOptions);
        this.imageData = await canvas.getImageDataFromCanvas(); // 获取图像数据 ArrayBuffer类型
      }
      if (typeof Worker !== "undefined") {
        // 浏览器支持 Web Workers
        // import.meta.url 是一个特殊的变量，它在 ES 模块中用于获取当前模块的 URL。'./worker.js' 表示相对于当前模块的路径，必须为纯js文件且无任何依赖
        let workerUrl = null
        // 个人亲测 new URL中不能写变量，可能是打包问题
        switch (algorithmType) {
          case AlgorithmType.MEDIAN_CUT:
            workerUrl = new URL("./worker/median.worker.js", import.meta.url);
            break;
          case AlgorithmType.OC_TREE:
            workerUrl = new URL("./worker/ocTree.worker.js", import.meta.url);
          default:
            break;
        }
        // const workerUrl = new URL(workerPath, import.meta.url);
        const algorithmWorker = new Worker(workerUrl);
        const result = await this.handleWorker(
          algorithmWorker,
          this.imageData,
          resultNum,
          extraParams
        );
        algorithmWorker.terminate(); // 关闭worker线程
        this.resolveFn(result);
      } else {
        // 浏览器不支持 Web Workers
        let result = []
        switch(algorithmType) {
          case AlgorithmType.MEDIAN_CUT: 
            result = medianCut({ imageData: this.imageData, resultNum, extraParams });
            break
          case AlgorithmType.OC_TREE:
            result = ocTree({
              imageData: this.imageData,
              resultNum,
              extraParams,
            });
            break
        } 
        this.resolveFn(result)
      }
    } catch (e) {
      this.rejectFn(e);
    }
  }
}
