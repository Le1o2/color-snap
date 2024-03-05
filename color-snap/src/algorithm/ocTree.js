class OcTreeNode {
  constructor() {
    this.isLeaf = false;
    this.pixelCount = 0;
    this.red = 0;
    this.green = 0;
    this.blue = 0;
    this.children = new Array(8);
    for (let i = 0; i < this.children.length; i++) {
      this.children[i] = null;
    }
    this.next = null;
  }
}
let reducible = []; // 链表
let leafNum = 0; // 现在所处的节点
for (let i = 0; i < 7; i++) reducible.push(null); // 初始化链表
let root = new OcTreeNode(); // 根节点
function ocTree(props) {
  const { imageData, resultNum, extraParams } = props;
  const {
    maxLeafNum = 256,
    filterRange = [8, 247],
    alphaMin = 128,
  } = extraParams;
  console.time("过滤所用时间");
  const pixelArray = filterPixels(imageData, filterRange, alphaMin);
  console.timeEnd("过滤所用时间");
  console.time("建树&减枝所用时间");
  buildTree(pixelArray, maxLeafNum);
  console.timeEnd("建树&减枝所用时间");
  let colors = {};
  colorsStats(root, colors);
  const treeResult = Object.entries(colors);
  const result = treeResult
    .sort((a, b) => {
      return b[1] - a[1];
    })
    .slice(0, resultNum)
    .map((item) => {
      const rgb = hexToRGB(item[0]);
      return {
        color: rgb,
        pixelsCount: item[1],
        hex: `#${item[0]}`,
        rgb: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
      };
    });
  return result;
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

function hexToRGB(hex) {
  hex = hex.replace(/^#/, "");
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function createNode(parent, idx, level) {
  let node = new OcTreeNode();
  if (level === 7) {
    node.isLeaf = true;
    leafNum++;
  } else {
    node.next = reducible[level];
    reducible[level] = node;
  }
  return node;
}
function buildTree(pixels, maxColors) {
  for (let i = 0; i < pixels.length; i++) {
    // 添加颜色
    addColor(root, pixels[i], 0);
    // 合并叶子节点
    while (leafNum > maxColors) reduceTree();
  }
}
// 补齐位数
function completeDigits(digits, length, completion = "0") {
  let result = digits;
  while (result.length < length) {
    result = completion + result;
  }
  return result;
}

function colorsStats(node, object) {
  if (node.isLeaf) {
    let r = parseInt(node.red / node.pixelCount).toString(16);
    let g = parseInt(node.green / node.pixelCount).toString(16);
    let b = parseInt(node.blue / node.pixelCount).toString(16);
    [r, g, b] = [r, g, b].map((item) => {
      return completeDigits(item, 2);
    });
    const color = r + g + b;
    if (object[color]) object[color] += node.pixelCount;
    else object[color] = node.pixelCount;
    return;
  }

  for (let i = 0; i < 8; i++) {
    if (null !== node.children[i]) {
      colorsStats(node.children[i], object);
    }
  }
}

function reduceTree() {
  let lv = 6;
  while (null === reducible[lv]) lv--;
  let node = reducible[lv];
  reducible[lv] = node.next;
  // merge children
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < 8; i++) {
    if (null === node.children[i]) continue;
    r += node.children[i].red;
    g += node.children[i].green;
    b += node.children[i].blue;
    count += node.children[i].pixelCount;
    leafNum--;
  }
  node.isLeaf = true;
  node.red = r;
  node.green = g;
  node.blue = b;
  node.pixelCount = count;
  leafNum++;
}

function addColor(node, color, level) {
  if (node.isLeaf) {
    node.pixelCount++;
    node.red += color[0];
    node.green += color[1];
    node.blue += color[2];
  } else {
    let str = "";
    let r = color[0].toString(2);
    let g = color[1].toString(2);
    let b = color[2].toString(2);
    [r, g, b] = [r, g, b].map((item) => {
      return completeDigits(item, 8);
    });
    str += r[level];
    str += g[level];
    str += b[level];
    const index = parseInt(str, 2);

    if (node.children[index] == null) {
      node.children[index] = createNode(node, index, level + 1);
    }
    addColor(node.children[index], color, level + 1);
  }
}
export default ocTree;
