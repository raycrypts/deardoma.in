export interface RootZoneDrift {
  rootSize: number;
  seedSize: number;
  notInRoot: string[];
  missingFromSeed: string[];
  ok: boolean;
}
export declare function verifyRootZone(): RootZoneDrift;
