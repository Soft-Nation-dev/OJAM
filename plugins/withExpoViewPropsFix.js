const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withExpoViewPropsFix(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
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
        console.log("ExpoViewProps.cpp not found, skipping patch");
        return config;
      }

      let contents = fs.readFileSync(filePath, "utf8");

      if (contents.includes('std::format("{}%", dimension.value)')) {
        contents = contents.replace(
          'std::format("{}%", dimension.value)',
          'std::to_string(dimension.value) + "%"'
        );

        fs.writeFileSync(filePath, contents);
        console.log("Patched ExpoViewProps.cpp successfully");
      } else {
        console.log("Patch already applied or not needed");
      }

      return config;
    },
  ]);
};