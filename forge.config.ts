import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import type { ForgeConfig } from '@electron-forge/shared-types';
import fs from 'fs';
import path from 'path';

import packageConfig from './package.json';
import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const ASSETS_DIR = path.join(__dirname, 'assets');

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    afterCopyExtraResources: [
      (buildPath, electronVersion, platform, arch, callback) => {
        if (platform === 'win32') {
          fs.renameSync(
            `${buildPath}/resources/algod`,
            `${buildPath}/resources/algod.exe`,
          );
          fs.renameSync(
            `${buildPath}/resources/goal`,
            `${buildPath}/resources/goal.exe`,
          );
          fs.renameSync(
            `${buildPath}/resources/kmd`,
            `${buildPath}/resources/kmd.exe`,
          );
        }

        callback();
      },
    ],
    beforeCopyExtraResources: [
      (buildPath, electronVersion, platform, arch, callback) => {
        const suffix = platform === 'win32' ? '.exe' : '';
        const algod = `algod${suffix}`;
        const goal = `goal${suffix}`;
        const kmd = `kmd${suffix}`;

        try {
          // delete the packaged directory if it exists
          if (fs.existsSync('src/bin/packaged')) {
            fs.rmdirSync('src/bin/packaged', { recursive: true });
          }

          // copy the platform binaries to the packaged directory
          fs.mkdirSync('src/bin/packaged');
          fs.copyFileSync(
            `src/bin/${platform}/${algod}`,
            `src/bin/packaged/algod`,
          );
          fs.copyFileSync(
            `src/bin/${platform}/${goal}`,
            `src/bin/packaged/goal`,
          );
          fs.copyFileSync(`src/bin/${platform}/${kmd}`, `src/bin/packaged/kmd`);

          callback();
        } catch (err) {
          callback(err);
        }
      },
    ],
    executableName: packageConfig.name,
    extraResource: [
      'assets/source.png',
      'src/bin/packaged/algod',
      'src/bin/packaged/goal',
      'src/bin/packaged/kmd',
      'src/config/algorand.mainnet.genesis.json',
      'src/config/config.json',
    ],
  },
  rebuildConfig: {},
  makers: [
    // MakerDeb class was having issues, so use raw object format
    {
      name: '@electron-forge/maker-deb',
      config: {
        icon: path.join(ASSETS_DIR, 'icons', 'png', '128x128.png'),
      },
    },
    new MakerDMG({
      background: path.join(ASSETS_DIR, 'source.png'),
      icon: path.join(ASSETS_DIR, 'icons', 'mac', 'icon.icns'),
      name: "Aust's One-Click Node",
      overwrite: true,
    }),
    new MakerSquirrel({
      exe: 'austs-one-click-node.exe',
      iconUrl:
        'https://raw.githubusercontent.com/AustP/austs-one-click-node/main/assets/icons/win/icon.ico',
      setupExe: 'austs-one-click-node-setup.exe',
      setupIcon: path.join(ASSETS_DIR, 'icons', 'win', 'icon.ico'),
    }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/render/index.html',
            js: './src/renderer.ts',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
            },
          },
        ],
      },
    }),
  ],
};

export default config;
