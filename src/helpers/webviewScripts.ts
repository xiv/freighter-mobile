/**
 * WebView scripts for freezing/unfreezing website content
 * Based on Rainbow's implementation for session persistence
 */

export const freezeWebsite = `(function() {
    // Pause media elements
    var mediaElements = document.querySelectorAll('video:not([paused]), audio:not([paused])');
    mediaElements.forEach(function(element) {
      element.setAttribute('data-frozen-playback-state', element.paused ? 'paused' : 'playing');
      element.setAttribute('data-frozen', 'true');
      element.pause();
    });
  
    // Suspend expensive animations and transitions
    var animatedElements = document.querySelectorAll('*[style*="animation"], *[style*="transition"]');
    animatedElements.forEach(function(element) {
      element.setAttribute('data-frozen-animation-play-state', element.style.animationPlayState);
      element.setAttribute('data-frozen-transition-property', element.style.transitionProperty);
      element.style.animationPlayState = 'paused';
      element.style.transitionProperty = 'none';
    });

    // Suspend keyframe animations
    var keyframeAnimatedElements = document.querySelectorAll('*[style*="animation-name"]');
    keyframeAnimatedElements.forEach(function(element) {
      element.setAttribute('data-frozen-animation-name', element.style.animationName);
      element.style.animationName = 'none';
    });
  })();`;

export const unfreezeWebsite = `(function() {
    // Resume media elements
    var pausedMediaElements = document.querySelectorAll('video[data-frozen="true"], audio[data-frozen="true"]');
    pausedMediaElements.forEach(function(element) {
      if (element.getAttribute('data-frozen-playback-state') === 'playing') {
        element.play();
      }
      element.removeAttribute('data-frozen');
      element.removeAttribute('data-frozen-playback-state');
    });

    // Resume animations and transitions
    var animatedElements = document.querySelectorAll('*[style*="animation"], *[style*="transition"]');
    animatedElements.forEach(function(element) {
      element.style.animationPlayState = element.getAttribute('data-frozen-animation-play-state') || 'running';
      element.style.transitionProperty = element.getAttribute('data-frozen-transition-property') || '';
      element.removeAttribute('data-frozen-animation-play-state');
      element.removeAttribute('data-frozen-transition-property');
    });

    // Resume keyframe animations
    var keyframeAnimatedElements = document.querySelectorAll('*[style*="animation-name"]');
    keyframeAnimatedElements.forEach(function(element) {
      element.style.animationName = element.getAttribute('data-frozen-animation-name') || '';
      element.removeAttribute('data-frozen-animation-name');
    });
  })();`;

export const SCRIPTS_TO_INJECT = `
  // Inject Freighter provider info
  window.stellar = {
    provider: 'freighter',
    platform: 'mobile',
    version: '${process.env.APP_VERSION || '1.0.0'}'
  };
`;
