import { useEffect, useState } from 'react';

export default function useDemoMode() {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    try {
      const urlParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('demo') : null;
      const ls = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('demo') : null;
      const env = process.env.REACT_APP_DEMO === 'true';
      setIsDemo(Boolean(env || urlParam === '1' || ls === '1'));
    } catch (e) {
      setIsDemo(false);
    }
  }, []);

  const enterDemo = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('demo', '1');
      }
    } catch (e) {
      // ignore
    }
    setIsDemo(true);
  };

  const exitDemo = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('demo');
        window.localStorage.setItem('demoExited','1');
      }
    } catch (e) {
      // ignore
    }
    setIsDemo(false);
  };

  return { isDemo, enterDemo, exitDemo };
}
