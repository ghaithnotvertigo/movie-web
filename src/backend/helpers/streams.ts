export enum MWStreamType {
  MP4 = "mp4",
  HLS = "hls",
}

export enum MWCaptionType {
  VTT = "vtt",
  SRT = "srt",
}

export enum MWStreamQuality {
  Q360P = "360p",
  Q480P = "480p",
  Q720P = "720p",
  Q1080P = "1080p",
  QUNKNOWN = "unknown",
}

export type MWCaption = {
  needsProxy?: boolean;
  url: string;
  type: MWCaptionType;
  langIso: string;
};

export type MWStream = {
  streamUrl: string;
  type: MWStreamType;
  quality: MWStreamQuality;
  captions: MWCaption[];
};
