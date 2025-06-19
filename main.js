// main.js

      // ===== 常量定义 =====
      const MORSE_CODE_MAP = {
          'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',
          'E': '.',     'F': '..-.',  'G': '--.',   'H': '....',
          'I': '..',    'J': '.---',  'K': '-.-',   'L': '.-..',
          'M': '--',    'N': '-.',    'O': '---',   'P': '.--.',
          'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
          'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',
          'Y': '-.--',  'Z': '--..',
          '@': '..-..', 
          '0': '-----', '1': '.----', '2': '..---', '3': '...--',
          '4': '....-', '5': '.....', '6': '-....', '7': '--...',
          '8': '---..', '9': '----.',
          "'": '.--.-.',
          '?': '..--..',
          '/': '-..-.',
          ".": '.-.-.-',
          ',': '--..--',
          '[CALL]': '..--',
          '[END]': '.-.-.'
      };
      
      // 摩尔斯码相关常量
      const DOT_DURATION_MULTIPLIER = 1200; // PARIS约定中的点时长乘数
      const DOT_TO_DASH_RATIO = 3;          // 划是点的3倍长
      const CHAR_SPACING_RATIO = 3;         // 字符间隔是点的3倍长
      const WORD_SPACING_RATIO = 7;         // 单词间隔是点的7倍长
      
      // 速度设置常量
      const MIN_CODE_SPEED = 15;            // 最小码速
      const MAX_CODE_SPEED = 60;            // 最大码速
      const DEFAULT_CODE_SPEED = 45;        // 默认码速
      const SPEED_WPM_RATIO = 4;            // 码速与WPM的转换比率
      
      // 随机报文常量
      const MIN_GROUP_COUNT = 1;            // 最少乱码组数
      const MAX_GROUP_COUNT = 50;           // 最多乱码组数
      const DEFAULT_GROUP_COUNT = 10;       // 默认乱码组数
      const MIN_GROUP_LENGTH = 3;           // 每组最少字符数
      const MAX_GROUP_LENGTH = 6;           // 每组最多字符数
      
      // 灯光模式常量
      const LIGHT_MODE_SCREEN = 'screen';
      const LIGHT_MODE_FLASHLIGHT = 'flashlight';
      
      // 字符集常量
      const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ@';
      const NUMBERS = '0123456789';
      const ALPHANUMERIC = LETTERS + NUMBERS;
      
      // ===== 获取DOM元素 =====
      const inputText = document.getElementById('inputText');
      const playButton = document.getElementById('playButton');
      const resetButton = document.getElementById('resetButton');
      const morseCircle = document.getElementById('morseCircle');
      const speedValue = document.getElementById('speedValue');
      const callButton = document.getElementById('callButton');
      const endButton = document.getElementById('endButton');
      const randomButton = document.getElementById('randomButton');
      const randomDialog = document.getElementById('randomDialog');
      const decreaseBtn = document.getElementById('decreaseBtn');
      const increaseBtn = document.getElementById('increaseBtn');
      const groupCount = document.getElementById('groupCount');
      const letterBtn = document.getElementById('letterBtn');
      const mixedBtn = document.getElementById('mixedBtn');
      const cancelBtn = document.getElementById('cancelBtn');
      const settingsButton = document.getElementById('settingsButton');
      const settingsDialog = document.getElementById('settingsDialog');
      const speedDecreaseBtn = document.getElementById('speedDecreaseBtn');
      const speedIncreaseBtn = document.getElementById('speedIncreaseBtn');
      const speedInput = document.getElementById('speedInput');
      const settingsConfirmBtn = document.getElementById('settingsConfirmBtn');
      const settingsCancelBtn = document.getElementById('settingsCancelBtn');
      const lightModeSelect = document.getElementById('lightModeSelect');
      const lightModeValue = document.getElementById('lightModeValue');
  
      // ===== 全局状态变量 =====
      let animationSequence = [];           // 动画序列
      let animationTimer = null;            // 动画定时器
      let isAnimationPlaying = false;       // 动画播放状态
      let codeSpeed = DEFAULT_CODE_SPEED;   // 当前码速
      let wordsPerMinute = codeSpeed / SPEED_WPM_RATIO; // WPM值
      let lightMode = LIGHT_MODE_SCREEN;    // 灯光模式
      let wakeLock = null;                  // 屏幕唤醒锁
      let flashlightStream = null;          // 闪光灯媒体流
  
      // ===== 功能函数 =====
      
      /**
       * 更新码速显示
       */
      function updateSpeedDisplay() {
          speedValue.textContent = codeSpeed;
      }
      
      /**
       * 更新灯光模式显示
       */
      function updateLightModeDisplay() {
          lightModeValue.textContent = lightMode === LIGHT_MODE_SCREEN ? '屏幕' : '闪光灯';
      }
      
      /**
       * 验证整数输入
       * @param {HTMLInputElement} inputElement - 输入元素
       * @param {number} min - 最小值
       * @param {number} max - 最大值
       * @param {number} defaultValue - 默认值
       */
      function validateInt(inputElement, min, max, defaultValue) {
          let value = parseInt(inputElement.value);
          
          if (isNaN(value)) {
              inputElement.value = defaultValue;
          } else if (value < min) {
              inputElement.value = min;
          } else if (value > max) {
              inputElement.value = max;
          }
      }
      
      /**
       * 请求屏幕唤醒锁
       */
      async function requestWakeLock() {
          try {
              if ('wakeLock' in navigator) {
                  wakeLock = await navigator.wakeLock.request('screen');
                  console.log('屏幕唤醒锁已激活');
                  
                  wakeLock.addEventListener('release', () => {
                      console.log('屏幕唤醒锁已释放');
                  });
              }
          } catch (err) {
              console.error(`无法获取屏幕唤醒锁: ${err.message}`);
          }
      }
      
      /**
       * 释放屏幕唤醒锁
       */
      function releaseWakeLock() {
          if (wakeLock !== null) {
              wakeLock.release();
              wakeLock = null;
          }
      }
      
      /**
       * 计算点信号时长（毫秒）基于WPM
       * @returns {number} 点信号持续时间
       */
      function calculateDotDuration() {
          return DOT_DURATION_MULTIPLIER / wordsPerMinute;
      }
      
      /**
       * 验证输入文本
       * @returns {string|null} 验证后的输入文本
       */
      function validateInput() {
          const text = inputText.value.trim();
          return text || null;
      }
      
      /**
       * 处理单个字符或符号
       * @param {string} char - 要处理的字符
       * @param {Array} sequence - 动画序列数组
       */
      function processCharacter(char, sequence) {
          const dotDuration = calculateDotDuration();
          
          // 处理空格（多个连续空格只算一个）
          if (char === ' ') {
              sequence.push({ state: 'dark', duration: WORD_SPACING_RATIO * dotDuration });
              return;
          }
          
          // 获取字符对应的莫尔斯码
          let morse = MORSE_CODE_MAP[char] || MORSE_CODE_MAP[char.toUpperCase()];
          
          if (morse) {
              // 处理莫尔斯码
              for (let i = 0; i < morse.length; i++) {
                  const signal = morse[i];
                  if (signal === '.') {
                      sequence.push({ state: 'light', duration: dotDuration });
                  } else if (signal === '-') {
                      sequence.push({ state: 'light', duration: DOT_TO_DASH_RATIO * dotDuration });
                  }
                  
                  // 信号间间隔（除最后一个信号外）
                  if (i < morse.length - 1) {
                      sequence.push({ state: 'dark', duration: dotDuration });
                  }
              }
              
              // 字符后间隔
              sequence.push({ state: 'dark', duration: CHAR_SPACING_RATIO * dotDuration });
          }
      }
      
      /**
       * 生成动画序列
       * @param {string} text - 输入文本
       * @returns {Array} 生成的动画序列
       */
      function generateAnimation(text) {
          const sequence = [];
          let i = 0;
          
          while (i < text.length) {
              if (text[i] === '[') {
                  const endIndex = text.indexOf(']', i);
                  if (endIndex !== -1) {
                      const symbol = text.substring(i, endIndex + 1);
                      processCharacter(symbol, sequence);
                      i = endIndex + 1;
                      continue;
                  }
              }
              
              processCharacter(text[i], sequence);
              i++;
          }
          
          return sequence;
      }
      
      /**
       * 初始化闪光灯
       * @returns {Promise<boolean>} 是否初始化成功
       */
      async function initializeFlashlight() {
          try {
              const constraints = {
                  video: {
                      facingMode: 'environment',
                      advanced: [{ torch: false }]
                  }
              };
              
              const stream = await navigator.mediaDevices.getUserMedia(constraints);
              const track = stream.getVideoTracks()[0];
              
              if (!track.getCapabilities().torch) {
                  throw new Error('Flashlight not available');
              }
              
              // 保存流引用以便后续控制
              flashlightStream = stream;
              return true;
          } catch (error) {
              console.error('闪光灯初始化错误:', error);
              return false;
          }
      }
      
      /**
       * 控制闪光灯状态
       * @param {string} state - 状态 ('light' 或 'dark')
       */
      async function controlFlashlight(state) {
          try {
              if (lightMode !== LIGHT_MODE_FLASHLIGHT) return;
              
              if (!flashlightStream) {
                  await initializeFlashlight();
              }
              
              const track = flashlightStream.getVideoTracks()[0];
              if (track) {
                  await track.applyConstraints({ advanced: [{ torch: state === 'light' }] });
              }
          } catch (error) {
              console.error('闪光灯控制错误:', error);
              lightMode = LIGHT_MODE_SCREEN;
              updateLightModeDisplay();
              alert('闪光灯控制失败，已切换为屏幕模式');
          }
      }
      
      /**
       * 播放动画序列
       */
      function playAnimation() {
          if (isAnimationPlaying || !animationSequence.length) return;
          
          isAnimationPlaying = true;
          playButton.textContent = '停止';
          playButton.style.backgroundColor = '#c62828';
          inputText.disabled = true;
          let index = 0;
          
          function processNext() {
              if (index >= animationSequence.length) {
                  isAnimationPlaying = false;
                  playButton.textContent = '播放';
                  playButton.style.backgroundColor = '#2E7D32';
                  inputText.disabled = false;
                  // 确保灯光关闭
                  if (lightMode === LIGHT_MODE_SCREEN) {
                      morseCircle.style.backgroundColor = 'black';
                  } else {
                      controlFlashlight('dark');
                  }
                  return;
              }
              
              const action = animationSequence[index++];
              const { state, duration } = action;
              
              // 根据模式控制灯光
              if (lightMode === LIGHT_MODE_SCREEN) {
                  morseCircle.style.backgroundColor = state === 'light' ? 'white' : 'black';
              } else {
                  controlFlashlight(state);
              }
              
              animationTimer = setTimeout(processNext, duration);
          }
          
          // 开始前确保初始状态
          if (lightMode === LIGHT_MODE_SCREEN) {
              morseCircle.style.backgroundColor = 'black';
          } else {
              controlFlashlight('dark');
          }
          
          processNext();
      }
      
      /**
       * 插入勤务符号
       * @param {string} symbol - 勤务符号
       */
      function insertSpecialSymbol(symbol) {
          const cursorPos = inputText.selectionStart;
          const text = inputText.value;
          
          let newText = '';
          let newCursorPos = cursorPos;
          
          if (symbol === '[CALL]') {
              newText = text.substring(0, cursorPos) + '[CALL]' + text.substring(cursorPos);
              newCursorPos = cursorPos + 6;
              if (newText[newCursorPos] !== ' ') {
                  newText = newText.substring(0, newCursorPos) + ' ' + newText.substring(newCursorPos);
                  newCursorPos++;
              }
          } else if (symbol === '[END]') {
              let prefix = '';
              if (cursorPos > 0 && text[cursorPos - 1] !== ' ') {
                  prefix = ' ';
              }
              newText = text.substring(0, cursorPos) + prefix + '[END]' + text.substring(cursorPos);
              newCursorPos = cursorPos + prefix.length + 5;
          }
          
          inputText.value = newText;
          inputText.focus();
          inputText.setSelectionRange(newCursorPos, newCursorPos);
      }
      
      /**
       * 生成字码
       * @param {number} length - 生成长度
       * @returns {string} 随机字母字符串
       */
      function generateRandomLetters(length) {
          let result = '';
          for (let i = 0; i < length; i++) {
              result += LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
          }
          return result;
      }
      
      /**
       * 生成混码
       * @param {number} length - 生成长度
       * @returns {string} 随机混合字符串
       */
      function generateRandomMixed(length) {
          let result = '';
          for (let i = 0; i < length; i++) {
              result += ALPHANUMERIC.charAt(Math.floor(Math.random() * ALPHANUMERIC.length));
          }
          return result;
      }
      
      /**
       * 生成乱码组
       * @param {string} type - 类型（'letter'或'mixed'）
       * @returns {string} 生成的随机报文
       */
      function generateRandomGroups(type) {
          const count = parseInt(groupCount.value);
          let result = '[CALL] ';
          
          for (let i = 0; i < count; i++) {
              // 随机生成长度在MIN_GROUP_LENGTH到MAX_GROUP_LENGTH之间的组
              const groupLength = Math.floor(Math.random() * (MAX_GROUP_LENGTH - MIN_GROUP_LENGTH + 1)) + MIN_GROUP_LENGTH;
              let group = type === 'letter' ? 
                  generateRandomLetters(groupLength) : 
                  generateRandomMixed(groupLength);
              result += group + ' ';
          }
          
          return result.trim() + ' [END]';
      }
      
      /**
       * 插入乱码组
       * @param {string} type - 类型（'letter'或'mixed'）
       */
      function insertRandomGroups(type) {
          const randomGroups = generateRandomGroups(type);
          inputText.value = randomGroups;
          inputText.focus();
          inputText.setSelectionRange(randomGroups.length, randomGroups.length);
          randomDialog.style.display = 'none';
          inputText.blur();
      }
      
      // ===== 事件监听器 =====
      
      // 当页面再次可见时重新请求唤醒锁
      document.addEventListener('visibilitychange', async () => {
          if (document.visibilityState === 'visible') {
              await requestWakeLock();
          }
      });
      
      // 强制输入框内容大写
      inputText.addEventListener('input', function() {
          this.value = this.value.toUpperCase();
      });
      
      // 播放按钮点击事件
      playButton.addEventListener('click', function() {
          if (isAnimationPlaying) {
              clearTimeout(animationTimer);
              isAnimationPlaying = false;
              this.textContent = '播放';
              this.style.backgroundColor = '#2E7D32';
              inputText.disabled = false;
              
              // 确保灯光关闭
              if (lightMode === LIGHT_MODE_SCREEN) {
                  morseCircle.style.backgroundColor = 'black';
              } else {
                  controlFlashlight('dark');
              }
              return;
          }
          
          const text = validateInput();
          if (!text) return;
          
          animationSequence = generateAnimation(text);
          morseCircle.style.backgroundColor = 'black';
          playAnimation();
      });
      
      // 清空按钮点击事件
      resetButton.addEventListener('click', function() {
          clearTimeout(animationTimer);
          isAnimationPlaying = false;
          playButton.textContent = '播放';
          playButton.style.backgroundColor = '#2E7D32';
          inputText.disabled = false;
          inputText.value = '';
          inputText.focus();
          morseCircle.style.backgroundColor = 'black';
      });
      
      // 勤务符号按钮事件
      callButton.addEventListener('click', () => insertSpecialSymbol('[CALL]'));
      endButton.addEventListener('click', () => {
          insertSpecialSymbol('[END]');
          inputText.blur();
      });
      
      // 乱码对话框控制
      randomButton.addEventListener('click', () => randomDialog.style.display = 'flex');
      cancelBtn.addEventListener('click', () => randomDialog.style.display = 'none');
      
      // 乱码组数控制
      decreaseBtn.addEventListener('click', function() {
          groupCount.value = Math.max(parseInt(groupCount.value) - 1, MIN_GROUP_COUNT);
          validateInt(groupCount, MIN_GROUP_COUNT, MAX_GROUP_COUNT, DEFAULT_GROUP_COUNT);
      });
      
      increaseBtn.addEventListener('click', function() {
          groupCount.value = Math.min(parseInt(groupCount.value) + 1, MAX_GROUP_COUNT);
          validateInt(groupCount, MIN_GROUP_COUNT, MAX_GROUP_COUNT, DEFAULT_GROUP_COUNT);
      });
      
      // 乱码组数范围验证
      groupCount.addEventListener('blur', () => {
          validateInt(groupCount, MIN_GROUP_COUNT, MAX_GROUP_COUNT, DEFAULT_GROUP_COUNT);
      });
      
      // 乱码生成按钮事件
      letterBtn.addEventListener('click', () => insertRandomGroups('letter'));
      mixedBtn.addEventListener('click', () => insertRandomGroups('mixed'));
      
      // 码速设置功能
      // 打开码速设置对话框
      settingsButton.addEventListener('click', () => {
          speedInput.value = codeSpeed;
          lightModeSelect.value = lightMode;
          settingsDialog.style.display = 'flex';
      });
      
      // 码速减按钮
      speedDecreaseBtn.addEventListener('click', () => {
          speedInput.value = Math.max(parseInt(speedInput.value) - 1, MIN_CODE_SPEED);
          validateInt(speedInput, MIN_CODE_SPEED, MAX_CODE_SPEED, DEFAULT_CODE_SPEED);
      });
      
      // 码速加按钮
      speedIncreaseBtn.addEventListener('click', () => {
          speedInput.value = Math.min(parseInt(speedInput.value) + 1, MAX_CODE_SPEED);
          validateInt(speedInput, MIN_CODE_SPEED, MAX_CODE_SPEED, DEFAULT_CODE_SPEED);
      });
      
      // 码速范围验证
      speedInput.addEventListener('blur', () => {
          validateInt(speedInput, MIN_CODE_SPEED, MAX_CODE_SPEED, DEFAULT_CODE_SPEED);
      });
      
      // 设置确认按钮
      settingsConfirmBtn.addEventListener('click', async () => {
          const newSpeed = parseInt(speedInput.value);
          const newLightMode = lightModeSelect.value;
          
          // 处理闪光灯模式切换
          if (newLightMode === LIGHT_MODE_FLASHLIGHT && lightMode !== LIGHT_MODE_FLASHLIGHT) {
              const success = await initializeFlashlight();
              console.log(`闪光灯初始化状态：${success}`);
              if (!success) {
                  lightMode = LIGHT_MODE_SCREEN;
                  lightModeSelect.value = LIGHT_MODE_SCREEN;
                  alert('无法访问闪光灯，已切换为屏幕模式');
                  updateLightModeDisplay();
                  settingsDialog.style.display = 'none';
                  return;
              }
          } else if (newLightMode !== LIGHT_MODE_FLASHLIGHT && lightMode === LIGHT_MODE_FLASHLIGHT && flashlightStream) {
              flashlightStream.getTracks().forEach(t => t.stop());
              flashlightStream = null;
          }
          
          lightMode = newLightMode;
        codeSpeed = newSpeed;
        wordsPerMinute = codeSpeed / SPEED_WPM_RATIO;
        updateSpeedDisplay();
        settingsDialog.style.display = 'none';
        updateLightModeDisplay();
    });
    
    // 设置页面取消按钮
    settingsCancelBtn.addEventListener('click', () => {
        settingsDialog.style.display = 'none';
    });
    
    // 页面关闭前清理资源
    window.addEventListener('beforeunload', () => {
        // 释放唤醒锁
        releaseWakeLock();
        
        // 释放闪光灯资源
        if (flashlightStream) {
            flashlightStream.getTracks().forEach(t => t.stop());
            flashlightStream = null;
        }
        
        // 确保屏幕灯光关闭
        morseCircle.style.backgroundColor = 'black';
    });
    
    // ===== 初始化 =====
    updateSpeedDisplay();
    updateLightModeDisplay();
    
    // 页面加载时请求屏幕唤醒锁
    window.addEventListener('load', () => {
        requestWakeLock();
    });
