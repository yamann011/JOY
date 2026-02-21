import { useEffect } from 'react';

export function useScreenshotProtection() {
  useEffect(() => {
    // Desktop: Print Screen engelleme
    const handleKeyDown = (e: KeyboardEvent) => {
      // Print Screen, Ctrl+P, Ctrl+Shift+S (Firefox screenshot)
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.key === 'p') ||
        (e.ctrlKey && e.shiftKey && e.key === 's') ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) // Mac screenshot
      ) {
        e.preventDefault();
        e.stopPropagation();
        
        // Ekranı karart
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: black;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          color: red;
          font-size: 2rem;
          font-weight: bold;
        `;
        overlay.textContent = '⚠️ EKRAN GÖRÜNTÜSÜ ENGELLENDİ';
        document.body.appendChild(overlay);
        
        setTimeout(() => {
          overlay.remove();
        }, 2000);
        
        return false;
      }
    };

    // Sağ tık engelleme
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // DevTools engelleme
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: black; color: red; font-size: 2rem; font-weight: bold;">⚠️ DEVELOPER TOOLS ALGILANDI - SAYFA KAPATILDI</div>';
      }
    };

    // Kopyalama engelleme
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Selection engelleme
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Drag engelleme
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Sayfa görünürlük kontrolü (screenshot algılama - mobil için)
    let lastHidden = false;
    const handleVisibilityChange = () => {
      if (document.hidden && !lastHidden) {
        // Sayfa gizlendi - muhtemelen screenshot alınıyor
        lastHidden = true;
        
        // Ekranı karart
        const overlay = document.createElement('div');
        overlay.id = 'screenshot-block';
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: black;
          z-index: 999999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: red;
          font-size: 1.5rem;
          font-weight: bold;
          text-align: center;
          padding: 20px;
        `;
        overlay.innerHTML = `
          <div>⚠️ EKRAN GÖRÜNTÜSÜ ENGELLENDİ</div>
          <div style="font-size: 1rem; margin-top: 20px;">İçerik korumalıdır</div>
        `;
        document.body.appendChild(overlay);
        
        setTimeout(() => {
          const existingOverlay = document.getElementById('screenshot-block');
          if (existingOverlay) {
            existingOverlay.remove();
          }
        }, 3000);
      } else if (!document.hidden) {
        lastHidden = false;
      }
    };

    // Blur event (screenshot algılama - alternatif)
    const handleBlur = () => {
      // Sayfa focus kaybetti
      const overlay = document.createElement('div');
      overlay.className = 'blur-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: black;
        z-index: 999999;
      `;
      document.body.appendChild(overlay);
      
      setTimeout(() => {
        const overlays = document.querySelectorAll('.blur-overlay');
        overlays.forEach(o => o.remove());
      }, 500);
    };

    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyDown); // Keyup da engelle
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // DevTools interval check
    const devToolsInterval = setInterval(detectDevTools, 1000);

    // CSS ile ek koruma (watermark kaldırıldı)
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      
      input, textarea {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      clearInterval(devToolsInterval);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);
}

export function AndroidScreenshotProtection() {
  useEffect(() => {
    // Android screenshot algılama
    let screenshotDetected = false;
    
    const detectScreenshot = () => {
      // Android'de screenshot alınınca sayfa blur olur
      if (document.hidden || !document.hasFocus()) {
        if (!screenshotDetected) {
          screenshotDetected = true;
          
          // Ekranı karart
          const overlay = document.createElement('div');
          overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            color: red;
            font-size: 1.5rem;
            font-weight: bold;
          `;
          overlay.textContent = '⚠️ EKRAN GÖRÜNTÜSÜ ENGELLENDİ';
          document.body.appendChild(overlay);
          
          setTimeout(() => {
            overlay.remove();
            screenshotDetected = false;
          }, 2000);
        }
      }
    };

    // Visibility change event
    document.addEventListener('visibilitychange', detectScreenshot);
    
    // Android FLAG_SECURE benzeri meta tag
    const meta = document.createElement('meta');
    meta.name = 'format-detection';
    meta.content = 'telephone=no';
    document.head.appendChild(meta);

    // Secure flag meta
    const secureMeta = document.createElement('meta');
    secureMeta.name = 'apple-mobile-web-app-capable';
    secureMeta.content = 'yes';
    document.head.appendChild(secureMeta);

    return () => {
      document.removeEventListener('visibilitychange', detectScreenshot);
      if (meta.parentNode) {
        meta.parentNode.removeChild(meta);
      }
      if (secureMeta.parentNode) {
        secureMeta.parentNode.removeChild(secureMeta);
      }
    };
  }, []);

  return null;
}
