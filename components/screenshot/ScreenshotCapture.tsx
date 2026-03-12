'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useLocale } from '@/components/providers/LocaleProvider';

interface ScreenshotCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

interface Rectangle {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function ScreenshotCapture({ onCapture, onCancel }: ScreenshotCaptureProps) {
  const { t } = useLocale();
  const [isSelecting, setIsSelecting] = useState(false);
  const [rectangle, setRectangle] = useState<Rectangle | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== overlayRef.current) return;
    
    setIsSelecting(true);
    setRectangle({
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !rectangle) return;

    setRectangle({
      ...rectangle,
      endX: e.clientX,
      endY: e.clientY,
    });
  };

  const handleMouseUp = async () => {
    if (!isSelecting || !rectangle) return;

    setIsSelecting(false);

    const width = Math.abs(rectangle.endX - rectangle.startX);
    const height = Math.abs(rectangle.endY - rectangle.startY);

    // 檢查選取區域是否過小
    if (width < 10 || height < 10) {
      alert(t('chat.screenshotTooSmall'));
      onCancel();
      return;
    }

    try {
      // 截取整個頁面（使用 window.devicePixelRatio 提升解析度）
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      } as any);

      // 計算裁切區域（canvas 已使用 devicePixelRatio）
      const scale = window.devicePixelRatio || 1;
      const x = Math.min(rectangle.startX, rectangle.endX) * scale;
      const y = Math.min(rectangle.startY, rectangle.endY) * scale;
      const w = width * scale;
      const h = height * scale;

      // 建立新 canvas 並裁切
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = w;
      croppedCanvas.height = h;
      const ctx = croppedCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('無法建立 canvas context');
      }

      ctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

      // 轉換為 Blob 並建立 File
      croppedCanvas.toBlob((blob) => {
        if (!blob) {
          alert(t('chat.screenshotFailed'));
          onCancel();
          return;
        }

        const file = new File([blob], `screenshot-${Date.now()}.png`, {
          type: 'image/png',
        });

        onCapture(file);
      }, 'image/png');

    } catch (error) {
      console.error('截圖錯誤:', error);
      alert(t('chat.screenshotFailed'));
      onCancel();
    }
  };

  const getSelectionStyle = () => {
    if (!rectangle) return {};

    const left = Math.min(rectangle.startX, rectangle.endX);
    const top = Math.min(rectangle.startY, rectangle.endY);
    const width = Math.abs(rectangle.endX - rectangle.startX);
    const height = Math.abs(rectangle.endY - rectangle.startY);

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] cursor-crosshair"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 提示文字 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-6 py-3 rounded-lg shadow-lg text-gray-800 text-sm font-medium">
        {t('chat.screenshotHint')}
      </div>

      {/* 選取框 */}
      {rectangle && (
        <div
          className="absolute border-2 border-dashed border-white"
          style={{
            ...getSelectionStyle(),
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}
        />
      )}
    </div>
  );
}
