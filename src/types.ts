export interface Preset {
  id: string;
  name: string;
  bpm: number;
}

export interface Setlist {
  id: string;
  name: string;
  presets: Preset[];
}
