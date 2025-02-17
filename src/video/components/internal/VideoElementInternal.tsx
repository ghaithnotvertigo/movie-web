import { useVideoPlayerDescriptor } from "@/video/state/hooks";
import { useMediaPlaying } from "@/video/state/logic/mediaplaying";
import { useMisc } from "@/video/state/logic/misc";
import { useSource } from "@/video/state/logic/source";
import { setProvider, unsetStateProvider } from "@/video/state/providers/utils";
import { createVideoStateProvider } from "@/video/state/providers/videoStateProvider";
import { useEffect, useMemo, useRef } from "react";

interface Props {
  autoPlay?: boolean;
}

function VideoElement(props: Props) {
  const descriptor = useVideoPlayerDescriptor();
  const mediaPlaying = useMediaPlaying(descriptor);
  const source = useSource(descriptor);
  const misc = useMisc(descriptor);
  const ref = useRef<HTMLVideoElement>(null);

  const initalized = useMemo(() => !!misc.wrapperInitialized, [misc]);
  const stateProviderId = useMemo(() => misc.stateProviderId, [misc]);

  useEffect(() => {
    if (!initalized) return;
    if (!ref.current) return;
    const provider = createVideoStateProvider(descriptor, ref.current);
    setProvider(descriptor, provider);
    const { destroy } = provider.providerStart();
    return () => {
      try {
        unsetStateProvider(descriptor, provider.getId());
      } catch {
        // ignore errors from missing player state, we need to run destroy()!
      }
      destroy();
    };
  }, [descriptor, initalized, stateProviderId]);

  // this element is remotely controlled by a state provider
  return (
    <video
      ref={ref}
      autoPlay={props.autoPlay}
      muted={mediaPlaying.volume === 0}
      playsInline
      className="h-full w-full"
    >
      {source.source?.caption ? (
        <track default kind="captions" src={source.source.caption.url} />
      ) : null}
    </video>
  );
}

export function VideoElementInternal(props: Props) {
  const descriptor = useVideoPlayerDescriptor();
  const misc = useMisc(descriptor);

  // this element is remotely controlled by a state provider
  if (misc.stateProviderId !== "video") return null;
  return <VideoElement {...props} />;
}
