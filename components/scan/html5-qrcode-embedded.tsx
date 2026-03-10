'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Html5QrcodeEmbeddedProps {
  onScan: (decodedText: string) => void;
  onError?: (errorMessage: string) => void;
  fullscreen?: boolean;
}

export function Html5QrcodeEmbedded({ onScan, onError, fullscreen }: Html5QrcodeEmbeddedProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'html5-qrcode-scanner';
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: fullscreen ? undefined : { width: 250, height: 250 }
          },
          (decodedText) => {
            onScan(decodedText);
          },
          (errorMessage) => {
            onError?.(errorMessage);
          }
        );
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : '스캐너 초기화 중 오류가 발생했습니다.'
        );
      }
    };

    void init();

    return () => {
      if (scannerRef.current) {
        Promise.resolve(scannerRef.current.stop()).catch(() => undefined);
        Promise.resolve(scannerRef.current.clear() as unknown).catch(() => undefined);
      }
    };
  }, [fullscreen, onScan, onError]);

  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      // html5-qrcode 내부의 스트림에 직접 제약 조건 적용
      // 일부 기기에서만 동작
      // @ts-expect-error private access
      const stream: MediaStream | undefined = scannerRef.current._localMediaStream;
      const track = stream?.getVideoTracks()[0];
      if (!track) return;
      await track.applyConstraints({
        advanced: [{ torch: !torchOn }]
      } as unknown as MediaTrackConstraints);
      setTorchOn((prev) => !prev);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative h-full w-full">
      <div
        id={containerId}
        className={fullscreen ? 'h-full w-full bg-black' : 'aspect-square w-full bg-black'}
      />
      {fullscreen && (
        <button
          type="button"
          onClick={toggleTorch}
          className="absolute bottom-6 right-6 rounded-full bg-white/10 px-4 py-2 text-xs text-white backdrop-blur-md"
        >
          {torchOn ? '조명 끄기' : '조명 켜기'}
        </button>
      )}
    </div>
  );
}

