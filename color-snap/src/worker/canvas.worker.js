// 在Web Worker中进行离屏渲染
self.onmessage = function (event) {
  try {
    // 接收主线程发送的消息，确认开始绘制
    if (event.data.status === "start") {
      const { image, scaleRatio, blurAmount } = event.data;
      const height = Math.floor(image.height / scaleRatio)
      const width = Math.floor(image.width /scaleRatio)
      // 创建一个离屏Canvas
      const offscreenCanvas = new OffscreenCanvas(width, height);
      const offscreenCtx = offscreenCanvas.getContext("2d");
      // 在离屏Canvas上进行绘制, 按比例缩放
      offscreenCtx.drawImage(image, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
      // 高斯模糊
      offscreenCtx.filter = `blur(${blurAmount}px)`;
      offscreenCtx.drawImage(
        offscreenCanvas,
        0,
        0,
        offscreenCanvas.width,
        offscreenCanvas.height,
        0,
        0,
        offscreenCanvas.width,
        offscreenCanvas.height
      );
      offscreenCtx.filter = "none"; // 清除 filter，避免影响后续绘制

      // 获取绘制结果的ImageData
      const imageData = offscreenCtx.getImageData(0, 0, width, height)
      // 将ImageData传回主线程
      self.postMessage(imageData);
    }
  } catch (e) {
    self.postMessage({ e: e.message });
  }
};
