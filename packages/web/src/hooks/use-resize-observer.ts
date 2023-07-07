import { useCallback, useLayoutEffect, useState, useRef } from 'preact/hooks';
import ResizeObserver from 'resize-observer-polyfill';

export default function useResizeObserver() {
  const [entry, setEntry] = useState<ResizeObserverEntry | null>(null);
  const [node, setNode] = useState<HTMLElement | null>(null);
  const observer = useRef<ResizeObserver | null>(null);

  const disconnect = useCallback(() => {
    const { current } = observer;
    if (current) {
      current.disconnect();
    }
  }, []);

  const observe = useCallback(() => {
    observer.current = new ResizeObserver(([resizeObserverEntry]) => setEntry(resizeObserverEntry));
    if (node) {
      observer.current.observe(node);
    }
  }, [node]);

  useLayoutEffect(() => {
    observe();
    return () => disconnect();
  }, [disconnect, observe]);

  return {
    setNode,
    entry,
  };
}
