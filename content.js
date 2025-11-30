// LeetCode页面内容脚本
// 监听用户提交代码的行为，记录做题记录

(function() {
  'use strict';

  // 获取当前题目信息
  function getProblemInfo() {
    const problemTitle = document.querySelector('[data-cy="question-title"]')?.textContent?.trim() ||
                        document.querySelector('div[class*="question-title"]')?.textContent?.trim() ||
                        document.querySelector('h3')?.textContent?.trim();
    
    // 尝试从URL获取题目编号
    const urlMatch = window.location.pathname.match(/\/problems\/([^/]+)/);
    const problemSlug = urlMatch ? urlMatch[1] : null;
    
    // 尝试获取题目编号（LeetCode中通常有题号）
    let problemNumber = null;
    const numberMatch = problemTitle?.match(/^(\d+)\./);
    if (numberMatch) {
      problemNumber = numberMatch[1];
    }

    return {
      title: problemTitle || 'Unknown',
      slug: problemSlug || 'unknown',
      number: problemNumber,
      url: window.location.href,
      difficulty: getDifficulty()
    };
  }

  function getDifficulty() {
    const difficultyElements = document.querySelectorAll('[diff]');
    if (difficultyElements.length > 0) {
      return difficultyElements[0].getAttribute('diff') || 'unknown';
    }
    
    const difficultyText = document.body.innerText.match(/(Easy|Medium|Hard)/i);
    return difficultyText ? difficultyText[0].toLowerCase() : 'unknown';
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

    // 方法3: 定期检查页面状态
    setInterval(() => {
      if (isSubmissionAccepted()) {
        handleSubmissionSuccess();
      }
    }, 3000);
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

  // 处理提交成功
  async function handleSubmissionSuccess() {
    const problemInfo = getProblemInfo();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 检查是否已经记录过今天的这道题
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    const problemKey = problemInfo.slug || problemInfo.title;
    
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
    }

    // 保存到存储
    await chrome.storage.local.set({ problems });
    
    // 通知background脚本更新提醒
    chrome.runtime.sendMessage({
      type: 'PROBLEM_SOLVED',
      problem: problems[problemKey]
    });

    // 显示确认提示
    showNotification('已记录: ' + problemInfo.title);
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


