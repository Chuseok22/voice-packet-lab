import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClipProvider, useClip } from './ClipProvider';

const loadBundledSample = vi.fn();
vi.mock('../../audio/clip', () => ({
  loadBundledSample: () => loadBundledSample(),
}));

let latest: ReturnType<typeof useClip> | null = null;
function Probe() {
  latest = useClip();
  return <p>{latest.frames ? `frames:${latest.frames.length}` : 'no-frames'}|{latest.sourceLabel}|{latest.loadError ?? ''}</p>;
}

function renderProvider() {
  return render(
    <ClipProvider>
      <Probe />
    </ClipProvider>,
  );
}

describe('ClipProvider', () => {
  beforeEach(() => {
    latest = null;
    loadBundledSample.mockReset();
  });

  it('loads the bundled sample and splits it into frames', async () => {
    loadBundledSample.mockResolvedValue(new Float32Array(960 * 3));
    renderProvider();
    expect(screen.getByText(/no-frames/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/frames:3\|기본 음원/)).toBeInTheDocument());
  });

  it('reports a load error', async () => {
    loadBundledSample.mockRejectedValue(new Error('network'));
    renderProvider();
    await waitFor(() => expect(screen.getByText(/기본 음원을 불러오지 못했습니다/)).toBeInTheDocument());
  });

  it('rejects clips shorter than one frame without replacing the clip', async () => {
    loadBundledSample.mockResolvedValue(new Float32Array(960 * 3));
    renderProvider();
    await waitFor(() => expect(screen.getByText(/frames:3/)).toBeInTheDocument());

    const errors: Array<string | null> = [];
    act(() => {
      errors.push(latest?.replaceClip(new Float32Array(0), '내 녹음') ?? null);
      errors.push(latest?.replaceClip(new Float32Array(959), '내 녹음') ?? null);
    });
    errors.forEach((error) => expect(error).toContain('너무 짧습니다'));
    expect(screen.getByText(/frames:3\|기본 음원/)).toBeInTheDocument();
  });

  it('accepts a clip of exactly one frame', async () => {
    loadBundledSample.mockResolvedValue(new Float32Array(960 * 3));
    renderProvider();
    await waitFor(() => expect(screen.getByText(/frames:3/)).toBeInTheDocument());
    act(() => {
      expect(latest?.replaceClip(new Float32Array(960), '내 녹음')).toBeNull();
    });
    expect(screen.getByText(/frames:1\|내 녹음/)).toBeInTheDocument();
  });

  it('replaces the clip and can restore the bundled sample', async () => {
    loadBundledSample.mockResolvedValue(new Float32Array(960 * 3));
    renderProvider();
    await waitFor(() => expect(screen.getByText(/frames:3/)).toBeInTheDocument());

    act(() => {
      expect(latest?.replaceClip(new Float32Array(960 * 5), '내 녹음')).toBeNull();
    });
    expect(screen.getByText(/frames:5\|내 녹음/)).toBeInTheDocument();

    act(() => latest?.resetClip());
    expect(screen.getByText(/frames:3\|기본 음원/)).toBeInTheDocument();
  });
});
