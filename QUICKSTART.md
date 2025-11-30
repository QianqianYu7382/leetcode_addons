# 快速开始测试

## 第一步：准备图标（必须）

扩展需要图标才能加载。最简单的方法：

1. **访问在线图标生成器**
   - 打开 https://www.favicon-generator.org/
   - 或 https://favicon.io/
   - 或使用任何图片编辑器

2. **创建/下载图标**
   - 选择一个图标（可以是书本📚、代码符号</>、或LeetCode相关的图标）
   - 导出或下载为以下尺寸：
     - 16x16 像素 -> 保存为 `icon16.png`
     - 48x48 像素 -> 保存为 `icon48.png`
     - 128x128 像素 -> 保存为 `icon128.png`

3. **放置图标**
   - 将三个PNG文件放到项目根目录（与manifest.json同级）

## 第二步：加载扩展

1. 打开Chrome，访问 `chrome://extensions/`
2. 开启"开发者模式"（右上角开关）
3. 点击"加载已解压的扩展程序"
4. 选择 `leetcode_addons` 文件夹
5. 扩展应该出现在列表中 ✅

## 第三步：快速测试（无需真实做题）

### 方法1：使用测试辅助脚本（推荐）

1. **打开Service Worker Console**
   - 在扩展管理页面找到你的扩展
   - 点击"检查视图：service worker"或"Service worker"链接
   - 会打开一个新的开发者工具窗口

2. **加载测试工具**
   - 打开项目中的 `test-helper.js` 文件
   - 复制全部内容
   - 粘贴到Service Worker Console中，按回车
   - 你会看到使用说明和可用函数列表

3. **添加测试数据**
   ```javascript
   addTestData()
   ```
   这会添加4个测试题目

4. **查看效果**
   - 点击浏览器工具栏中的扩展图标
   - 应该能看到4个题目，其中2个需要复习

5. **测试通知**
   ```javascript
   triggerReviewCheck()
   ```
   应该会弹出浏览器通知

### 方法2：手动测试（真实环境）

1. **访问LeetCode**
   - 打开 https://leetcode.cn/problems/two-sum/
   - 或 https://leetcode.com/problems/two-sum/

2. **打开开发者工具**
   - 按 `F12` 打开开发者工具
   - 切换到 Console 标签

3. **做题并提交**
   - 编写一个简单的解决方案
   - 点击"提交"或"Submit"
   - 当看到"Accepted"或"通过"时
   - 页面右上角应该出现绿色提示："已记录: 1. Two Sum"

4. **验证记录**
   - 点击扩展图标
   - 应该能看到新记录的题目

## 第四步：验证功能

### ✅ 检查清单

- [ ] 扩展成功加载，没有错误
- [ ] Popup界面正常显示
- [ ] 能看到测试数据（4个题目）
- [ ] "待复习"标签显示2个题目
- [ ] "全部题目"标签显示4个题目
- [ ] 点击"标记为已复习"按钮能正常工作
- [ ] 通知功能正常（能看到浏览器通知）
- [ ] 点击题目能打开对应的LeetCode页面

## 常见问题

### ❌ 扩展无法加载
- 检查是否有图标文件（icon16.png, icon48.png, icon128.png）
- 检查manifest.json格式是否正确
- 查看扩展管理页面的错误信息

### ❌ Popup显示空白
- 右键点击扩展图标 -> "检查弹出内容"
- 查看Console中的错误信息

### ❌ 无法检测提交
- 确保在正确的LeetCode域名（leetcode.cn 或 leetcode.com）
- 刷新页面后重试
- 检查Content Script是否正确注入（开发者工具 -> Sources -> Content scripts）

### ❌ 通知不显示
- 检查通知权限是否已授权
- macOS: 系统设置 -> 通知 -> Chrome
- Windows: 系统通知设置

## 下一步

- 查看 [TEST.md](TEST.md) 了解详细测试步骤
- 查看 [README.md](README.md) 了解完整功能说明
- 开始使用：在LeetCode上做题，扩展会自动记录！

