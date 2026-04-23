'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { CreditsDisplay } from '@/components/chat/CreditsDisplay';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { ScreenshotCapture } from '@/components/screenshot/ScreenshotCapture';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useCustomerSettings } from '@/hooks/useCustomerSettings';
import { useDeviceType } from '@/hooks/useDeviceType';
import { Download, Camera, FileUp } from 'lucide-react';
import { FHIRImportModal } from '@/components/fhir/FHIRImportModal';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  fileUrl?: string;
  fileName?: string;
  createdAt?: Date;
}

export default function ChatPage() {
  const { t } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [showFHIRImport, setShowFHIRImport] = useState(false);
  const [fhirImportData, setFhirImportData] = useState<{ summary: string; rawJson: string } | null>(null);
  const { settings, loading: settingsLoading } = useCustomerSettings();
  const { isMobile } = useDeviceType();

  // ???批 UI 憿舐內
  const shouldShowScreenshot = isMobile ? false : (settings?.show_screenshot ?? false);
  const shouldShowFunction = settings?.show_function_selector ?? false;
  const shouldShowWorkload = settings?.show_workload_selector ?? false;
  const autoUploadedRounds = useRef<Set<string>>(new Set());
  const uploadSerialNumber = useRef<number>(1);
  const conversationRoundCounter = useRef<number>(0);

  // 瑼Ｘ?臬?閬＊蝷?Onboarding
  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('conversationId');
    if (id) {
      loadConversation(id);
    }
  }, []);

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/chat?conversationId=${id}`);
      const data = await res.json();

      if (data.success && data.data.messages) {
        setMessages(
          data.data.messages.map((msg: any) => ({
            ...msg,
            createdAt: new Date(msg.created_at),
          }))
        );
        setConversationId(id);
          autoUploadedRounds.current.clear();
        uploadSerialNumber.current = 1;
        conversationRoundCounter.current = 0;
      }
    } catch (error) {
      console.error('頛撠店?航炊:', error);
    }
  };

  const handleSend = async (
    message: string,
    options: {
      workloadLevel: 'instant' | 'basic' | 'standard' | 'professional';
      selectedFunction?: string;
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      modelName?: string;
    }
  ) => {
    setScreenshotFile(null);

    // 瘛餃?雿輻???臬 UI
    const userMessage: Message = {
      role: 'user',
      content: message,
      fileName: options.fileName,
      fileUrl: options.fileUrl,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const requestBody = {
        message,
        workloadLevel: options.workloadLevel,
        selectedFunction: options.selectedFunction,
        conversationId: conversationId,
        fileUrl: options.fileUrl,
        fileName: options.fileName,
        fileType: options.fileType,
        modelName: options.modelName,
      };
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });


      const data = await res.json();

      if (data.success) {
        // ?湔撠店 ID嚗???啣?閰梧?
        const finalConversationId = conversationId || data.data.conversationId;
        if (!conversationId) {
          setConversationId(data.data.conversationId);
          window.history.pushState(
            {},
            '',
            `/chat?conversationId=${data.data.conversationId}`
          );
          // ?啣?閰望??蔭銝餈質馱
          autoUploadedRounds.current.clear();
          uploadSerialNumber.current = 1;
          conversationRoundCounter.current = 0;
        }

        // ?湔 Credits嚗???API 餈?鈭?
        if (typeof data.data.creditsAfter === 'number') {
          setUserCredits(data.data.creditsAfter);
        }

        // 瘛餃? AI ??
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.data.message.content,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        conversationRoundCounter.current += 1;
        const roundKey = `${finalConversationId}-${conversationRoundCounter.current}`;
        
        // 撱園?瑁?隞亦Ⅱ靽??臬歇靽??啗??澈
        setTimeout(() => {
          autoSaveLog(finalConversationId, roundKey);
        }, 500);
      } else {
        alert(data.error || t('chat.sendFailed'));
        setMessages((prev) => prev.slice(0, -1));
      }
    } catch (error: any) {
      console.error('?潮??舫隤?', error);
      alert(t('common.errorNetwork'));
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ?芸?銝撠店閮?嚗?暺銵?銝＊蝷箸?蝷綽?
   */
  const autoSaveLog = async (currentConversationId: string, roundKey: string) => {
    if (autoUploadedRounds.current.has(roundKey)) {
      console.log('[auto-save-log] 撌脖??喲?嚗歲??', roundKey);
      return;
    }

    try {
      console.log('[auto-save-log] ???芸?銝撠店閮?:', {
        conversationId: currentConversationId,
        roundKey,
        serialNumber: uploadSerialNumber.current,
      });

      const res = await fetch('/api/chat/save-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: currentConversationId,
          serialNumber: uploadSerialNumber.current,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // 璅??箏歇銝
        autoUploadedRounds.current.add(roundKey);
        uploadSerialNumber.current += 1;
        
        console.log('[auto-save-log] ?芸?銝??:', {
          filename: data.data.filename,
          url: data.data.url,
          messageCount: data.data.messageCount,
          roundKey,
        });
      } else {
        console.error('[auto-save-log] ?芸?銝憭望?:', data.error);
        // ??憭望?嚗?敶梢?冽擃?
      }
    } catch (error: any) {
      console.error('[auto-save-log] ?芸?銝?航炊:', {
        error: error.message,
        roundKey,
      });
      // ??憭望?嚗?敶梢?冽擃?
    }
  };

  /**
   * ??銝?撠店閮?嚗＊蝷箸?蝷綽?
   */
  const handleDownloadLog = async () => {

    if (!conversationId) {
      alert(t('chat.startConversation'));
      return;
    }

    setIsSavingLog(true);
    try {

      const res = await fetch('/api/chat/save-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          serialNumber: uploadSerialNumber.current,
        }),
      });


      const data = await res.json();


      if (data.success) {
        // Download the file
        const downloadUrl = data.data.url;
        const filename = data.data.filename;
        const messageCount = data.data.messageCount || 0;
        

        console.log('[save-log] 銝??:', {
          filename,
          url: downloadUrl,
          storagePath: data.data.storagePath,
          messageCount,
        });

        // ?湔摨???        uploadSerialNumber.current += 1;

        // ?岫銝?瑼?
        try {

          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          
          alert(`${t('chat.downloadSuccess')}\n\n${filename}\n${messageCount}`);
        } catch (downloadError) {
          console.error('[save-log] 銝?憭望?:', downloadError);
          alert(`${t('chat.downloadSuccessR2')}\n\n${filename}\n${messageCount}\n\n${downloadUrl}`);
        }
      } else {
        console.error('[save-log] API 餈??航炊:', data);
        alert(`${t('chat.uploadFailed')}: ${data.error || t('chat.uploadErrorUnknown')}`);
      }
    } catch (error: any) {
      console.error('[save-log] 蝬脰楝?航炊:', { error: error.message, stack: error.stack });
      alert(`${t('common.errorNetwork')} ${error.message || ''}`);
    } finally {
      setIsSavingLog(false);
    }
  };

  const handleScreenshot = () => {
    setShowScreenshot(true);
  };

  const handleScreenshotCapture = (file: File) => {
    setScreenshotFile(file);
    setShowScreenshot(false);
  };

  const handleScreenshotCancel = () => {
    setShowScreenshot(false);
  };

  const handleFHIRImport = (data: { summary: string; rawJson: string }) => {
    setFhirImportData(data);
    setShowFHIRImport(false);
  };

  return (
    <>
      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
      {showScreenshot && (
        <ScreenshotCapture 
          onCapture={handleScreenshotCapture}
          onCancel={handleScreenshotCancel}
        />
      )}
      <FHIRImportModal
        isOpen={showFHIRImport}
        onClose={() => setShowFHIRImport(false)}
        onImport={handleFHIRImport}
      />
      <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col px-4">
        {/* Header with download button and credits */}
        <div className="flex justify-between items-center p-4 border-b border-paper-gray100">
          <h1 className="text-xl font-semibold heading-serif text-paper-gray900">{t('chat.title')}</h1>
          <div className="flex items-center gap-4">
            {shouldShowScreenshot && (
              <button
                onClick={handleScreenshot}
                className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
                title={t('chat.screenshot')}
              >
                <Camera size={18} />
                {t('chat.screenshot')}
              </button>
            )}
            <button
              onClick={() => setShowFHIRImport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-medical-purple text-white rounded-lg hover:bg-medical-purple/90 transition-colors"
              title={t('fhir.importButton')}
            >
              <FileUp size={18} />
              {t('fhir.importButton')}
            </button>
            <CreditsDisplay
              initialCredits={userCredits}
              onCreditsUpdate={setUserCredits}
            />
            <button
              onClick={handleDownloadLog}
              disabled={isSavingLog || !conversationId}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              {isSavingLog ? t('chat.saving') : t('chat.downloadLog')}
            </button>
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSend={handleSend}
            userCredits={userCredits}
            externalFile={screenshotFile}
            externalMessage={fhirImportData?.summary || null}
            onExternalMessageConsumed={() => setFhirImportData(null)}
            showFunctionSelector={shouldShowFunction}
            showWorkloadSelector={shouldShowWorkload}
          />
        </div>
      </div>
    </>
  );
}



