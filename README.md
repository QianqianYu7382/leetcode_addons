# LeetCode复习提醒 Chrome扩展

一个自动记录LeetCode做题记录，并根据艾宾浩斯遗忘曲线提醒复习的Chrome浏览器扩展。

## 功能特性

- ✅ 自动检测并记录你在LeetCode上完成的题目
- ✅ 根据艾宾浩斯遗忘曲线智能安排复习时间
- ✅ 在复习日期到来时发送浏览器通知提醒
- ✅ 查看所有做题记录和复习计划
- ✅ 标记已复习，更新复习进度

## 记忆曲线

复习间隔（从首次解决日期开始计算）：
- 第1次复习：1天后
- 第2次复习：3天后
- 第3次复习：7天后
- 第4次复习：15天后
- 第5次复习：30天后
- 第6次复习：60天后
- 之后每30天提醒一次

## 安装方法

1. **准备图标文件**（必需）
   - 创建或下载三个图标文件：`icon16.png`、`icon48.png`、`icon128.png`
   - 可以使用在线工具生成：https://www.favicon-generator.org/
   - 图标可以是LeetCode logo、书本图标或任何合适的图标

2. **加载扩展**
   - 打开Chrome浏览器，访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择本项目文件夹

3. **授权权限**
   - 确保允许存储、通知和访问LeetCode网站的权限

详细安装说明请参考 [INSTALL.md](INSTALL.md)

## 测试方法

详细测试步骤请参考 [TEST.md](TEST.md)

**快速测试：**
1. 加载扩展后，打开Service Worker Console（`chrome://extensions/` -> 扩展详情 -> Service worker）
2. 复制 `test-helper.js` 的内容到Console
3. 运行 `addTestData()` 添加测试数据
4. 点击扩展图标查看popup界面
5. 运行 `triggerReviewCheck()` 测试通知功能

## 使用方法

1. **自动记录**：在LeetCode网站（leetcode.cn 或 leetcode.com）上成功提交代码后，扩展会自动记录该题目
2. **查看记录**：点击浏览器工具栏中的扩展图标，查看所有做题记录
3. **复习提醒**：当复习日期到来时，扩展会自动发送浏览器通知
4. **标记复习**：在待复习列表中找到题目，点击"标记为已复习"按钮

## 支持的网站

- https://leetcode.cn
- https://leetcode.com

## 注意事项

1. 需要允许扩展的通知权限才能收到复习提醒
2. 数据存储在本地，不会上传到任何服务器
3. 清除浏览器数据会删除所有记录

## 文件结构

```
leetcode_addons/
├── manifest.json      # 扩展配置文件
├── content.js         # 内容脚本（在LeetCode页面运行）
├── background.js      # 后台服务脚本
├── popup.html         # 扩展弹窗界面
├── popup.js           # 弹窗脚本
└── README.md          # 说明文档
```

## 开发说明

这是一个Chrome Extension Manifest V3项目，使用以下技术：
- Content Scripts：在LeetCode页面中运行，检测提交成功
- Service Worker：后台处理数据存储和通知
- Chrome Storage API：本地存储做题记录
- Chrome Notifications API：发送复习提醒

## 许可证

MIT License


