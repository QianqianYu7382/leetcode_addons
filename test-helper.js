// 测试辅助脚本
// 在Chrome扩展的Service Worker Console中运行这些函数来测试功能

// 1. 添加测试数据
async function addTestData() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

  const testData = {
    problems: {
      "two-sum": {
        title: "1. Two Sum",
        slug: "two-sum",
        number: "1",
        url: "https://leetcode.cn/problems/two-sum/",
        difficulty: "easy",
        firstSolved: yesterdayStr, // 昨天解决，今天应该复习
        lastSolved: yesterdayStr,
        reviewDates: [],
        reviewCount: 0
      },
      "add-two-numbers": {
        title: "2. Add Two Numbers",
        slug: "add-two-numbers",
        number: "2",
        url: "https://leetcode.cn/problems/add-two-numbers/",
        difficulty: "medium",
        firstSolved: threeDaysAgoStr, // 3天前，已复习1次，应该需要第2次复习
        lastSolved: threeDaysAgoStr,
        reviewDates: [yesterdayStr],
        reviewCount: 1
      },
      "longest-substring": {
        title: "3. Longest Substring Without Repeating Characters",
        slug: "longest-substring-without-repeating-characters",
        number: "3",
        url: "https://leetcode.cn/problems/longest-substring-without-repeating-characters/",
        difficulty: "medium",
        firstSolved: today, // 今天刚解决，不需要复习
        lastSolved: today,
        reviewDates: [],
        reviewCount: 0
      },
      "median-of-arrays": {
        title: "4. Median of Two Sorted Arrays",
        slug: "median-of-two-sorted-arrays",
        number: "4",
        url: "https://leetcode.cn/problems/median-of-two-sorted-arrays/",
        difficulty: "hard",
        firstSolved: today,
        lastSolved: today,
        reviewDates: [],
        reviewCount: 0
      }
    }
  };

  await chrome.storage.local.set(testData);
  console.log("✅ 测试数据已添加！包含4个题目");
  console.log("  - Two Sum: 昨天解决，今天需要复习");
  console.log("  - Add Two Numbers: 3天前解决，已复习1次，需要第2次复习");
  console.log("  - Longest Substring: 今天解决，不需要复习");
  console.log("  - Median of Arrays: 今天解决，不需要复习");
  
  return testData;
}

// 2. 查看所有存储的数据
async function viewAllData() {
  const data = await chrome.storage.local.get(null);
  console.log("📦 所有存储的数据:", JSON.stringify(data, null, 2));
  return data;
}

// 3. 查看待复习的题目
async function viewDueProblems() {
  const data = await chrome.storage.local.get(['problems']);
  const problems = data.problems || {};
  const today = new Date().toISOString().split('T')[0];
  
  const REVIEW_INTERVALS = [1, 3, 7, 15, 30, 60];
  
  function getNextReviewDate(firstSolvedDate, reviewCount) {
    if (reviewCount >= REVIEW_INTERVALS.length) {
      const lastDate = new Date(firstSolvedDate);
      lastDate.setDate(lastDate.getDate() + REVIEW_INTERVALS[REVIEW_INTERVALS.length - 1] * (reviewCount - REVIEW_INTERVALS.length + 1));
      return lastDate.toISOString().split('T')[0];
    }
    const firstDate = new Date(firstSolvedDate);
    const daysToAdd = REVIEW_INTERVALS.slice(0, reviewCount + 1).reduce((sum, interval) => sum + interval, 0);
    firstDate.setDate(firstDate.getDate() + daysToAdd);
    return firstDate.toISOString().split('T')[0];
  }
  
  const dueProblems = [];
  for (const [key, problem] of Object.entries(problems)) {
    const nextReviewDate = getNextReviewDate(problem.firstSolved, problem.reviewCount);
    if (nextReviewDate <= today) {
      dueProblems.push({
        ...problem,
        key,
        nextReviewDate
      });
    }
  }
  
  console.log("📋 待复习题目:", dueProblems);
  return dueProblems;
}

// 4. 手动触发复习检查并发送通知
async function triggerReviewCheck() {
  const dueProblems = await viewDueProblems();
  
  if (dueProblems.length === 0) {
    console.log("✅ 没有需要复习的题目");
    return;
  }
  
  for (const problem of dueProblems) {
    const notificationId = `test-review-${problem.key}-${Date.now()}`;
    await chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'LeetCode复习提醒 (测试)',
      message: `该复习 "${problem.title}" 了！今天是复习的第${problem.reviewCount + 1}次。`,
      priority: 2
    });
    console.log(`📬 已发送通知: ${problem.title}`);
  }
}

// 5. 清除所有数据
async function clearAllData() {
  await chrome.storage.local.clear();
  console.log("🗑️ 所有数据已清除");
}

// 6. 模拟今天解决了一道新题
async function simulateNewProblem() {
  const today = new Date().toISOString().split('T')[0];
  const data = await chrome.storage.local.get(['problems']);
  const problems = data.problems || {};
  
  const newProblem = {
    "test-problem": {
      title: "999. Test Problem",
      slug: "test-problem",
      number: "999",
      url: "https://leetcode.cn/problems/test-problem/",
      difficulty: "easy",
      firstSolved: today,
      lastSolved: today,
      reviewDates: [],
      reviewCount: 0
    }
  };
  
  Object.assign(problems, newProblem);
  await chrome.storage.local.set({ problems });
  console.log("✅ 已添加新的测试题目");
}

// 7. 测试通知功能
async function testNotification() {
  await chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title: '测试通知',
    message: '如果你看到这条消息，说明通知功能正常工作！',
    priority: 2
  });
  console.log("📬 测试通知已发送");
}

// 使用说明
console.log(`
🧪 LeetCode复习提醒扩展 - 测试工具

可用函数：
1. addTestData()        - 添加测试数据（包含4个题目）
2. viewAllData()        - 查看所有存储的数据
3. viewDueProblems()    - 查看待复习的题目
4. triggerReviewCheck() - 手动触发复习检查并发送通知
5. clearAllData()       - 清除所有数据
6. simulateNewProblem() - 模拟今天解决了一道新题
7. testNotification()   - 测试通知功能

快速开始：
  运行 addTestData() 添加测试数据
  然后打开扩展popup查看效果
  运行 triggerReviewCheck() 测试通知功能
`);

