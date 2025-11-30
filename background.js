// 背景服务脚本
// 处理数据存储、记忆曲线计算和提醒通知

// 记忆曲线间隔（天数）
const REVIEW_INTERVALS = [1, 3, 7, 15, 30, 60];

// 计算下次复习日期
function getNextReviewDate(firstSolvedDate, reviewCount) {
  if (reviewCount >= REVIEW_INTERVALS.length) {
    // 如果已经复习完所有阶段，每30天提醒一次
    const lastDate = new Date(firstSolvedDate);
    lastDate.setDate(lastDate.getDate() + REVIEW_INTERVALS[REVIEW_INTERVALS.length - 1] * (reviewCount - REVIEW_INTERVALS.length + 1));
    return lastDate.toISOString().split('T')[0];
  }
  
  const firstDate = new Date(firstSolvedDate);
  const daysToAdd = REVIEW_INTERVALS.slice(0, reviewCount + 1).reduce((sum, interval) => sum + interval, 0);
  firstDate.setDate(firstDate.getDate() + daysToAdd);
  return firstDate.toISOString().split('T')[0];
}

// 检查哪些题目需要复习
async function checkReviewDue() {
  const result = await chrome.storage.local.get(['problems']);
  const problems = result.problems || {};
  const today = new Date().toISOString().split('T')[0];
  
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
  
  return dueProblems;
}

// 发送通知
async function sendNotification(problem) {
  const notificationId = `review-${problem.key}-${Date.now()}`;
  
  await chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icon48.png',
    title: 'LeetCode复习提醒',
    message: `该复习 "${problem.title}" 了！今天是复习的第${problem.reviewCount + 1}次。`,
    priority: 2
  });
}

// 处理题目解决消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROBLEM_SOLVED') {
    // 题目已解决，更新提醒时间
    updateReviewSchedule(message.problem);
  }
  
  if (message.type === 'CHECK_REVIEW') {
    checkReviewDue().then(dueProblems => {
      sendResponse({ dueProblems });
    });
    return true; // 异步响应
  }
  
  if (message.type === 'MARK_REVIEWED') {
    markAsReviewed(message.problemKey).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// 标记为已复习
async function markAsReviewed(problemKey) {
  const result = await chrome.storage.local.get(['problems']);
  const problems = result.problems || {};
  
  if (problems[problemKey]) {
    problems[problemKey].reviewCount += 1;
    problems[problemKey].lastReviewed = new Date().toISOString().split('T')[0];
    if (!problems[problemKey].reviewDates) {
      problems[problemKey].reviewDates = [];
    }
    problems[problemKey].reviewDates.push(new Date().toISOString().split('T')[0]);
    
    await chrome.storage.local.set({ problems });
  }
}

// 更新复习计划
async function updateReviewSchedule(problem) {
  // 计划会在检查时动态计算，这里不需要额外操作
  // 但可以设置一个每日检查的闹钟
}

// 每日检查复习提醒
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyReviewCheck') {
    const dueProblems = await checkReviewDue();
    
    if (dueProblems.length > 0) {
      // 为每个需要复习的题目发送通知
      for (const problem of dueProblems) {
        await sendNotification(problem);
      }
    }
  }
});

// 创建每日检查闹钟
chrome.runtime.onInstalled.addListener(() => {
  // 立即检查一次
  checkReviewDue().then(dueProblems => {
    if (dueProblems.length > 0) {
      dueProblems.forEach(problem => sendNotification(problem));
    }
  });
  
  // 设置每日早上9点检查
  chrome.alarms.create('dailyReviewCheck', {
    delayInMinutes: 1, // 1分钟后首次检查
    periodInMinutes: 60 // 每小时检查一次
  });
});


