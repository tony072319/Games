"""Copy the chosen models (with their licences) into public/models and write src/world/assets.ts."""
import glob, os, shutil, sys, json

S = '/tmp/claude-0/-home-user-Games/4b62e4d6-5e0d-578a-b466-be46f21cf05d/scratchpad/dl'
OUT = '/home/user/Games/public/models'
TS = '/home/user/Games/src/world/assets.ts'

def reo(pack_dir):
    return glob.glob(f'{S}/x/{pack_dir}/**/GLB/', recursive=True)[0]

PACKS = {
    # id: (source folder of model files, licence file, extension, extra files to copy alongside)
    'lh': (f'{S}/lhc_x/LowPolyLighthousePack_v1.0/GLB/', f'{S}/lhc_x/LowPolyLighthousePack_v1.0/LICENSE.txt', '.glb', []),
    'harbor': (None, 'LowPolyHarborPack_v1.0', '.glb', []),
    'viking': (None, 'LowPolyVikingVillagePack_v1.0', '.glb', []),
    'nature': (None, 'LowPolyNaturePack_v1.0', '.glb', []),
    'huts': (None, 'LowPolyIslandHutsPack_v1.0', '.glb', []),
    'tiki': (None, 'LowPolyTikiBeachPack_v1.0', '.glb', []),
    'under': (None, 'LowPolyUnderwaterPack_v1.0', '.glb', []),
    'volcano': (None, 'LowPolyVolcanoPack_v1.0', '.glb', []),
    'winter': (None, 'LowPoly_Winter_v1.0', '.glb', []),
    'kk': ('KK', f'{S}/kay_x/KayKit_Medieval_Hexagon_Pack_1.0_FREE/License.txt', '.gltf', []),
    'kp': (f'{S}/kx/kenney_pirate-kit_2.1/Models/GLB format/', f'{S}/kx/kenney_pirate-kit_2.1/License.txt', '.glb', ['Textures']),
    'kc': ('KC', 'KC', '.glb', ['Textures']),
    'kpet': ('KPET', 'KPET', '.glb', ['Textures']),
    'qf': (f'{S}/x/qfish/FBX/', None, '.fbx', []),
}

# id -> default size (world units, by height unless 'len:')
WANT = {
    'lh': {'lighthouse_small': 4.6, 'lighthouse_tall': 6.4, 'keeper_house': 1.9, 'signal_lamp_post': 1.4, 'fog_horn': .8, 'telescope_stand': .9,
           'fishing_net_pile': .4, 'fishing_boat': 2.2, 'buoy': .8, 'seagull': .32, 'sea_stack': 4, 'sea_rock_large': 1.4, 'sea_rock_small': .6,
           'driftwood_log': .3, 'lobster_crate': .35, 'treasure_chest': .45, 'cliff_chunk': 1.2, 'beach_grass': .5, 'kelp_clump': .6, 'rowboat': .45},
    'harbor': {'dock_plank_section': 'len:1.7', 'dock_corner': 'len:1.7', 'dock_post_lantern': 1.3, 'mooring_bollard': .35, 'harbor_crane': 2.6,
               'fish_market_stall': 1.5, 'fishing_rod_rack': 1.0, 'fish_barrel_stack': .8, 'cargo_crate': .7, 'cargo_net_pile': .5, 'sailboat': 2.2,
               'rope_coil': .25, 'lobster_trap': .4, 'beacon_light': 1.2},
    'viking': {'fish_drying_rack': 1.0, 'storehouse': 1.5, 'small_hut': 1.4, 'firepit': .45, 'forge': 1.3, 'watchtower': 2.4, 'banner_pole': 1.6,
               'well': 1.2, 'longhouse': 1.8},
    'nature': {'round_tree': 2.0, 'pine_tree': 2.2, 'bush_round': .6, 'bush_berries': .7, 'flower_yellow': .5, 'flower_red': .5, 'flower_purple': .5,
               'mushroom_cluster': .45, 'rock_large': .9, 'rock_cluster': .7, 'grass_tuft': .45, 'fern': .5, 'palm_tree': 2.4, 'tree_stump': .4},
    'huts': {'stilt_hut': 1.8, 'hammock': .9, 'fish_shack': 1.5, 'banana_plant': 1.1, 'palm_small': 1.6, 'rope_fence': .6},
    'tiki': {'string_lights': 'len:2.2', 'tiki_torch': 1.2},
    'under': {'shipwreck_hull': 'len:3.2', 'sea_rock_big': 1.6, 'ship_anchor': 1.0, 'ship_wheel': .8, 'coral_branch': .7, 'kelp': .9},
    'volcano': {'thatch_hut': 1.6, 'coconut_cluster': .4, 'tropical_bush': .8, 'crystal_cluster': .9, 'palm_tree': 2.4},
    'winter': {'pine_snow': 2.2, 'wood_cabin': 1.8, 'snow_pile': .5, 'ice_crystal': .8, 'lantern_xmas': .8},
    'kk': {'tiles/base/hex_grass': 'len:2', 'tiles/base/hex_grass_sloped_high': 'len:2', 'buildings/neutral/building_scaffolding': 1.6,
           'buildings/neutral/building_stage_A': 1.0, 'buildings/neutral/building_stage_B': 1.3, 'buildings/neutral/building_stage_C': 1.6,
           'buildings/blue/building_windmill_blue': 2.6, 'buildings/blue/building_well_blue': 1.0, 'buildings/blue/building_home_A_blue': 1.6,
           'buildings/blue/building_market_blue': 1.4, 'buildings/blue/building_blacksmith_blue': 1.5, 'buildings/blue/building_lumbermill_blue': 1.7,
           'buildings/blue/building_tower_A_blue': 2.2, 'buildings/neutral/building_grain': .3, 'decoration/nature/cloud_big': 2,
           'decoration/nature/cloud_small': 1.2, 'decoration/props/flag_red': 1.4, 'decoration/props/flag_blue': 1.4, 'decoration/props/flag_yellow': 1.4,
           'decoration/props/barrel': .6, 'decoration/props/crate_A_small': .5, 'decoration/props/crate_A_big': .8, 'decoration/props/crate_B_big': .8,
           'decoration/props/crate_long_A': .5, 'decoration/props/sack': .4, 'decoration/props/resource_lumber': .5, 'decoration/props/resource_stone': .5,
           'decoration/props/tent': 1.0, 'decoration/props/wheelbarrow': .5, 'decoration/props/pallet': .25},
    'kp': {'boat-row-small': 'len:1.4', 'boat-row-large': 'len:1.9', 'ship-small': 2.4, 'ship-medium': 3.2, 'ship-large': 4.2, 'chest': .45,
           'barrel': .6, 'crate': .5, 'crate-bottles': .5, 'bottle': .3, 'flag-high-pennant': 2.4, 'ship-wreck': 'len:3', 'tower-base': 1.2,
           'tower-middle': 1.2, 'tower-top': 1.0, 'tower-roof': 1.0},
    'kc': {'character-male-a': .85, 'character-female-b': .8, 'character-male-c': .85},
    'kpet': {'animal-cat': .4, 'animal-chick': .28, 'animal-bunny': .34, 'animal-parrot': .3, 'animal-fish': .35, 'animal-dog': .42},
    'qf': {'Whale': 'len:5.5', 'Dolphin': 'len:1.4'},
}
ANIM = {'kc/character-male-a': 'idle', 'kc/character-female-b': 'sit', 'kc/character-male-c': 'idle', 'qf/Whale': 'Swim', 'qf/Dolphin': 'Swim'}

def find_dir(pid):
    src, lic, ext, extra = PACKS[pid]
    if src is None:
        d = reo(lic)
        lic = glob.glob(f'{S}/x/{lic}/**/LICENSE*.txt', recursive=True)[0]
        return d, lic
    if src == 'KK':
        return f'{S}/kay_x/KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/', lic
    if src in ('KC', 'KPET'):
        name = 'kenney_mini-characters_2.0' if src == 'KC' else 'kenney_cube-pets_1.0_0'
        one = glob.glob(f'{S}/kx/{name}/**/*.glb', recursive=True)[0]
        l = (glob.glob(f'{S}/kx/{name}/**/License*.txt', recursive=True) or glob.glob(f'{S}/kx/{name}/**/*icense*', recursive=True))[0]
        return os.path.dirname(one) + '/', l
    return src, lic

entries = []
if os.path.isdir(OUT):
    shutil.rmtree(OUT)
for pid, want in WANT.items():
    src, lic = find_dir(pid)
    _, _, ext, extra = PACKS[pid]
    dst = f'{OUT}/{pid}'
    os.makedirs(dst, exist_ok=True)
    if lic:
        shutil.copy(lic, f'{dst}/LICENSE.txt')
    else:
        open(f'{dst}/LICENSE.txt', 'w').write('Quaternius - LowPoly Animated Fish (https://quaternius.itch.io/lowpoly-animated-fish)\nLicense: CC0 1.0 Universal (public domain). Models by Quaternius.\n')
    for e in extra:
        shutil.copytree(src + e, f'{dst}/{e}', dirs_exist_ok=True)
    for name, size in want.items():
        f = src + name + ext
        if not os.path.exists(f):
            sys.exit(f'missing {pid}/{name}: {f}')
        base = os.path.basename(name)
        shutil.copy(f, f'{dst}/{base}{ext}')
        if ext == '.gltf':
            shutil.copy(src + name + '.bin', f'{dst}/{base}.bin')
            png = src + os.path.dirname(name) + '/hexagons_medieval.png'
            if not os.path.exists(f'{dst}/hexagons_medieval.png'):
                shutil.copy(png, f'{dst}/hexagons_medieval.png')
        fit, val = ('len', float(size[4:])) if isinstance(size, str) else ('height', size)
        mid = f'{pid}/{base}'
        entries.append((mid, f'models/{pid}/{base}{ext}', fit, val, ANIM.get(mid)))

# shrink big textures
from PIL import Image
for png in glob.glob(f'{OUT}/**/*.png', recursive=True):
    im = Image.open(png)
    if max(im.size) > 512:
        im.thumbnail((512, 512))
        im.save(png, optimize=True)

lines = ['/** Models used in the world. Generated by the import script from the packs in public/models (see LICENSE.txt in each). */',
         'export type ModelId = string;', '',
         'export interface ModelInfo {', '  url: string;', "  /** How `size` is measured: model height, or its longest side on the ground. */", "  fit: 'height' | 'len';",
         '  /** Default size in world units (one hex tile is 2 wide). */', '  size: number;', '  anim?: string;', '}', '',
         'export const MODELS: Record<ModelId, ModelInfo> = {']
for mid, url, fit, val, anim in entries:
    a = f", anim: '{anim}'" if anim else ''
    lines.append(f"  '{mid}': {{ url: '{url}', fit: '{fit}', size: {val}{a} }},")
lines += ['};', '', 'export const ALL_MODEL_IDS: readonly ModelId[] = Object.keys(MODELS);', '',
          '/** Path relative to the site root (the game is served from a sub-folder, so no leading slash). */',
          'export function modelUrl(id: ModelId): string {', '  const m = MODELS[id];', "  if (!m) throw new Error(`unknown model ${id}`);", '  return m.url;', '}', '']
os.makedirs(os.path.dirname(TS), exist_ok=True)
open(TS, 'w').write('\n'.join(lines))
print(len(entries), 'models')
