/**
 * @description 颜色盒子类
 * @param {Array} colorRange    [[rMin, rMax],[gMin, gMax], [bMin, bMax]] 颜色范围
 * @param {Number} total   像素总数, imageData / 4
 * @param {Array} data    像素数据集合
 */
class ColorBox {
  constructor(colorRange, total, data) {
    this.colorRange = colorRange;
    this.total = total;
    this.data = data;
    this.volume =
      (colorRange[0][1] - colorRange[0][0] + 1) *
      (colorRange[1][1] - colorRange[1][0] + 1) *
      (colorRange[2][1] - colorRange[2][0] + 1);
    this.rank = this.total * this.volume;
  }
}

function medianCut(props) {
  const { imageData, resultNum, extraParams } = props;
  const { cutTime = 16, filterRange = [8, 247], alphaMin = 128 } = extraParams;
  console.time("中位切分法过滤所用时间");
  const pixels = filterPixels(imageData, filterRange, alphaMin);
  console.timeEnd("中位切分法过滤所用时间");
  console.time("获取颜色范围所用时间");
  const colorRange = getColorRange(pixels);
  console.timeEnd("获取颜色范围所用时间");
  const color_box = new ColorBox(colorRange, pixels.length, pixels);
  console.time("切割所用时间");
  const color_box_arr = queueCut([color_box], cutTime);
  console.timeEnd("切割所用时间");
  const sortColorBox = color_box_arr
    .sort((a, b) => {
      return b.total - a.total;
    })
    .slice(0, resultNum);
  const result = sortColorBox.map((item) => {
    const colorArr = calculateAverageRGB(item.data);
    return {
      color: colorArr,
      hex: rgbToHex(...colorArr),
      rgb: `rgb(${colorArr[0]},${colorArr[1]},${colorArr[2]})`,
      pixelsCount: item.total,
    };
  });
  return result
}
/**
 * @description 计算RGB平均值
 */
function calculateAverageRGB(colors) {
  const totalColors = colors.length;
  if (totalColors === 0) {
    return [0, 0, 0]; // Return black for an empty array
  }
  const sum = colors.reduce(
    (acc, color) => {
      return [acc[0] + color[0], acc[1] + color[1], acc[2] + color[2]];
    },
    [0, 0, 0]
  );
  const average = sum.map((channelSum) => parseInt(channelSum / totalColors));
  return average;
}

/**
 * @description 转化RGB值为HEX
 * */
function rgbToHex(r, g, b) {
  // 将每个颜色分量转换为十六进制字符串
  const rHex = r.toString(16).padStart(2, "0"); // 使用 padStart 补齐到两位
  const gHex = g.toString(16).padStart(2, "0");
  const bHex = b.toString(16).padStart(2, "0");
  // 返回完整的 HEX 颜色码
  return `#${rHex}${gHex}${bHex}`;
}

/**
 * @description 对rgba按规则进行过滤
 * */
function filterPixels(imgData, filterRange = [8, 247], alphaMin = 127) {
  try {
    const data = imgData.data;
    const filteredPixels = [];
    const [min, max] = filterRange; //像素点RGB值不在此范围内的进行过滤 范围可选
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      // rgb值都在[5, 250]范围内，且a大于127。则不过滤
      const isFitBill =
        !(Math.min(r, g, b) >= max || Math.max(r, g, b) <= min) &&
        a >= alphaMin;
      if (isFitBill) {
        filteredPixels.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
    return filteredPixels;
  } catch (e) {
    throw ("RGBA过滤规则设置错误：", e.message);
  }
}

/**
 * @description 获取RGB范围
 * @param {Array} RGB数组
 * @returns {Array} RGB范围二维数组
 * */
function getColorRange(pixelArr) {
  let rRange = [255, 0];
  let gRange = [255, 0];
  let bRange = [255, 0];
  function _isArrDiffEqual(rRange, gRange, bRange) {
    return (
      ((rRange[0] === gRange[0]) === bRange[0]) === 0 &&
      ((rRange[1] === gRange[1]) === bRange[1]) === 255
    );
  }
  for (let i = 0; i < pixelArr.length; i++) {
    if (_isArrDiffEqual(rRange, gRange, bRange)) {
      break;
    }
    const [r, g, b] = pixelArr[i];
    rRange = [Math.min(rRange[0], r), Math.max(rRange[1], r)];
    gRange = [Math.min(gRange[0], g), Math.max(gRange[1], g)];
    bRange = [Math.min(bRange[0], b), Math.max(bRange[1], b)];
  }
  return [rRange, gRange, bRange];
}
/**
 * @description 获取切割边
 * @param {Array} colorRange
 * */
function getCutSide(colorRange) {
  // r:0, g:1, b:2
  const rgbRangeArr = [];
  for (let i = 0; i < 3; i++) {
    rgbRangeArr.push(colorRange[i][1] - colorRange[i][0]);
  }
  const maxRange = Math.max(...rgbRangeArr);
  return maxRange <= 8 ? -1 : rgbRangeArr.indexOf(maxRange);
}

/**
 * @description 获取切割颜色范围
 * @param {*} colorRange
 * @param {*} colorSide
 * @param {*} medianColor
 * */
function getCutRange(colorRange, colorSide, medianColor) {
  const left = colorRange[colorSide][0];
  if (medianColor === left) medianColor++; // 处理边界值
  let arrOne = [];
  let arrTwo = [];
  // 克隆原二维数组
  colorRange.map((item) => {
    arrOne.push(item.slice());
    arrTwo.push(item.slice());
  });
  arrOne[colorSide][1] = medianColor;
  arrTwo[colorSide][0] = medianColor;
  return [arrOne, arrTwo];
}

/**
 * @description 获取中位数
 * */
function getMedianColor(colorMap) {
  const sortColorMap = colorMap.slice().sort((a, b) => a - b);
  const middle = Math.floor(sortColorMap.length / 2);
  if (sortColorMap.length % 2 === 0) {
    return Math.floor((sortColorMap[middle - 1] + sortColorMap[middle]) / 2);
  } else {
    return sortColorMap[middle];
  }
}

function queueCut(queue, num) {
  let queues = queue;
  while (queues.length < num) {
    queues = queues.sort((a, b) => {
      return b.rank - a.rank;
    });
    const firstBox = queues.shift();
    const resultBox = cutBox(firstBox);
    queues = queues.concat(resultBox);
    if (resultBox.length === 1) break;
  }
  return queues;
}
function cutBox(color_box) {
  const { colorRange, data } = color_box;
  const cutSide = getCutSide(colorRange);
  if (cutSide === -1) return color_box; // 当切割边为-1即切割范围小于阈值时 停止切割
  // 统计出各个值的数量
  const cutColorMap = data.map((item) => item[cutSide]);
  // 获取中位数
  const medianColor = getMedianColor(cutColorMap);
  // 获取切割范围
  const newRange = getCutRange(colorRange, cutSide, medianColor);
  // 排序数组
  const sortArr = sortColorBox(data, cutSide, medianColor);
  const boxOne = new ColorBox(newRange[0], sortArr[0].length, sortArr[0]);
  const boxTwo = new ColorBox(newRange[1], sortArr[1].length, sortArr[1]);
  return [boxOne, boxTwo];
}

function sortColorBox(data, cutSide, medianColor) {
  const boxOne = [];
  const boxTwo = [];
  data.map((item) => {
    item[cutSide] < medianColor ? boxOne.push(item) : boxTwo.push(item);
  });
  return [boxOne, boxTwo];
}

export default medianCut