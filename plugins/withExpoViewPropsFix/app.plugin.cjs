// plugins/withExpoViewPropsFix/app.plugin.js
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withExpoViewPropsFix(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      try {
        const filePath = path.join(
          config.modRequest.projectRoot,
          "node_modules",
          "expo-modules-core",
          "common",
          "cpp",
          "fabric",
          "ExpoViewProps.cpp"
        );

        if (!fs.existsSync(filePath)) {
          console.log("[withExpoViewPropsFix] ExpoViewProps.cpp not found, skipping patch");
          return config;
        }

        let contents = fs.readFileSync(filePath, "utf8");

        if (contents.includes('std::format("{}%", dimension.value)')) {
          contents = contents.replace(
            'std::format("{}%", dimension.value)',
            'std::to_string(dimension.value) + "%"'
          );
          fs.writeFileSync(filePath, contents);
          console.log("[withExpoViewPropsFix] Patched ExpoViewProps.cpp successfully ✅");
        } else {
          console.log("[withExpoViewPropsFix] Patch already applied or not needed");
        }
      } catch (err) {
        console.error("[withExpoViewPropsFix] Error while patching:", err);
      }

      return config;
    },
  ]);
}

module.exports = withExpoViewPropsFix;