import { expect, it } from "vitest";
import { execFileSync } from "node:child_process";

it("keeps Electron's download proxy working after replacing global-agent", () => {
  const result = execFileSync(process.execPath, ["-e", `
    const http = require('node:http');
    const { createRequire } = require('node:module');
    const fromBuilder = createRequire(require.resolve('app-builder-lib/package.json'));
    const proxy = http.createServer((req, res) => {
      if (req.url !== 'http://example.invalid/proxy-check') process.exit(2);
      res.end('proxy-used');
    });
    setTimeout(() => process.exit(3), 5000).unref();
    proxy.listen(0, '127.0.0.1', () => {
      process.env.GLOBAL_AGENT_ENVIRONMENT_VARIABLE_NAMESPACE = 'GLOBAL_AGENT_';
      process.env.GLOBAL_AGENT_HTTP_PROXY = 'http://127.0.0.1:' + proxy.address().port;
      process.env.GLOBAL_AGENT_NO_PROXY = '';
      fromBuilder('@electron/get').initializeProxy();
      http.get('http://example.invalid/proxy-check', res => {
        let body = ''; res.on('data', chunk => body += chunk);
        res.on('end', () => { console.log(body); proxy.close(() => process.exit(0)); });
      }).on('error', () => process.exit(4));
    });
  `], { encoding: "utf8", windowsHide: true, timeout: 10000 });
  expect(result.trim()).toBe("proxy-used");
});
