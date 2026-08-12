import { useEffect, useRef } from 'react';

/**
 * Plays a loud looping alarm while there are unaccepted ('new') orders.
 * Stops automatically once all new orders are accepted.
 */
export function useOrderAlarm(orders) {
  const audioCtxRef  = useRef(null);
  const loopTimerRef = useRef(null);

  function getCtx() {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }

  /** Play a single "ding-dong" beep burst */
  function playBeep(ctx) {
    const VOLUME = 1.0; // max volume

    function tone(freq, startTime, duration) {
      const osc     = ctx.createOscillator();
      const gain    = ctx.createGain();

      osc.type      = 'square'; // harsh/loud waveform
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(VOLUME, startTime + 0.01);
      gain.gain.setValueAtTime(VOLUME, startTime + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    }

    const now = ctx.currentTime;
    // Three urgent pulses: high-low-high
    tone(1200, now,        0.18);
    tone(800,  now + 0.22, 0.18);
    tone(1200, now + 0.44, 0.18);
  }

  function startLoop() {
    stopLoop();
    const ctx = getCtx();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();

    playBeep(ctx);
    // Repeat every 1.2 s
    loopTimerRef.current = setInterval(() => {
      const c = getCtx();
      if (c.state === 'suspended') c.resume();
      playBeep(c);
    }, 1200);
  }

  function stopLoop() {
    clearInterval(loopTimerRef.current);
    loopTimerRef.current = null;
  }

  useEffect(() => {
    const hasNewOrders = orders.some(o => o.status === 'new');

    if (hasNewOrders) {
      if (!loopTimerRef.current) startLoop();
    } else {
      stopLoop();
    }

    return stopLoop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);
}
