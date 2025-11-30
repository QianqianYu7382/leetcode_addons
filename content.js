// LeetCode页面内容脚本
// 监听用户提交代码的行为，记录做题记录

(function() {
  'use strict';

  // 获取当前题目信息
  function getProblemInfo() {
    // 多种选择器尝试获取题目标题
    let problemTitle = null;
    
    // 尝试各种可能的题目标题选择器
    const titleSelectors = [
      '[data-cy="question-title"]',
      '[data-cy="question-title-text"]',
      'div[class*="question-title"]',
      'h3[class*="title"]',
      'h4[class*="title"]',
      '.css-v3d350',
      '.css-1j7rsvg',
      'a[href*="/problems/"]',
      '.text-title-large',
      '.text-xl',
      'h1, h2, h3'
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text.length > 0 && text.length < 200) { // 过滤掉过长的文本
          problemTitle = text;
          break;
        }
      }
    }
    
    // 如果还是没找到，尝试从页面中查找包含题号的文本
    if (!problemTitle) {
      const allText = document.body.innerText || '';
      const titleMatch = allText.match(/(\d+\.\s*[^\n]+?)(?:\n|$)/);
      if (titleMatch) {
        problemTitle = titleMatch[1].trim();
      }
    }
    
    // 尝试从URL获取题目slug
    const urlMatch = window.location.pathname.match(/\/problems\/([^/]+)/);
    const problemSlug = urlMatch ? urlMatch[1] : null;
    
    // 如果标题还是为空，使用slug作为fallback
    if (!problemTitle && problemSlug) {
      // 将slug转换为可读的标题格式：two-sum -> Two Sum
      problemTitle = problemSlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // 尝试获取题目编号
    let problemNumber = null;
    if (problemTitle) {
      const numberMatch = problemTitle.match(/^(\d+)\./);
      if (numberMatch) {
        problemNumber = numberMatch[1];
      }
    }
    
    // 最后的fallback
    const finalTitle = problemTitle || (problemSlug ? `${problemSlug} (LeetCode)` : 'Unknown Problem');

    return {
      title: finalTitle,
      slug: problemSlug || 'unknown',
      number: problemNumber,
      url: window.location.href,
      difficulty: getDifficulty()
    };
  }

  function getDifficulty() {
    // 尝试多种方式获取难度
    const difficultySelectors = [
      '[diff]',
      '[data-difficulty]',
      '.css-dcmtd5', // LeetCode常用难度样式
      '.difficulty-label',
      '[class*="difficulty"]'
    ];
    
    for (const selector of difficultySelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        const diff = elements[0].getAttribute('diff') || 
                    elements[0].getAttribute('data-difficulty') ||
                    elements[0].textContent?.trim()?.toLowerCase();
        if (diff && ['easy', 'medium', 'hard'].includes(diff.toLowerCase())) {
          return diff.toLowerCase();
        }
      }
    }
    
    // 从文本中查找
    const difficultyText = document.body.innerText?.match(/(Easy|Medium|Hard)/i);
    if (difficultyText) {
      return difficultyText[0].toLowerCase();
    }
    
    return 'easy'; // 默认为easy
  }

  // 监听提交成功事件
  function listenForSubmission() {
    // 方法1: 监听成功提示
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const text = node.textContent || '';
            
            // 检测提交成功的各种提示
            if (
              text.includes('Accepted') || 
              text.includes('通过') ||
              text.includes('Success') ||
              (text.includes('运行成功') && text.includes('执行用时'))
            ) {
              handleSubmissionSuccess();
            }

            // 检查是否有成功图标或状态
            const successIndicators = node.querySelectorAll ? node.querySelectorAll(
              '[class*="success"], [class*="accepted"], [class*="check"], [data-state="success"]'
            ) : [];
            if (successIndicators.length > 0) {
              handleSubmissionSuccess();
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 方法2: 监听URL变化（提交后会跳转到提交详情页）
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl && url.includes('/submissions/')) {
        setTimeout(() => {
          if (isSubmissionAccepted()) {
            handleSubmissionSuccess();
          }
        }, 1000);
        lastUrl = url;
      }
    }).observe(document, { subtree: true, childList: true });

    // 方法3: 定期检查页面状态（降低频率，避免过于频繁）
    setInterval(() => {
      if (isSubmissionAccepted()) {
        handleSubmissionSuccess();
      }
    }, 5000); // 改为5秒检查一次
  }

  function isSubmissionAccepted() {
    const acceptedText = document.body.textContent || '';
    return (
      acceptedText.includes('Accepted') || 
      acceptedText.includes('通过') ||
      (document.querySelector('[data-state="success"]') !== null) ||
      (document.querySelector('[class*="accepted"]') !== null)
    );
  }

  // 防抖：避免重复触发
  let lastRecordedTime = 0;
  let lastRecordedKey = null;
  const DEBOUNCE_MS = 5000; // 5秒内不重复记录同一题目

  // 处理提交成功
  async function handleSubmissionSuccess() {
    const now = Date.now();
    const problemInfo = getProblemInfo();
    const problemKey = problemInfo.slug || problemInfo.title;
    
    // 防抖检查：如果5秒内已经记录过同一题目，跳过
    if (lastRecordedKey === problemKey && (now - lastRecordedTime) < DEBOUNCE_MS) {
      console.log('[LeetCode提醒] 跳过重复记录:', problemKey);
      return;
    }
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 检查是否已经记录过今天的这道题
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    
    // 检查今天是否已经记录过
    if (problems[problemKey] && problems[problemKey].lastSolved === today) {
      console.log('[LeetCode提醒] 今天已记录过:', problemKey);
      return;
    }
    
    if (!problems[problemKey]) {
      problems[problemKey] = {
        ...problemInfo,
        firstSolved: today,
        lastSolved: today,
        reviewDates: [],
        reviewCount: 0
      };
    } else {
      // 更新最后解决日期
      problems[problemKey].lastSolved = today;
      // 如果今天是第一次解决，更新firstSolved
      if (!problems[problemKey].firstSolved) {
        problems[problemKey].firstSolved = today;
      }
      // 更新题目信息（可能在另一个页面解决）
      problems[problemKey] = {
        ...problems[problemKey],
        ...problemInfo
      };
    }

    // 保存到存储
    await chrome.storage.local.set({ problems });
    
    // 更新防抖记录
    lastRecordedTime = now;
    lastRecordedKey = problemKey;
    
    // 通知background脚本更新提醒
    chrome.runtime.sendMessage({
      type: 'PROBLEM_SOLVED',
      problem: problems[problemKey]
    }).catch(err => {
      console.error('[LeetCode提醒] 发送消息失败:', err);
    });

    // 显示确认提示
    showNotification('已记录: ' + problemInfo.title);
    console.log('[LeetCode提醒] 成功记录题目:', problemInfo);
  }

  function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);

    // 添加动画样式
    if (!document.getElementById('leetcode-reminder-styles')) {
      const style = document.createElement('style');
      style.id = 'leetcode-reminder-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(400px); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', listenForSubmission);
  } else {
    listenForSubmission();
  }
})();


