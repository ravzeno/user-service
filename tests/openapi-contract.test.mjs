import { test } from "node:test";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { once } from "node:events";
import Ajv from "ajv";
import addFormats from "ajv-formats";

async function startServer(enabled, env = {}) {
  const child = fork(new URL("./contract-server.mjs", import.meta.url), [String(enabled)], {
    stdio: ["ignore", "pipe", "pipe", "ipc"],
    env: { ...process.env, ...env },
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const result = await Promise.race([
    once(child, "message").then(([message]) => message),
    once(child, "exit").then(([code]) => { throw new Error(`server exited ${code}: ${output}`); }),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`server startup timed out: ${output}`)), 20000).unref()),
  ]);
  return { child, base: `http://127.0.0.1:${result.port}` };
}

function resolve(doc, schema) {
  if (!schema?.$ref) return schema;
  return schema.$ref.slice(2).split("/").reduce((value, key) => value[key], doc);
}

function bodySchema(doc, path, method) {
  return resolve(doc, doc.paths[path][method].requestBody.content["application/json"].schema);
}

test("generated OpenAPI is complete and matches HTTP responses", async (t) => {
  const { child, base } = await startServer(true);
  t.after(() => child.connected && child.send("close"));
  const response = await fetch(`${base}/api/docs/json`);
  assert.equal(response.status, 200);
  const doc = await response.json();
  assert.match(doc.openapi, /^3\./);

  await t.test("Scalar and Better Auth documentation remain available", async () => {
    const scalar = await fetch(`${base}/api/docs`);
    assert.equal(scalar.status, 200);
    assert.match(scalar.headers.get("content-type"), /html/);
    const authDoc = await fetch(`${base}/api/auth/docs/json`);
    assert.equal(authDoc.status, 200);
    assert.match((await authDoc.json()).openapi, /^3\./);
  });

  await t.test("all documented successful operations describe their response body", () => {
    for (const [path, method] of [
      ["/api/health", "get"], ["/api/me", "get"], ["/api/me", "patch"],
      ["/api/internal/users", "get"], ["/api/internal/users/{id}", "get"], ["/api/internal/users/by-email/{email}", "get"],
      ["/api/backoffice/users", "get"], ["/api/backoffice/users", "post"],
      ...["get", "patch", "delete"].map((method) => ["/api/backoffice/users/{id}", method]),
      ["/api/backoffice/users/{id}/role", "patch"], ["/api/backoffice/users/{id}/ban", "post"], ["/api/backoffice/users/{id}/ban", "delete"],
      ["/api/backoffice/users/{id}/sessions", "get"], ["/api/backoffice/users/{id}/sessions/{sessionId}", "delete"], ["/api/backoffice/users/{id}/groups", "get"],
      ["/api/backoffice/groups", "get"], ["/api/backoffice/groups", "post"],
      ...["get", "patch", "delete"].map((method) => ["/api/backoffice/groups/{id}", method]),
      ["/api/backoffice/groups/{id}/users", "get"], ["/api/backoffice/groups/{id}/permissions", "put"],
      ["/api/backoffice/groups/{id}/users/{userId}", "put"], ["/api/backoffice/groups/{id}/users/{userId}", "delete"],
      ["/api/backoffice/groups/{id}/permissions/{permission}", "delete"], ["/api/backoffice/permissions", "get"], ["/api/backoffice/audit-logs", "get"],
    ]) assert.ok(doc.paths[path]?.[method], `missing ${method.toUpperCase()} ${path}`);
    for (const [path, operations] of Object.entries(doc.paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
        const successes = Object.entries(operation.responses ?? {}).filter(([status]) => /^2\d\d$/.test(status));
        assert.ok(successes.length, `${method.toUpperCase()} ${path} has no success response`);
        for (const [status, result] of successes) {
          if (status === "204") continue;
          assert.ok(result.content?.["application/json"]?.schema, `${method.toUpperCase()} ${path} ${status} has no JSON schema`);
        }
      }
    }
  });

  await t.test("request DTOs have properties, validation constraints, enum and nullable fields", () => {
    const createUser = bodySchema(doc, "/api/backoffice/users", "post");
    assert.deepEqual(new Set(createUser.required), new Set(["email", "password", "name"]));
    assert.equal(createUser.properties.password.minLength, 12);
    const role = bodySchema(doc, "/api/backoffice/users/{id}/role", "patch");
    assert.deepEqual(role.properties.role.enum, ["customer", "staff"]);
    const profile = bodySchema(doc, "/api/me", "patch");
    assert.ok(!profile.required?.includes("phoneNumber"));
    assert.equal(profile.properties.phoneNumber.nullable, true);
    const group = bodySchema(doc, "/api/backoffice/groups", "post");
    assert.ok(group.required.includes("slug") && group.required.includes("name"));
    assert.equal(group.properties.slug.maxLength, 100);
    const permissions = bodySchema(doc, "/api/backoffice/groups/{id}/permissions", "put");
    assert.equal(permissions.properties.permissions.type, "array");
    assert.equal(permissions.properties.permissions.items.type, "string");
    assert.ok(permissions.properties.permissions.items.enum.includes("core_user:list"));
    assert.ok(!permissions.properties.permissions.items.enum.includes("backoffice_user:list"));
    const page = resolve(doc, doc.paths["/api/backoffice/users"].get.responses["200"].content["application/json"].schema);
    const member = resolve(doc, page.properties.items.items);
    assert.equal(member.properties.image.nullable, true);
    assert.equal(member.properties.createdAt.format, "date-time");
    for (const field of ["items", "page", "limit", "total"]) assert.ok(page.required.includes(field));
  });

  await t.test("important status codes and parameters are present", () => {
    const list = doc.paths["/api/backoffice/users"].get;
    for (const status of ["200", "400", "401", "403"]) assert.ok(list.responses[status], `missing ${status}`);
    assert.ok(list.parameters.some((parameter) => parameter.name === "page" && parameter.in === "query"));
    for (const path of ["/api/backoffice/users", "/api/backoffice/groups/{id}/users"]) {
      for (const name of ["page", "limit"]) {
        const parameter = doc.paths[path].get.parameters.find((item) => item.name === name && item.in === "query");
        assert.equal(parameter?.schema?.type, "integer", `${path} ${name} must be an integer`);
      }
    }
    const group = doc.paths["/api/backoffice/groups/{id}"].get;
    assert.ok(group.responses["404"]);
    assert.ok(group.parameters.some((parameter) => parameter.name === "id" && parameter.in === "path" && parameter.required));
    assert.ok(doc.paths["/api/backoffice/users"].post.responses["201"]);
  });

  await t.test("real responses conform to the operation schemas", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    const cases = [
      ["/api/health", "/api/health", {}],
      ["/api/me", "/api/me", { "x-test-auth": "yes" }],
      ["/api/backoffice/users?page=1&limit=2", "/api/backoffice/users", { "x-test-auth": "yes" }],
      ["/api/backoffice/groups", "/api/backoffice/groups", { "x-test-auth": "yes" }],
      ["/api/backoffice/groups/group-1", "/api/backoffice/groups/{id}", { "x-test-auth": "yes" }],
      ["/api/backoffice/groups/group-1/users?page=1&limit=2", "/api/backoffice/groups/{id}/users", { "x-test-auth": "yes" }],
      ["/api/internal/users", "/api/internal/users", { "x-api-key": "contract-test-internal-api-key-1234567890" }],
      ["/api/backoffice/permissions", "/api/backoffice/permissions", { "x-test-auth": "yes" }],
      ["/api/backoffice/audit-logs?page=1&limit=2", "/api/backoffice/audit-logs", { "x-test-auth": "yes" }],
    ];
    for (const [url, path, headers] of cases) {
      const result = await fetch(`${base}${url}`, { headers });
      assert.equal(result.status, 200, `${url}: ${await result.clone().text()}`);
      const body = await result.json();
      const schema = doc.paths[path].get.responses["200"].content["application/json"].schema;
      const validate = ajv.compile({ ...schema, components: doc.components });
      assert.ok(validate(body), `${url}: ${JSON.stringify(validate.errors)}`);
      if (url.includes("?page=1&limit=2")) {
        assert.deepEqual({ page: body.page, limit: body.limit, total: body.total }, { page: 1, limit: 2, total: 1 });
        assert.equal(body.items.length, 1);
      }
    }
    for (const [url, path, headers, status] of [
      ["/api/backoffice/users", "/api/backoffice/users", {}, 401],
      ["/api/backoffice/users?limit=101", "/api/backoffice/users", { "x-test-auth": "yes" }, 400],
      ["/api/backoffice/users?page=1.5", "/api/backoffice/users", { "x-test-auth": "yes" }, 400],
      ["/api/backoffice/groups/missing/users", "/api/backoffice/groups/{id}/users", { "x-test-auth": "yes" }, 404],
    ]) {
      const result = await fetch(`${base}${url}`, { headers });
      assert.equal(result.status, status);
      const schema = doc.paths[path].get.responses[String(status)].content["application/json"].schema;
      const validate = ajv.compile({ ...schema, components: doc.components });
      assert.ok(validate(await result.json()), `${url} ${status}: ${JSON.stringify(validate.errors)}`);
    }
  });
});

test("documentation endpoints are disabled with ENABLE_API_DOCS=false", async (t) => {
  const { child, base } = await startServer(false);
  t.after(() => child.connected && child.send("close"));
  assert.equal((await fetch(`${base}/api/docs/json`)).status, 404);
  assert.equal((await fetch(`${base}/api/docs`)).status, 404);
  assert.equal((await fetch(`${base}/api/auth/docs/json`)).status, 404);
});

test("HTTPS OpenAPI uses the configured secure session cookie", async (t) => {
  const { child, base } = await startServer(true, { BETTER_AUTH_URL: "https://example.test" });
  t.after(() => child.connected && child.send("close"));
  const doc = await (await fetch(`${base}/api/docs/json`)).json();
  assert.equal(doc.components.securitySchemes.session.name, "__Secure-better-auth.session_token");
});
