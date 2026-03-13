'use client';

import { useState, useEffect } from 'react';

/**
 * 自訂 Hook 用於偵測裝置類型
 * 使用螢幕寬度與 User-Agent 雙重判斷
 */
export function useDeviceType() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    /**
     * 檢查是否為行動裝置
     * 條件：螢幕寬度 < 768px OR User-Agent 包含行動裝置關鍵字
     */
    const checkDevice = () => {
      // 螢幕寬度檢查（Tailwind 的 md 斷點）
      const screenCheck = window.innerWidth < 768;
      
      // User-Agent 檢查
      const uaCheck = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(
        navigator.userAgent
      );
      
      // 兩者任一符合即視為行動裝置
      const mobileDetected = screenCheck || uaCheck;
      
      setIsMobile(mobileDetected);
      setIsLoading(false);
    };

    // 初始檢查
    checkDevice();

    // 監聽視窗大小改變
    window.addEventListener('resize', checkDevice);

    // 清理事件監聽器
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  return {
    isMobile,
    isDesktop: !isMobile,
    isLoading,
  };
}
