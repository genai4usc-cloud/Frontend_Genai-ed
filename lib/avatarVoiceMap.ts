export type AvatarName =
  | "lisa"
  | "lori"
  | "meg"
  | "jeff"
  | "max"
  | "harry";

export const AvatarVoiceMap: Record<
  AvatarName,
  {
    gender: "female" | "male";
    voiceId: string;       // Azure Neural Voice
    speakingStyle?: string;
  }
> = {
  // Female avatars
  lisa: {
    gender: "female",
    voiceId: "en-US-JennyNeural",
    speakingStyle: "friendly",
  },
  lori: {
    gender: "female",
    voiceId: "en-US-AriaNeural",
    speakingStyle: "professional",
  },
  meg: {
    gender: "female",
    voiceId: "en-US-JennyNeural",
    speakingStyle: "calm",
  },

  // Male avatars
  jeff: {
    gender: "male",
    voiceId: "en-US-GuyNeural",
    speakingStyle: "confident",
  },
  max: {
    gender: "male",
    voiceId: "en-US-BrandonNeural",
    speakingStyle: "neutral",
  },
  harry: {
    gender: "male",
    voiceId: "en-US-BrandonNeural",
    speakingStyle: "authoritative",
  },
};
