// plugins/withExpoViewPropsFix/app.plugin.js
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function patchFile(filePath, searchValue, replaceValue, label) {
  if (!fs.existsSync(filePath)) {
    console.log(`[withExpoViewPropsFix] ${label} not found, skipping patch`);
    return;
  }
  let contents = fs.readFileSync(filePath, "utf8");
  if (contents.includes(searchValue)) {
    contents = contents.replace(searchValue, replaceValue);
    fs.writeFileSync(filePath, contents);
    console.log(`[withExpoViewPropsFix] Patched ${label} successfully ✅`);
  } else {
    console.log(
      `[withExpoViewPropsFix] Patch for ${label} already applied or not needed`,
    );
  }
}

function withExpoViewPropsFix(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      try {
        // Patch ExpoViewProps.cpp
        const expoViewPropsPath = path.join(
          config.modRequest.projectRoot,
          "node_modules",
          "expo-modules-core",
          "common",
          "cpp",
          "fabric",
          "ExpoViewProps.cpp",
        );
        patchFile(
          expoViewPropsPath,
          'std::format("{}%", dimension.value)',
          'std::to_string(dimension.value) + "%"',
          "ExpoViewProps.cpp",
        );

        // Patch graphicsConversions.h
        const graphicsConversionsPath = path.join(
          config.modRequest.projectRoot,
          "node_modules",
          "react-native",
          "ReactCommon",
          "react",
          "renderer",
          "core",
          "graphicsConversions.h",
        );
        patchFile(
          graphicsConversionsPath,
          'std::format("{}%", dimension.value)',
          'std::to_string(dimension.value) + "%"',
          "graphicsConversions.h",
        );
      } catch (err) {
        console.error("[withExpoViewPropsFix] Error while patching:", err);
      }
      return config;
    },
  ]);
}

module.exports = withExpoViewPropsFix;
