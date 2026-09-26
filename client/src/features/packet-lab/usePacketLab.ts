import { useCallback, type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { SamplePlayer, type AudioPlayer } from '../../audio/player';
import { packetLabContent } from '../../content/packetLab';
import { renderOriginal, renderPlayback, waveformBars } from '../../engine/playback';
import { simulate } from '../../engine/network';
import {
  applyScenario,
  matchScenarioId,
  parseSettings,
  serializeSettings,
  type ScenarioId,
} from '../../engine/settings';
import type { NetworkSettings, SimulatedPacket, SimulationResult } from '../../engine/types';

export type PlaybackKind = 'degraded' | 'original';

const WAVE_BAR_COUNT = 60;
const PLAYHEAD_UPDATE_MS = 50;

interface Waveforms {
  original: number[];
  degraded: number[];
}

export interface PacketLabModel {
  settings: NetworkSettings;
  scenarioId: ScenarioId | null;
  result: SimulationResult;
  selectedPacket: SimulatedPacket | null;
  playing: PlaybackKind | null;
  playheadMs: number | null;
  playbackError: string | null;
  waveforms: Waveforms;
  updateSettings: (patch: Partial<NetworkSettings>) => void;
  chooseScenario: (id: ScenarioId) => void;
  selectPacket: (sequenceNumber: number) => void;
  togglePlayback: (kind: PlaybackKind) => Promise<void>;
}

function buildWaveforms(original: Float32Array, degraded: Float32Array): Waveforms {
  const totalSamples = Math.max(original.length, degraded.length);
  const originalBars = waveformBars(original, WAVE_BAR_COUNT, totalSamples);
  const degradedBars = waveformBars(degraded, WAVE_BAR_COUNT, totalSamples);
  const scale = Math.max(0.001, ...originalBars);
  const normalize = (bars: number[]) => bars.map((bar) => Math.min(1, bar / scale));
  return { original: normalize(originalBars), degraded: normalize(degradedBars) };
}

function useSimulation(frames: Float32Array[], settings: NetworkSettings) {
  const result = useMemo(() => simulate(frames.length, settings), [frames.length, settings]);
  const degraded = useMemo(() => renderPlayback(frames, result.packets), [frames, result.packets]);
  const original = useMemo(() => renderOriginal(frames), [frames]);
  const waveforms = useMemo(() => buildWaveforms(original, degraded), [original, degraded]);
  return { result, degraded, original, waveforms };
}

function useSettingsUrlSync(settings: NetworkSettings): void {
  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}${serializeSettings(settings)}`);
  }, [settings]);
}

function usePlayhead(playing: PlaybackKind | null, player: AudioPlayer): number {
  const [positionMs, setPositionMs] = useState(0);

  useEffect(() => {
    if (playing === null) {
      setPositionMs(0);
      return undefined;
    }
    let frameId = 0;
    const tick = () => {
      const next = player.positionMs();
      setPositionMs((previous) => (Math.abs(next - previous) >= PLAYHEAD_UPDATE_MS ? next : previous));
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [playing, player]);

  return positionMs;
}

interface PlaybackController {
  playing: PlaybackKind | null;
  playbackError: string | null;
  stopPlayback: () => void;
  togglePlayback: (kind: PlaybackKind) => Promise<void>;
}

function usePlaybackController(
  player: AudioPlayer,
  frames: Float32Array[],
  degraded: Float32Array,
  original: Float32Array,
): PlaybackController {
  const [playing, setPlaying] = useState<PlaybackKind | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const stopPlayback = useCallback(() => {
    requestRef.current += 1;
    player.stop();
    setPlaying(null);
  }, [player]);

  useEffect(() => {
    stopPlayback();
  }, [frames, stopPlayback]);

  useEffect(() => () => player.dispose(), [player]);

  const togglePlayback = useCallback(
    async (kind: PlaybackKind) => {
      setPlaybackError(null);
      if (playing === kind) {
        stopPlayback();
        return;
      }
      requestRef.current += 1;
      const request = requestRef.current;
      try {
        await player.play(kind === 'degraded' ? degraded : original, () => {
          if (request === requestRef.current) setPlaying(null);
        });
        if (request === requestRef.current) setPlaying(kind);
      } catch {
        if (request === requestRef.current) {
          setPlaying(null);
          setPlaybackError(packetLabContent.errors.playback);
        }
      }
    },
    [playing, player, degraded, original, stopPlayback],
  );

  return { playing, playbackError, stopPlayback, togglePlayback };
}

function useSettingsActions(
  setSettings: Dispatch<SetStateAction<NetworkSettings>>,
  stopPlayback: () => void,
) {
  const updateSettings = useCallback(
    (patch: Partial<NetworkSettings>) => {
      stopPlayback();
      setSettings((previous) => ({ ...previous, ...patch }));
    },
    [stopPlayback],
  );

  const chooseScenario = useCallback(
    (id: ScenarioId) => {
      stopPlayback();
      setSettings((previous) => applyScenario(id, previous.seed));
    },
    [stopPlayback],
  );

  return { updateSettings, chooseScenario };
}

export function usePacketLab(
  frames: Float32Array[],
  createPlayer: () => AudioPlayer = () => new SamplePlayer(),
): PacketLabModel {
  const [player] = useState(createPlayer);
  const [selectedSequence, setSelectedSequence] = useState<number | null>(null);

  const [settings, setSettings] = useState<NetworkSettings>(() => parseSettings(window.location.search));
  const { result, degraded, original, waveforms } = useSimulation(frames, settings);

  useSettingsUrlSync(settings);
  const { playing, playbackError, stopPlayback, togglePlayback } = usePlaybackController(
    player,
    frames,
    degraded,
    original,
  );
  const { updateSettings, chooseScenario } = useSettingsActions(setSettings, stopPlayback);
  const positionMs = usePlayhead(playing, player);

  const selectedPacket = useMemo(
    () => result.packets.find((packet) => packet.sequenceNumber === selectedSequence) ?? null,
    [result.packets, selectedSequence],
  );

  return {
    settings,
    scenarioId: matchScenarioId(settings),
    result,
    selectedPacket,
    playing,
    playheadMs: playing === 'degraded' ? positionMs : null,
    playbackError,
    waveforms,
    updateSettings,
    chooseScenario,
    selectPacket: setSelectedSequence,
    togglePlayback,
  };
}
