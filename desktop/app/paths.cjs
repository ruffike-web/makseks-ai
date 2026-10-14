const path = require("node:path");
function dataDirectory({
  override,
  selfExtractingDirectory,
  executable,
  packaged,
  exists,
  userData,
}) {
  if (override) return path.resolve(override);
  const directory =
    selfExtractingDirectory ||
    (packaged &&
    exists(path.join(path.dirname(executable), "Makseks-AI.portable"))
      ? path.dirname(executable)
      : null);
  return directory ? path.join(directory, "Makseks-AI-andmed") : userData;
}
module.exports = { dataDirectory };
