# 测试指南

## 1. 准备测试环境

### 创建测试图标（必需）

扩展需要图标才能加载。你可以：

**方法1：快速创建临时图标**
1. 访问 https://www.canva.com 或使用任何图片编辑器
2. 创建一个简单的图标（如书本📚或代码符号</>）
3. 导出为PNG格式，尺寸分别为：16x16, 48x48, 128x128
4. 保存到项目根目录，命名为 `icon16.png`, `icon48.png`, `icon128.png`

**方法2：使用命令行快速生成（如果安装了ImageMagick）**
```bash
# 创建一个简单的SVG然后转换为PNG（需要先安装ImageMagick）
# 或者直接从网上下载一个图标
```

**方法3：使用在线工具**
- 访问 https://www.favicon-generator.org/
- 上传一个图标，下载生成的多种尺寸版本

## 2. 加载扩展

1. **打开Chrome扩展管理页面**
   ```
   chrome://extensions/
   ```

2. **开启开发者模式**
   - 点击右上角的"开发者模式"开关

3. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择本项目文件夹 `leetcode_addons`

4. **检查是否加载成功**
   - 应该看到扩展出现在列表中
   - 如果没有图标文件，可能会显示警告，但不影响功能测试

## 3. 测试步骤

### 测试1：基础功能测试（无需真实提交）

**手动添加测试数据：**

1. **打开扩展弹窗**
   - 点击浏览器工具栏中的扩展图标

2. **打开开发者工具检查存储**
   - 在扩展管理页面，点击扩展的"服务工作者"或"检查视图：service worker"
   - 在Console中运行以下代码添加测试数据：

```javascript
// 在service worker的console中运行
const testData = {
  problems: {
    "two-sum": {
      title: "1. Two Sum",
      slug: "two-sum",
      number: "1",
      url: "https://leetcode.cn/problems/two-sum/",
      difficulty: "easy",
      firstSolved: "2024-01-15",
      lastSolved: "2024-01-15",
      reviewDates: [],
      reviewCount: 0
    },
    "add-two-numbers": {
      title: "2. Add Two Numbers",
      slug: "add-two-numbers", 
      number: "2",
      url: "https://leetcode.cn/problems/add-two-numbers/",
      difficulty: "medium",
      firstSolved: "2024-01-10",
      lastSolved: "2024-01-10",
      reviewDates: [],
      reviewCount: 1
    }
  }
};

chrome.storage.local.set(testData).then(() => {
  console.log("测试数据已添加");
});
```

3. **检查popup显示**
   - 关闭并重新打开扩展弹窗
   - 应该能看到两个测试题目
   - 查看统计数据是否正确

### 测试2：在LeetCode网站测试（真实环境）

1. **访问LeetCode**
   - 打开 https://leetcode.cn/problems/two-sum/ 或 https://leetcode.com/problems/two-sum/

2. **打开开发者工具**
   - 按 `F12` 或右键点击"检查"
   - 切换到 Console 标签
   - 切换到 Content Scripts 面板查看扩展日志

3. **提交代码**
   - 编写并提交一个解决方案
   - 当提交成功（显示Accepted）时，观察：
     - Console中是否有错误信息
     - 页面右上角是否出现绿色提示框"已记录: ..."

4. **验证记录**
   - 打开扩展弹窗
   - 应该能看到新记录的题目出现在列表中

### 测试3：复习提醒功能测试

**方法1：修改测试数据模拟过期**

在service worker console中运行：

```javascript
// 获取当前数据
chrome.storage.local.get(['problems']).then(result => {
  const problems = result.problems || {};
  
  // 修改第一个题目的日期为30天前
  const firstKey = Object.keys(problems)[0];
  if (firstKey) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    problems[firstKey].firstSolved = thirtyDaysAgo.toISOString().split('T')[0];
    problems[firstKey].reviewCount = 0;
    
    chrome.storage.local.set({ problems }).then(() => {
      console.log("已设置为30天前，应该触发复习提醒");
    });
  }
});
```

**方法2：直接触发检查**

```javascript
// 在background.js的service worker console中
checkReviewDue().then(dueProblems => {
  console.log("待复习题目:", dueProblems);
  if (dueProblems.length > 0) {
    dueProblems.forEach(problem => {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'LeetCode复习提醒',
        message: `该复习 "${problem.title}" 了！`
      });
    });
  }
});
```

### 测试4：标记为已复习

1. **添加一个需要复习的题目**（使用测试2的方法）
2. **打开扩展弹窗**
3. **在"待复习"标签中找到题目**
4. **点击"标记为已复习"按钮**
5. **验证**：
   - 题目从"待复习"列表消失
   - 题目在"全部题目"中的复习次数增加

### 测试5：通知权限测试

1. **检查权限**
   - 在 `chrome://extensions/` 中找到扩展
   - 确保通知权限已授权

2. **触发通知**
   - 使用测试3的方法触发一个复习提醒
   - 应该能看到浏览器通知

3. **如果通知未显示**
   - 检查系统通知设置（macOS: 系统设置 -> 通知 -> Chrome）
   - 检查Chrome的通知设置（chrome://settings/content/notifications）

## 4. 调试技巧

### 查看存储的数据

在service worker console中：
```javascript
chrome.storage.local.get(null).then(data => {
  console.log("所有存储的数据:", data);
});
```

### 清除所有数据

```javascript
chrome.storage.local.clear().then(() => {
  console.log("已清除所有数据");
});
```

### 查看Content Script日志

1. 在LeetCode页面打开开发者工具
2. 在Console中应该能看到扩展的日志（如果有错误）
3. 检查是否有网络请求被阻止

### 重新加载扩展

- 在 `chrome://extensions/` 中点击扩展的刷新按钮
- 或者修改代码后重新加载

## 5. 常见问题排查

**问题：扩展无法加载**
- ✅ 检查manifest.json格式是否正确
- ✅ 确保所有引用的文件都存在
- ✅ 查看扩展管理页面的错误信息

**问题：无法检测到提交**
- ✅ 确保在正确的LeetCode域名（leetcode.cn 或 leetcode.com）
- ✅ 检查Content Script是否已注入（开发者工具 -> Sources -> Content scripts）
- ✅ 刷新页面后重试

**问题：popup显示空白**
- ✅ 打开popup后，右键点击 -> 检查，查看Console错误
- ✅ 检查是否有权限问题

**问题：通知不显示**
- ✅ 确认已授权通知权限
- ✅ 检查系统通知设置
- ✅ 尝试手动触发通知测试

## 6. 测试 checklist

- [ ] 扩展可以成功加载
- [ ] popup可以正常打开并显示界面
- [ ] 在LeetCode上提交成功后能自动记录
- [ ] popup中能正确显示题目列表
- [ ] 统计数据（总题目、待复习、已复习）正确
- [ ] "待复习"和"全部题目"标签切换正常
- [ ] 标记为已复习功能正常
- [ ] 复习提醒通知能正常显示
- [ ] 点击题目能打开对应的LeetCode页面
- [ ] 数据持久化正常（刷新后数据还在）

## 快速测试脚本

### 使用测试辅助脚本

项目中包含了 `test-helper.js` 文件，你可以在Service Worker Console中使用它：

1. **打开Service Worker Console**
   - 访问 `chrome://extensions/`
   - 找到扩展，点击"检查视图：service worker"或"Service worker"链接

2. **加载测试工具**
   - 在Console中，复制并粘贴 `test-helper.js` 的内容
   - 或者直接运行以下命令：

```javascript
// 快速添加测试数据
addTestData();

// 查看所有数据
viewAllData();

// 查看待复习题目
viewDueProblems();

// 手动触发通知
triggerReviewCheck();

// 测试通知功能
testNotification();
```

### 完整测试流程示例

```javascript
// 1. 清除旧数据
clearAllData();

// 2. 添加测试数据
await addTestData();

// 3. 查看待复习题目
await viewDueProblems();

// 4. 打开popup查看效果（手动点击扩展图标）

// 5. 触发通知测试
await triggerReviewCheck();
```

