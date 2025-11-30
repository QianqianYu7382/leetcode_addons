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

  // 提交状态跟踪
  let submissionInProgress = false;
  let lastSubmissionTime = 0;

  // 监听提交成功事件（事件驱动，无轮询）
  function listenForSubmission() {
    // 方法1: 监听提交按钮点击，跟踪提交状态
    setupSubmitButtonListener();

    // 方法2: 监听提交结果区域的DOM变化（更精确）
    setupResultObserver();

    // 方法3: 监听URL变化（提交后会跳转到提交详情页）
    setupUrlChangeListener();

    // 方法4: 拦截fetch请求（如果LeetCode使用fetch API提交）
    interceptSubmissionRequests();
  }

  // 监听提交按钮点击
  function setupSubmitButtonListener() {
    // 使用事件委托监听所有可能的提交按钮
    document.addEventListener('click', (e) => {
      const target = e.target;
      const button = target.closest('button');
      
      if (!button) return;
      
      const buttonText = button.textContent?.toLowerCase() || '';
      const buttonClasses = button.className?.toLowerCase() || '';
      
      // 检测提交按钮（Submit、提交等）
      if (
        buttonText.includes('submit') || 
        buttonText.includes('提交') ||
        buttonClasses.includes('submit') ||
        button.getAttribute('data-cy')?.includes('submit')
      ) {
        console.log('[LeetCode提醒] 检测到提交按钮点击');
        submissionInProgress = true;
        lastSubmissionTime = Date.now();
        
        // 启动结果监听（提交后会在结果区域显示）
        console.log('[LeetCode提醒] 将在2秒后开始检查提交结果');
        setTimeout(() => {
          checkSubmissionResult();
        }, 2000); // 2秒后开始检查结果
        
        // 也立即启动一次检查（有些情况下结果很快返回）
        setTimeout(() => {
          checkSubmissionResult();
        }, 500);
      }
    }, true); // 使用捕获阶段确保能捕获到
  }

  // 精确监听提交结果区域
  function setupResultObserver() {
    // 查找提交结果容器（多种可能的选择器）
    const resultSelectors = [
      '[class*="result"]',
      '[class*="submission"]',
      '[data-cy="submission-result"]',
      '[id*="result"]',
      '[id*="submission"]'
    ];

    let resultContainer = null;
    
    // 尝试找到结果容器
    const findResultContainer = () => {
      for (const selector of resultSelectors) {
        const container = document.querySelector(selector);
        if (container) {
          resultContainer = container;
          return container;
        }
      }
      // 如果找不到，就监听整个编辑器区域或者代码执行区域
      return document.querySelector('[class*="editor"]') || 
             document.querySelector('[class*="code"]') ||
             document.body;
    };

    resultContainer = findResultContainer();

    // 创建精确的MutationObserver，只观察文本和属性变化
    const observer = new MutationObserver((mutations) => {
      if (!submissionInProgress) return; // 只在提交进行中时检查
      
      for (const mutation of mutations) {
        // 检查新增的文本节点
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) { // 元素节点
              const text = node.textContent?.trim() || '';
              const innerHTML = node.innerHTML || '';
              
              // 检查是否包含Accepted或成功提示
              if (text.match(/Accepted|通过|Success/i) || innerHTML.includes('Accepted') || innerHTML.includes('通过')) {
                // 进一步确认是提交结果（不是其他地方的文本）
                const isResult = text.includes('执行用时') || 
                               text.includes('runtime') || 
                               text.includes('ms') ||
                               text.includes('内存') ||
                               text.includes('memory') ||
                               node.closest('[class*="result"]') ||
                               node.closest('[class*="submission"]') ||
                               node.closest('[class*="execute"]');
                
                if (isResult || (text.includes('Accepted') && text.length < 500)) {
                  console.log('[LeetCode提醒] DOM观察器检测到提交成功结果:', node);
                  handleSubmissionSuccess();
                  submissionInProgress = false;
                  return;
                }
              }
            } else if (node.nodeType === 3) { // 文本节点
              const text = node.textContent?.trim() || '';
              if (text.match(/Accepted|通过/i) && text.length < 200) {
                // 检查父元素是否在结果区域
                const parent = node.parentElement;
                if (parent) {
                  const isInResultArea = parent.closest('[class*="result"]') ||
                                       parent.closest('[class*="submission"]') ||
                                       parent.closest('[class*="execute"]');
                  if (isInResultArea || parent.textContent?.includes('执行用时')) {
                    console.log('[LeetCode提醒] DOM观察器检测到成功文本节点:', text);
                    handleSubmissionSuccess();
                    submissionInProgress = false;
                    return;
                  }
                }
              }
            }
          }
        }
        
        // 检查属性变化（比如data-state变为success）
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          const dataState = target.getAttribute('data-state');
          const className = target.className || '';
          
          if (dataState === 'success' ||
              className.includes('accepted') ||
              className.includes('success')) {
            // 确认是在结果区域
            const isInResultArea = target.closest('[class*="result"]') ||
                                 target.closest('[class*="submission"]') ||
                                 target.closest('[class*="execute"]');
            if (isInResultArea || target.textContent?.includes('Accepted')) {
              console.log('[LeetCode提醒] DOM观察器检测到成功状态属性:', target);
              handleSubmissionSuccess();
              submissionInProgress = false;
              return;
            }
          }
        }
        
        // 检查字符数据变化（文本内容变化）
        if (mutation.type === 'characterData') {
          const text = mutation.target.textContent?.trim() || '';
          if (text.match(/Accepted|通过/i)) {
            const parent = mutation.target.parentElement;
            if (parent && (
              parent.closest('[class*="result"]') ||
              parent.closest('[class*="submission"]') ||
              parent.textContent?.includes('执行用时')
            )) {
              console.log('[LeetCode提醒] DOM观察器检测到字符数据变化:', text);
              handleSubmissionSuccess();
              submissionInProgress = false;
              return;
            }
          }
        }
      }
    });

    // 观察结果容器
    if (resultContainer) {
      observer.observe(resultContainer, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['data-state', 'class']
      });
      
      // 定期重新查找结果容器（页面可能动态加载）
      setInterval(() => {
        const newContainer = findResultContainer();
        if (newContainer !== resultContainer) {
          observer.disconnect();
          resultContainer = newContainer;
          if (resultContainer) {
            observer.observe(resultContainer, {
              childList: true,
              subtree: true,
              characterData: true,
              attributes: true,
              attributeFilter: ['data-state', 'class']
            });
          }
        }
      }, 10000); // 每10秒检查一次容器（很低的频率，仅用于适应页面结构变化）
    } else {
      // 如果找不到结果容器，回退到监听body（但只在提交进行中时）
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: false,
        attributes: true,
        attributeFilter: ['data-state', 'class']
      });
    }
  }

  // 检查提交结果（一次性检查，非轮询）
  function checkSubmissionResult() {
    if (!submissionInProgress) {
      console.log('[LeetCode提醒] 检查结果但提交未进行中');
      return;
    }
    
    console.log('[LeetCode提醒] 开始检查提交结果...');
    
    // 查找Accepted相关的元素
    const acceptedSelectors = [
      '[class*="accepted"]',
      '[class*="success"]',
      '[data-state="success"]',
      '[class*="result"]',
      '*[aria-label*="Accepted"]',
      '*[aria-label*="通过"]'
    ];
    
    let acceptedElements = [];
    for (const selector of acceptedSelectors) {
      try {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          acceptedElements = [...acceptedElements, ...Array.from(found)];
        }
      } catch (e) {
        // 忽略选择器错误
      }
    }
    
    // 也检查页面文本
    const bodyText = document.body.textContent || '';
    const hasAcceptedText = bodyText.match(/Accepted|通过|Success/i);
    
    console.log(`[LeetCode提醒] 找到${acceptedElements.length}个可能元素，页面文本包含Accepted: ${!!hasAcceptedText}`);
    
    if (acceptedElements.length > 0) {
      // 检查文本内容确认是提交结果
      for (const el of acceptedElements) {
        const text = el.textContent || '';
        const innerHTML = el.innerHTML || '';
        
        // 检查是否是提交结果（排除其他包含Accepted的文本）
        if ((text.includes('Accepted') || text.includes('通过')) && 
            (text.includes('执行用时') || text.includes('runtime') || 
             text.includes('ms') || text.includes('内存') ||
             el.closest('[class*="result"]') || el.closest('[class*="submission"]'))) {
          console.log('[LeetCode提醒] 检测到提交成功元素:', el);
          handleSubmissionSuccess();
          submissionInProgress = false;
          return;
        }
      }
    }
    
    // 如果页面文本包含Accepted，再深入检查
    if (hasAcceptedText) {
      // 查找包含Accepted的父元素，看是否在结果区域
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const text = el.textContent?.trim() || '';
        if (text.includes('Accepted') || text.includes('通过')) {
          // 检查是否在结果容器中
          const isInResultArea = el.closest('[class*="result"]') || 
                                 el.closest('[class*="submission"]') ||
                                 el.closest('[class*="execute"]');
          if (isInResultArea || (text.includes('执行用时') || text.includes('runtime'))) {
            console.log('[LeetCode提醒] 在结果区域检测到Accepted:', el);
            handleSubmissionSuccess();
            submissionInProgress = false;
            return;
          }
        }
      }
    }
    
    // 如果还没找到，再等一会儿（最多等待15秒）
    const elapsed = Date.now() - lastSubmissionTime;
    if (elapsed < 15000) {
      console.log(`[LeetCode提醒] 未找到结果，${Math.round((15000 - elapsed) / 1000)}秒后重试...`);
      setTimeout(() => checkSubmissionResult(), 2000); // 每2秒检查一次
    } else {
      console.log('[LeetCode提醒] 超时未检测到提交结果');
      submissionInProgress = false;
    }
  }

  // 监听URL变化
  function setupUrlChangeListener() {
    let lastUrl = location.href;
    
    // 使用popstate监听浏览器前进后退
    window.addEventListener('popstate', () => {
      if (location.href.includes('/submissions/')) {
        checkUrlSubmission();
      }
    });
    
    // 监听pushState和replaceState（SPA路由变化）
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
      originalPushState.apply(history, arguments);
      if (location.href.includes('/submissions/') && location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(() => checkUrlSubmission(), 1000);
      }
    };
    
    history.replaceState = function() {
      originalReplaceState.apply(history, arguments);
      if (location.href.includes('/submissions/') && location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(() => checkUrlSubmission(), 1000);
      }
    };
  }

  function checkUrlSubmission() {
    // 检查提交详情页是否显示Accepted
    setTimeout(() => {
      const acceptedText = document.body.textContent || '';
      if (acceptedText.includes('Accepted') || acceptedText.includes('通过')) {
        console.log('[LeetCode提醒] 从提交详情页检测到成功');
        handleSubmissionSuccess();
      }
    }, 1500);
  }

  // 拦截网络请求（如果LeetCode使用API提交）
  function interceptSubmissionRequests() {
    // 拦截fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      const urlString = typeof url === 'string' ? url : (url?.url || '');
      
      if (urlString.includes('submit') || urlString.includes('submissions')) {
        console.log('[LeetCode提醒] 拦截到fetch提交请求:', urlString);
        submissionInProgress = true;
        lastSubmissionTime = Date.now();
        
        return originalFetch.apply(this, args).then(response => {
          // 克隆response以便读取
          const clonedResponse = response.clone();
          clonedResponse.json().then(data => {
            console.log('[LeetCode提醒] fetch响应数据:', data);
            // 检查多种可能的成功状态字段
            if (data && (
              data.status_msg === 'Accepted' || 
              data.status_msg === '通过' ||
              data.state === 'SUCCESS' ||
              (data.submission_id && (data.status_msg || '').toLowerCase().includes('accept'))
            )) {
              console.log('[LeetCode提醒] 从fetch API响应检测到成功:', data);
              handleSubmissionSuccess();
              submissionInProgress = false;
            }
          }).catch(err => {
            console.log('[LeetCode提醒] fetch响应解析失败（可能是非JSON）:', err);
          });
          
          return response;
        }).catch(err => {
          console.log('[LeetCode提醒] fetch请求失败:', err);
          submissionInProgress = false;
        });
      }
      return originalFetch.apply(this, args);
    };
    
    // 拦截XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._url = url;
      return originalOpen.apply(this, [method, url, ...rest]);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      const url = this._url;
      if (url && typeof url === 'string' && (url.includes('submit') || url.includes('submissions'))) {
        console.log('[LeetCode提醒] 拦截到XHR提交请求:', url);
        submissionInProgress = true;
        lastSubmissionTime = Date.now();
        
        this.addEventListener('load', function() {
          try {
            const responseText = this.responseText;
            console.log('[LeetCode提醒] XHR响应:', responseText.substring(0, 200));
            const response = JSON.parse(responseText);
            // 检查多种可能的成功状态字段
            if (response && (
              response.status_msg === 'Accepted' || 
              response.status_msg === '通过' ||
              response.state === 'SUCCESS' ||
              (response.submission_id && (response.status_msg || '').toLowerCase().includes('accept'))
            )) {
              console.log('[LeetCode提醒] 从XHR响应检测到成功:', response);
              handleSubmissionSuccess();
              submissionInProgress = false;
            }
          } catch (e) {
            console.log('[LeetCode提醒] XHR响应解析失败:', e);
          }
        });
        
        this.addEventListener('error', function() {
          console.log('[LeetCode提醒] XHR请求失败');
          submissionInProgress = false;
        });
      }
      return originalSend.apply(this, args);
    };
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


