import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Video,
} from "remotion";
import type { ReactElement } from "react";

export interface SceneInput {
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  text: string;
  durationInFrames: number;
}

export interface VideoCompositionProps {
  scenes: SceneInput[];
  titleText?: string;
}

function Scene({ scene, startFrame }: { scene: SceneInput; startFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startFrame;
  const FADE = fps * 0.5;

  const opacity = interpolate(
    localFrame,
    [0, FADE, scene.durationInFrames - FADE, scene.durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = interpolate(
    localFrame,
    [0, scene.durationInFrames],
    [1.0, 1.08],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {scene.videoUrl ? (
        <Video src={scene.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : scene.imageUrl ? (
        <Img
          src={scene.imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        />
      ) : (
        <AbsoluteFill style={{ background: "#000" }} />
      )}

      <AbsoluteFill
        style={{
          background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {scene.text && (
        <AbsoluteFill
          style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 60px 64px" }}
        >
          <p
            style={{
              color: "#ffffff",
              fontSize: 38,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              lineHeight: 1.4,
              textAlign: "center",
              textShadow: "0 2px 12px rgba(0,0,0,0.8)",
              maxWidth: 900,
            }}
          >
            {scene.text}
          </p>
        </AbsoluteFill>
      )}

      {scene.audioUrl && <Audio src={scene.audioUrl} />}
    </AbsoluteFill>
  );
}

function TitleCard({ text, durationInFrames }: { text: string; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const FADE = fps * 0.4;

  const opacity = interpolate(
    frame,
    [0, FADE, durationInFrames - FADE, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const y = interpolate(frame, [0, FADE], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a0533 0%, #0d001a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <div style={{ transform: `translateY(${y}px)`, textAlign: "center", padding: "0 80px" }}>
        <div
          style={{
            width: 48, height: 48, background: "#7c3aed",
            borderRadius: 12, margin: "0 auto 24px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
            <polygon points="3,13 8,2 13,13 10,13 8,7 6,13" fill="white" />
          </svg>
        </div>
        <p
          style={{
            color: "#ffffff",
            fontSize: 52,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
            lineHeight: 1.2,
            textShadow: "0 4px 24px rgba(124,58,237,0.5)",
          }}
        >
          {text}
        </p>
      </div>
    </AbsoluteFill>
  );
}

export function VideoComposition({ scenes, titleText }: VideoCompositionProps) {
  const { fps } = useVideoConfig();
  const TITLE_FRAMES = fps * 2;
  const baseOffset = titleText ? TITLE_FRAMES : 0;
  const sceneSequences = scenes.reduce<ReactElement[]>(
    (acc, scene, index) => {
      const from =
        baseOffset +
        scenes
          .slice(0, index)
          .reduce((sum, current) => sum + current.durationInFrames, 0);
      acc.push(
        <Sequence key={index} from={from} durationInFrames={scene.durationInFrames}>
          <Scene scene={scene} startFrame={from} />
        </Sequence>
      );
      return acc;
    },
    []
  );

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {titleText && (
        <Sequence from={0} durationInFrames={TITLE_FRAMES}>
          <TitleCard text={titleText} durationInFrames={TITLE_FRAMES} />
        </Sequence>
      )}

      {sceneSequences}
    </AbsoluteFill>
  );
}
