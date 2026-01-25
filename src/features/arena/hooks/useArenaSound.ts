import { useEffect, useCallback } from 'react';
import {
  soundManager,
  playCrowdRoar,
  playSurge,
  playBonk,
  playLeadChange,
  playCountdownBeep,
  playCountdownFinal,
  playRaceStart,
  playWhoosh,
  playImpact,
  playHypeSpike,
} from '../utils/soundManager';

/**
 * Hook for arena sound effects
 */
export function useArenaSound() {
  // Initialize ambient sound on mount
  useEffect(() => {
    const ambientId = soundManager.playAmbient();

    return () => {
      if (ambientId) {
        soundManager.stop(ambientId);
      }
    };
  }, []);

  const playSound = useCallback((type: string, options?: any) => {
    switch (type) {
      case 'crowd_roar':
        playCrowdRoar(options?.intensity || 'medium');
        break;
      case 'surge':
        playSurge();
        break;
      case 'bonk':
        playBonk();
        break;
      case 'lead_change':
        playLeadChange();
        playCrowdRoar('large');
        break;
      case 'countdown_beep':
        playCountdownBeep();
        break;
      case 'countdown_final':
        playCountdownFinal();
        playCrowdRoar('medium');
        break;
      case 'race_start':
        playRaceStart();
        playCrowdRoar('large');
        break;
      case 'whoosh':
        playWhoosh();
        break;
      case 'impact':
        playImpact();
        break;
      case 'hype_spike':
        playHypeSpike();
        playCrowdRoar('small');
        break;
      case 'station_complete':
        playWhoosh();
        break;
      default:
        console.warn(`Unknown sound type: ${type}`);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const currentMuted = soundManager.getMuted();
    soundManager.setMuted(!currentMuted);
    return !currentMuted;
  }, []);

  const setVolume = useCallback((volume: number) => {
    soundManager.setVolume(volume);
  }, []);

  return {
    playSound,
    toggleMute,
    setVolume,
    isMuted: soundManager.getMuted(),
  };
}

/**
 * Hook for hype-reactive crowd sounds
 */
export function useCrowdReaction(hypeLevel: number) {
  useEffect(() => {
    // Play crowd reactions based on hype spikes
    let lastHype = hypeLevel;

    const checkHype = setInterval(() => {
      const diff = hypeLevel - lastHype;

      if (diff >= 15) {
        // Big hype spike
        playCrowdRoar('large');
        playHypeSpike();
      } else if (diff >= 8) {
        // Medium hype spike
        playCrowdRoar('medium');
      }

      lastHype = hypeLevel;
    }, 500);

    return () => clearInterval(checkHype);
  }, [hypeLevel]);
}
