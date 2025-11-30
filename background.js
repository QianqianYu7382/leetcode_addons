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

// 标记为完全掌握
async function markAsMastered(problemKey) {
  const result = await chrome.storage.local.get(['problems']);
  const problems = result.problems || {};
  
  if (problems[problemKey]) {
    problems[problemKey].mastered = true;
    problems[problemKey].masteredDate = new Date().toISOString().split('T')[0];
    await chrome.storage.local.set({ problems });
    console.log(`[LeetCode提醒] ${problems[problemKey].title} 已标记为完全掌握`);
  }
}

// 检查哪些题目需要复习
async function checkReviewDue() {
  const result = await chrome.storage.local.get(['problems']);
  const problems = result.problems || {};
  const today = new Date().toISOString().split('T')[0];
  
  const dueProblems = [];
  
  for (const [key, problem] of Object.entries(problems)) {
    // 跳过已完全掌握的题目
    if (problem.mastered) {
      continue;
    }
    
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
  
  if (message.type === 'MARK_MASTERED') {
    markAsMastered(message.problemKey).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// 计算应该进行到第几次复习
function calculateRequiredReviewCount(firstSolvedDate) {
  const today = new Date();
  const firstDate = new Date(firstSolvedDate);
  const daysSinceFirstSolved = Math.floor((today - firstDate) / (1000 * 60 * 60 * 24));
  
  // 累计天数：1, 4, 11, 26, 56, 116...
  let cumulativeDays = 0;
  let requiredCount = 0;
  
  for (let i = 0; i < REVIEW_INTERVALS.length; i++) {
    cumulativeDays += REVIEW_INTERVALS[i];
    if (daysSinceFirstSolved >= cumulativeDays) {
      requiredCount = i + 1;
    } else {
      break;
    }
  }
  
  // 如果超过所有阶段，计算后续复习（每30天一次）
  if (requiredCount >= REVIEW_INTERVALS.length) {
    const remainingDays = daysSinceFirstSolved - 56; // 56是前6次的总天数
    requiredCount = REVIEW_INTERVALS.length + Math.floor(remainingDays / 30);
  }
  
  return requiredCount;
}

// 标记为已复习
async function markAsReviewed(problemKey) {
  const result = await chrome.storage.local.get(['problems']);
  const problems = result.problems || {};
  
  if (problems[problemKey]) {
    const problem = problems[problemKey];
    const today = new Date().toISOString().split('T')[0];
    
    // 计算应该进行到第几次复习
    const requiredCount = calculateRequiredReviewCount(problem.firstSolved);
    const currentCount = problem.reviewCount || 0;
    
    // 如果当前复习次数小于应该的次数，一次性补齐
    if (currentCount < requiredCount) {
      const missedCount = requiredCount - currentCount;
      problem.reviewCount = requiredCount;
      problem.lastReviewed = today;
      
      if (!problem.reviewDates) {
        problem.reviewDates = [];
      }
      
      // 添加所有遗漏的复习日期（可以用估算日期，或者都用今天）
      for (let i = 0; i < missedCount; i++) {
        problem.reviewDates.push(today);
      }
      
      console.log(`[LeetCode提醒] ${problem.title}: 从第${currentCount}次复习直接更新到第${requiredCount}次复习（补上${missedCount}次）`);
    } else {
      // 如果已经达到或超过应该的次数，正常增加一次
      problem.reviewCount += 1;
      problem.lastReviewed = today;
      
      if (!problem.reviewDates) {
        problem.reviewDates = [];
      }
      problem.reviewDates.push(today);
      
      console.log(`[LeetCode提醒] ${problem.title}: 已复习 ${problem.reviewCount} 次`);
    }
    
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


