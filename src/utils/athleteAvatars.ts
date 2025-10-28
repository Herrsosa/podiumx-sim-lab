import avaJpg from '@/assets/athletes/ava.jpg';
import avaWebp from '@/assets/athletes/ava.webp';
import kaiJpg from '@/assets/athletes/kai.jpg';
import kaiWebp from '@/assets/athletes/kai.webp';
import leoJpg from '@/assets/athletes/leo.jpg';
import leoWebp from '@/assets/athletes/leo.webp';
import maraJpg from '@/assets/athletes/mara.jpg';
import maraWebp from '@/assets/athletes/mara.webp';
import maxJpg from '@/assets/athletes/max.jpg';
import maxWebp from '@/assets/athletes/max.webp';
import nilsJpg from '@/assets/athletes/nils.jpg';
import nilsWebp from '@/assets/athletes/nils.webp';
import rioJpg from '@/assets/athletes/rio.jpg';
import rioWebp from '@/assets/athletes/rio.webp';
import zaraJpg from '@/assets/athletes/zara.jpg';
import zaraWebp from '@/assets/athletes/zara.webp';

export interface AvatarAsset {
  src: string;
  webp: string;
  width: number;
  height: number;
}

const buildAsset = (src: string, webp: string): AvatarAsset => ({
  src,
  webp,
  width: 800,
  height: 800,
});

export const athleteAvatarAssets = {
  ava: buildAsset(avaJpg, avaWebp),
  kai: buildAsset(kaiJpg, kaiWebp),
  leo: buildAsset(leoJpg, leoWebp),
  mara: buildAsset(maraJpg, maraWebp),
  max: buildAsset(maxJpg, maxWebp),
  nils: buildAsset(nilsJpg, nilsWebp),
  rio: buildAsset(rioJpg, rioWebp),
  zara: buildAsset(zaraJpg, zaraWebp),
} satisfies Record<string, AvatarAsset>;

export const athleteAvatars: Record<string, string> = {
  'ava': athleteAvatarAssets.ava.src,
  'ava-thompson': athleteAvatarAssets.ava.src,
  'kai': athleteAvatarAssets.kai.src,
  'kai-anderson': athleteAvatarAssets.kai.src,
  'leo': athleteAvatarAssets.leo.src,
  'leo-martinez': athleteAvatarAssets.leo.src,
  'mara': athleteAvatarAssets.mara.src,
  'mara-chen': athleteAvatarAssets.mara.src,
  'max': athleteAvatarAssets.max.src,
  'max-jensen': athleteAvatarAssets.max.src,
  'nils': athleteAvatarAssets.nils.src,
  'nils-bergstrom': athleteAvatarAssets.nils.src,
  'rio': athleteAvatarAssets.rio.src,
  'rio-silva': athleteAvatarAssets.rio.src,
  'zara': athleteAvatarAssets.zara.src,
  'zara-williams': athleteAvatarAssets.zara.src,
};

export const athleteAvatarAssetBySrc: Record<string, AvatarAsset> = Object.values(
  athleteAvatarAssets,
).reduce((acc, asset) => {
  acc[asset.src] = asset;
  acc[asset.webp] = asset;
  return acc;
}, {} as Record<string, AvatarAsset>);
