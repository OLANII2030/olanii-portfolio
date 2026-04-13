(function () {
    const loader = document.getElementById('page-loader');
    if (!loader) return;
  
    const hide = () => {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 300);
    };
  
    // Check connection speed
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    const isSlowConnection = connection && (
      connection.saveData === true ||
      connection.effectiveType === '2g' ||
      connection.effectiveType === 'slow-2g' ||
      connection.downlink < 1.5
    );
  
    if (isSlowConnection) {
      // Slow connection — show loader until page is fully loaded
      if (document.readyState === 'complete') {
        setTimeout(hide, 800);
      } else {
        window.addEventListener('load', () => {
          setTimeout(hide, 800);
        });
      }
    } else {
      // Fast connection — hide immediately, no loader needed
      hide();
    }
  })();