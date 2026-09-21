import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

type Props = {
  text: string;
  children: React.ReactNode;
};

function useTooltipPortal(text: string, anchorRef: React.RefObject<View | null>, visible: boolean) {
  useEffect(() => {
    if (!visible || typeof document === 'undefined') return;
    const node = anchorRef.current as unknown as HTMLElement | null;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const top = rect.top + window.scrollY - 8;
    const left = rect.left + rect.width / 2;

    const container = document.createElement('div');
    container.style.cssText = `position:absolute;top:${top}px;left:${left}px;transform:translate(-50%,-100%);z-index:9999;pointer-events:none;min-width:120px`;

    const bubble = document.createElement('div');
    bubble.style.cssText = 'background:#0f172a;color:#fff;font-size:12px;padding:4px 12px;border-radius:8px;text-align:center;box-shadow:0 4px 6px rgba(0,0,0,.15)';
    bubble.textContent = text;

    const arrow = document.createElement('div');
    arrow.style.cssText = 'width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:4px solid #0f172a;margin:0 auto';

    container.appendChild(bubble);
    container.appendChild(arrow);
    document.body.appendChild(container);

    return () => { document.body.removeChild(container); };
  }, [text, anchorRef, visible]);
}

export function Tooltip({ text, children }: Props) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<View>(null);

  useTooltipPortal(text, anchorRef, visible);

  const show = useCallback(() => {
    timer.current = setTimeout(() => setVisible(true), 300);
  }, []);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setVisible(false);
  }, []);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View
      ref={anchorRef}
      // @ts-expect-error -- web-only mouse events
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
    </View>
  );
}
