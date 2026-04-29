import { registerRoot, Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";
import type React from "react";

const DEFAULT_FPS = 30;
const DEFAULT_DURATION = 300;

registerRoot(() => (
  <Composition
    id="ReelForge"
    component={VideoComposition as unknown as React.ComponentType<Record<string, unknown>>}
    durationInFrames={DEFAULT_DURATION}
    fps={DEFAULT_FPS}
    width={1280}
    height={720}
    defaultProps={{
      scenes: [
        {
          text: "Preview scene - запусти рендеринг для реального видео",
          durationInFrames: DEFAULT_DURATION,
        },
      ],
      titleText: "ReelForge Preview",
    }}
  />
));
