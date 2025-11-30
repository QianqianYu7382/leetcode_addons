// Popup脚本
// 处理popup界面的交互和数据显示

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

function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = date - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `已过期 ${Math.abs(diffDays)} 天`;
  } else if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '明天';
  } else {
    return `${diffDays} 天后`;
  }
}

function getDifficultyClass(difficulty) {
  const d = difficulty?.toLowerCase() || 'unknown';
  if (d.includes('easy')) return 'easy';
  if (d.includes('medium')) return 'medium';
  if (d.includes('hard')) return 'hard';
  return 'easy';
}

async function loadProblems() {
  const result = await chrome.storage.local.get(['problems']);
  const problems = result.problems || {};
  return problems;
}

function checkReviewDue(problem) {
  const today = new Date().toISOString().split('T')[0];
  const nextReviewDate = getNextReviewDate(problem.firstSolved, problem.reviewCount);
  return nextReviewDate <= today;
}

async function renderProblems(tab = 'due') {
  const problems = await loadProblems();
  const problemsArray = Object.entries(problems).map(([key, problem]) => ({
    key,
    ...problem
  }));

  const content = document.getElementById('content');
  
  if (problemsArray.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <div>还没有做题记录</div>
        <div style="margin-top: 10px; font-size: 11px;">去LeetCode做题后会自动记录</div>
      </div>
    `;
    return;
  }

  // 更新统计
  const dueProblems = problemsArray.filter(p => checkReviewDue(p));
  const totalReviewCount = problemsArray.reduce((sum, p) => sum + (p.reviewCount || 0), 0);
  
  document.getElementById('totalProblems').textContent = problemsArray.length;
  document.getElementById('dueReviews').textContent = dueProblems.length;
  document.getElementById('reviewCount').textContent = totalReviewCount;

  // 过滤题目
  let filteredProblems = problemsArray;
  if (tab === 'due') {
    filteredProblems = dueProblems;
  }

  // 排序：待复习的按日期排序，全部题目按最后解决日期排序
  if (tab === 'due') {
    filteredProblems.sort((a, b) => {
      const dateA = new Date(getNextReviewDate(a.firstSolved, a.reviewCount));
      const dateB = new Date(getNextReviewDate(b.firstSolved, b.reviewCount));
      return dateA - dateB;
    });
  } else {
    filteredProblems.sort((a, b) => {
      const dateA = new Date(a.lastSolved);
      const dateB = new Date(b.lastSolved);
      return dateB - dateA;
    });
  }

  if (filteredProblems.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <div>${tab === 'due' ? '太棒了！没有待复习的题目' : '暂无题目'}</div>
      </div>
    `;
    return;
  }

  content.innerHTML = filteredProblems.map(problem => {
    const nextReviewDate = getNextReviewDate(problem.firstSolved, problem.reviewCount);
    const isDue = checkReviewDue(problem);
    const difficultyClass = getDifficultyClass(problem.difficulty);
    
    return `
      <div class="problem-item" data-key="${problem.key}">
        <div class="problem-header">
          <div class="problem-title">${problem.title}</div>
          <span class="difficulty ${difficultyClass}">${problem.difficulty || 'easy'}</span>
        </div>
        <div class="problem-info">
          <div>
            <div>首次解决: ${problem.firstSolved}</div>
            <div>最后解决: ${problem.lastSolved}</div>
            ${problem.reviewCount > 0 ? `<div>已复习 ${problem.reviewCount} 次</div>` : ''}
          </div>
        </div>
        ${isDue ? `
          <div style="margin-top: 8px;">
            <span class="review-badge">需要复习</span>
            <button class="review-button" data-action="review" data-key="${problem.key}">
              标记为已复习
            </button>
          </div>
        ` : `
          <div style="margin-top: 8px; font-size: 11px; color: #666;">
            下次复习: <span class="next-review-date">${formatDate(nextReviewDate)}</span>
          </div>
        `}
      </div>
    `;
  }).join('');

  // 添加事件监听
  content.querySelectorAll('[data-action="review"]').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      const key = button.getAttribute('data-key');
      await markAsReviewed(key);
      renderProblems(tab);
    });
  });

  // 点击题目打开链接
  content.querySelectorAll('.problem-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        const key = item.getAttribute('data-key');
        const problem = problems[key];
        if (problem && problem.url) {
          chrome.tabs.create({ url: problem.url });
        }
      }
    });
  });
}

async function markAsReviewed(problemKey) {
  // 通知background脚本
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'MARK_REVIEWED',
      problemKey
    }, (response) => {
      resolve(response);
    });
  });
}

// 标签切换
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderProblems(tab.getAttribute('data-tab'));
  });
});

// 初始化
renderProblems('due');


