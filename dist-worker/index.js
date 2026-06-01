var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../Users/geza02/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");

// ../../Users/geza02/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../Users/geza02/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../../Users/geza02/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../../Users/geza02/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../Users/geza02/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../../Users/geza02/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../../Users/geza02/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../Users/geza02/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../../Users/geza02/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../../Users/geza02/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// worker/kv.ts
var SUBSCRIPTIONS_KEY = "subscriptions";
async function loadSubscriptions(env2) {
  const raw = await env2.PUSH_SUBSCRIPTIONS.get(SUBSCRIPTIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
__name(loadSubscriptions, "loadSubscriptions");
async function saveSubscriptions(env2, subs) {
  await env2.PUSH_SUBSCRIPTIONS.put(SUBSCRIPTIONS_KEY, JSON.stringify(subs));
}
__name(saveSubscriptions, "saveSubscriptions");
async function addSubscription(env2, sub) {
  const subs = await loadSubscriptions(env2);
  const existing = subs.findIndex((s) => s.endpoint === sub.endpoint);
  if (existing >= 0) {
    subs[existing] = sub;
  } else {
    subs.push(sub);
  }
  await saveSubscriptions(env2, subs);
}
__name(addSubscription, "addSubscription");
async function removeSubscription(env2, endpoint) {
  const subs = await loadSubscriptions(env2);
  const filtered = subs.filter((s) => s.endpoint !== endpoint);
  await saveSubscriptions(env2, filtered);
}
__name(removeSubscription, "removeSubscription");
async function removeSubscriptions(env2, endpoints) {
  if (!endpoints.length) return;
  const subs = await loadSubscriptions(env2);
  const set = new Set(endpoints);
  await saveSubscriptions(env2, subs.filter((s) => !set.has(s.endpoint)));
}
__name(removeSubscriptions, "removeSubscriptions");
async function isInCooldown(env2, key) {
  const val = await env2.ALERT_COOLDOWNS.get(key);
  return val !== null;
}
__name(isInCooldown, "isInCooldown");
async function setCooldown(env2, key, ttlSeconds) {
  await env2.ALERT_COOLDOWNS.put(key, "1", { expirationTtl: ttlSeconds });
}
__name(setCooldown, "setCooldown");

// worker/push.ts
function b64uDecode(b64u) {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    b64u.length + (4 - b64u.length % 4) % 4,
    "="
  );
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
__name(b64uDecode, "b64uDecode");
function b64uEncode(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
__name(b64uEncode, "b64uEncode");
async function importVapidPrivateKey(privKeyB64u, pubKeyB64u) {
  const pub = b64uDecode(pubKeyB64u);
  const x = pub.slice(1, 33);
  const y = pub.slice(33, 65);
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: privKeyB64u,
    x: b64uEncode(x),
    y: b64uEncode(y)
  };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}
__name(importVapidPrivateKey, "importVapidPrivateKey");
async function buildVapidToken(endpoint, env2) {
  const origin = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1e3);
  const enc = new TextEncoder();
  const header = b64uEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64uEncode(enc.encode(JSON.stringify({ aud: origin, exp: now + 43200, sub: env2.VAPID_SUBJECT })));
  const unsigned = `${header}.${claims}`;
  const key = await importVapidPrivateKey(env2.VAPID_PRIVATE_KEY, env2.VAPID_PUBLIC_KEY);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned));
  return `${unsigned}.${b64uEncode(new Uint8Array(sig))}`;
}
__name(buildVapidToken, "buildVapidToken");
async function hkdfExtract(salt, ikm) {
  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveKey", "deriveBits"]);
  const prk = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: new Uint8Array(0) },
    ikmKey,
    256
  );
  return crypto.subtle.importKey("raw", prk, "HKDF", false, ["deriveKey", "deriveBits"]);
}
__name(hkdfExtract, "hkdfExtract");
async function hkdfExpand(prk, info, length) {
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info },
    prk,
    length * 8
  );
  return new Uint8Array(bits);
}
__name(hkdfExpand, "hkdfExpand");
async function encryptPayload(sub, plaintext) {
  const enc = new TextEncoder();
  const clientPublicKeyBytes = b64uDecode(sub.keys.p256dh);
  const authSecret = b64uDecode(sub.keys.auth);
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
  const serverKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey)
  );
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    serverKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyInfoData = new Uint8Array([
    ...enc.encode("WebPush: info\0"),
    ...clientPublicKeyBytes,
    ...serverPublicKeyRaw
  ]);
  const prk = await hkdfExtract(authSecret, sharedSecret);
  const ikm = await hkdfExpand(prk, keyInfoData, 32);
  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const cekBits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: cekInfo }, ikmKey, 128);
  const nonceBits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, ikmKey, 96);
  const cek = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);
  const padded = new Uint8Array([...enc.encode(plaintext), 2]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonceBits }, cek, padded);
  const rs = 4096;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, rs, false);
  const keyId = serverPublicKeyRaw;
  const header = new Uint8Array([...salt, ...rsBytes, keyId.length, ...keyId]);
  const ciphertext = new Uint8Array([...header, ...new Uint8Array(encrypted)]);
  return { ciphertext, salt, serverPublicKey: serverPublicKeyRaw };
}
__name(encryptPayload, "encryptPayload");
async function sendPush(sub, payload, env2) {
  try {
    const vapidToken = await buildVapidToken(sub.endpoint, env2);
    const { ciphertext } = await encryptPayload(sub, JSON.stringify(payload));
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${vapidToken},k=${env2.VAPID_PUBLIC_KEY}`,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Urgency: "normal"
      },
      body: ciphertext
    });
    if (res.status === 410 || res.status === 404) {
      return false;
    }
    return res.ok;
  } catch (err) {
    console.error("sendPush error:", err);
    return false;
  }
}
__name(sendPush, "sendPush");

// src/lib/indicators.ts
function calculateSMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}
__name(calculateSMA, "calculateSMA");
function calculateEMA(data, period) {
  const result = [];
  const multiplier = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(sma);
    } else {
      const prev = result[i - 1];
      if (prev === null) {
        result.push(null);
      } else {
        result.push((data[i] - prev) * multiplier + prev);
      }
    }
  }
  return result;
}
__name(calculateEMA, "calculateEMA");
function calculateRSI(closes, period) {
  const result = [];
  if (closes.length < period + 1) return closes.map(() => null);
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(null);
    } else if (i === period) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else {
      const change = closes[i] - closes[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}
__name(calculateRSI, "calculateRSI");
function calculateStochasticRSI(closes, rsiLength, stochLength, kSmoothing, dSmoothing) {
  const rsiValues = calculateRSI(closes, rsiLength);
  const stochRsi = [];
  for (let i = 0; i < rsiValues.length; i++) {
    if (i < rsiLength + stochLength - 1) {
      stochRsi.push(null);
      continue;
    }
    const window = rsiValues.slice(i - stochLength + 1, i + 1).filter((v) => v !== null);
    if (window.length < stochLength) {
      stochRsi.push(null);
      continue;
    }
    const min = Math.min(...window);
    const max = Math.max(...window);
    const current = rsiValues[i];
    stochRsi.push(max === min ? 50 : (current - min) / (max - min) * 100);
  }
  const kValues = [];
  for (let i = 0; i < stochRsi.length; i++) {
    if (i < rsiLength + stochLength + kSmoothing - 2) {
      kValues.push(null);
      continue;
    }
    const window = stochRsi.slice(i - kSmoothing + 1, i + 1).filter((v) => v !== null);
    kValues.push(window.length === kSmoothing ? window.reduce((a, b) => a + b, 0) / kSmoothing : null);
  }
  const dValues = [];
  for (let i = 0; i < kValues.length; i++) {
    if (i < rsiLength + stochLength + kSmoothing + dSmoothing - 3) {
      dValues.push(null);
      continue;
    }
    const window = kValues.slice(i - dSmoothing + 1, i + 1).filter((v) => v !== null);
    dValues.push(window.length === dSmoothing ? window.reduce((a, b) => a + b, 0) / dSmoothing : null);
  }
  return { kValues, dValues };
}
__name(calculateStochasticRSI, "calculateStochasticRSI");
function calculateMACD(closes, fastPeriod, slowPeriod, signalPeriod) {
  const fastEma = calculateEMA(closes, fastPeriod);
  const slowEma = calculateEMA(closes, slowPeriod);
  const macdLine = fastEma.map((f, i) => {
    const s = slowEma[i];
    return f !== null && s !== null ? f - s : null;
  });
  const macdValues = macdLine.filter((v) => v !== null);
  const signalEma = calculateEMA(macdValues, signalPeriod);
  const signalLine = [];
  let signalIdx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] === null) {
      signalLine.push(null);
    } else {
      signalLine.push(signalIdx < signalEma.length ? signalEma[signalIdx] : null);
      signalIdx++;
    }
  }
  const histogram = macdLine.map((m, i) => {
    const s = signalLine[i];
    return m !== null && s !== null ? m - s : null;
  });
  return { macdLine, signalLine, histogram };
}
__name(calculateMACD, "calculateMACD");
function calculateATR(candles, period) {
  if (candles.length < 2) return candles.map(() => null);
  const trueRanges = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trueRanges.push(candles[i].high - candles[i].low);
    } else {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
    }
  }
  const result = [];
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      result.push(trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period);
    } else {
      const prev = result[i - 1];
      if (prev === null) {
        result.push(null);
      } else {
        result.push((prev * (period - 1) + trueRanges[i]) / period);
      }
    }
  }
  return result;
}
__name(calculateATR, "calculateATR");
function calculateADX(candles, period) {
  if (candles.length < period + 1) {
    const empty = candles.map(() => null);
    return { adx: empty, diPlus: empty, diMinus: empty };
  }
  const dmPlus = [];
  const dmMinus = [];
  const trueRanges = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      dmPlus.push(0);
      dmMinus.push(0);
      trueRanges.push(candles[i].high - candles[i].low);
      continue;
    }
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;
    const upMove = high - prevHigh;
    const downMove = prevLow - low;
    dmPlus.push(upMove > downMove && upMove > 0 ? upMove : 0);
    dmMinus.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  const smoothedTR = [];
  const smoothedDMPlus = [];
  const smoothedDMMinus = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      smoothedTR.push(0);
      smoothedDMPlus.push(0);
      smoothedDMMinus.push(0);
    } else if (i === period) {
      smoothedTR.push(trueRanges.slice(1, period + 1).reduce((a, b) => a + b, 0));
      smoothedDMPlus.push(dmPlus.slice(1, period + 1).reduce((a, b) => a + b, 0));
      smoothedDMMinus.push(dmMinus.slice(1, period + 1).reduce((a, b) => a + b, 0));
    } else {
      const prevTR = smoothedTR[i - 1];
      const prevDMP = smoothedDMPlus[i - 1];
      const prevDMM = smoothedDMMinus[i - 1];
      smoothedTR.push(prevTR - prevTR / period + trueRanges[i]);
      smoothedDMPlus.push(prevDMP - prevDMP / period + dmPlus[i]);
      smoothedDMMinus.push(prevDMM - prevDMM / period + dmMinus[i]);
    }
  }
  const diPlusArr = [];
  const diMinusArr = [];
  const dx = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      diPlusArr.push(null);
      diMinusArr.push(null);
      dx.push(null);
    } else {
      const tr = smoothedTR[i];
      const dp = tr === 0 ? 0 : smoothedDMPlus[i] / tr * 100;
      const dm = tr === 0 ? 0 : smoothedDMMinus[i] / tr * 100;
      diPlusArr.push(dp);
      diMinusArr.push(dm);
      const sum = dp + dm;
      dx.push(sum === 0 ? 0 : Math.abs(dp - dm) / sum * 100);
    }
  }
  const adxArr = [];
  let adxSum = 0;
  let adxCount = 0;
  for (let i = 0; i < candles.length; i++) {
    if (i < period * 2) {
      if (dx[i] !== null) {
        adxSum += dx[i];
        adxCount++;
      }
      if (i === period * 2 - 1 && adxCount > 0) {
        adxArr.push(adxSum / adxCount);
      } else {
        adxArr.push(null);
      }
    } else {
      const prev = adxArr[i - 1];
      const currDx = dx[i];
      if (prev !== null && currDx !== null) {
        adxArr.push((prev * (period - 1) + currDx) / period);
      } else {
        adxArr.push(null);
      }
    }
  }
  return { adx: adxArr, diPlus: diPlusArr, diMinus: diMinusArr };
}
__name(calculateADX, "calculateADX");
function calculateBollingerBands(closes, period = 20, stdDevMultiplier = 2) {
  const middle = calculateSMA(closes, period);
  const upper = [];
  const lower = [];
  const bandwidth = [];
  const percentB = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null);
      lower.push(null);
      bandwidth.push(null);
      percentB.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    const u = mean + stdDevMultiplier * stdDev;
    const l = mean - stdDevMultiplier * stdDev;
    upper.push(u);
    lower.push(l);
    bandwidth.push(mean > 0 ? (u - l) / mean : null);
    percentB.push(u !== l ? (closes[i] - l) / (u - l) : 0.5);
  }
  return { upper, middle, lower, bandwidth, percentB };
}
__name(calculateBollingerBands, "calculateBollingerBands");
function calculateSupertrend(candles, period = 10, multiplier = 3) {
  const atr = calculateATR(candles, period);
  const supertrendArr = [];
  const directionArr = [];
  let prevUpperBand = 0;
  let prevLowerBand = 0;
  let prevSupertrend = 0;
  let prevDirection = 1;
  for (let i = 0; i < candles.length; i++) {
    if (i < period || atr[i] === null) {
      supertrendArr.push(null);
      directionArr.push(null);
      continue;
    }
    const hl2 = (candles[i].high + candles[i].low) / 2;
    let upperBand = hl2 + multiplier * atr[i];
    let lowerBand = hl2 - multiplier * atr[i];
    if (i > period) {
      if (lowerBand > prevLowerBand || candles[i - 1].close < prevLowerBand) {
      } else {
        lowerBand = prevLowerBand;
      }
      if (upperBand < prevUpperBand || candles[i - 1].close > prevUpperBand) {
      } else {
        upperBand = prevUpperBand;
      }
    }
    let dir;
    if (i === period) {
      dir = candles[i].close > upperBand ? 1 : -1;
    } else {
      if (prevDirection === 1) {
        dir = candles[i].close < lowerBand ? -1 : 1;
      } else {
        dir = candles[i].close > upperBand ? 1 : -1;
      }
    }
    const st = dir === 1 ? lowerBand : upperBand;
    supertrendArr.push(st);
    directionArr.push(dir);
    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
    prevSupertrend = st;
    prevDirection = dir;
  }
  return { supertrend: supertrendArr, direction: directionArr };
}
__name(calculateSupertrend, "calculateSupertrend");
function calculateOBV(candles) {
  if (candles.length === 0) return [];
  const obv = [0];
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) {
      obv.push(obv[i - 1] + candles[i].volume);
    } else if (candles[i].close < candles[i - 1].close) {
      obv.push(obv[i - 1] - candles[i].volume);
    } else {
      obv.push(obv[i - 1]);
    }
  }
  return obv;
}
__name(calculateOBV, "calculateOBV");
function calculateVWAP(candles) {
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  return candles.map((c) => {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativeTPV += typicalPrice * c.volume;
    cumulativeVolume += c.volume;
    return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : null;
  });
}
__name(calculateVWAP, "calculateVWAP");
function calculateVolatilityPercentile(atrValues, lookback = 100) {
  const recent = atrValues.filter((v) => v !== null).slice(-lookback);
  if (recent.length < 20) return null;
  const current = recent[recent.length - 1];
  const belowCount = recent.filter((v) => v <= current).length;
  return belowCount / recent.length * 100;
}
__name(calculateVolatilityPercentile, "calculateVolatilityPercentile");
function calculateHurstExponent(closes, maxWindow = 64) {
  if (closes.length < maxWindow + 1) return null;
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const windowSizes = [8, 16, 32, 64].filter((w) => w <= maxWindow && w < returns.length);
  if (windowSizes.length < 2) return null;
  const logN = [];
  const logRS = [];
  for (const n2 of windowSizes) {
    const rsValues = [];
    const numSegments = Math.floor(returns.length / n2);
    if (numSegments < 1) continue;
    for (let seg = 0; seg < numSegments; seg++) {
      const segment = returns.slice(seg * n2, (seg + 1) * n2);
      const mean = segment.reduce((a, b) => a + b, 0) / n2;
      const deviations = segment.map((r) => r - mean);
      let cumSum = 0;
      let maxCum = -Infinity;
      let minCum = Infinity;
      for (const d of deviations) {
        cumSum += d;
        if (cumSum > maxCum) maxCum = cumSum;
        if (cumSum < minCum) minCum = cumSum;
      }
      const range = maxCum - minCum;
      const stdDev = Math.sqrt(segment.reduce((s, r) => s + (r - mean) ** 2, 0) / n2);
      if (stdDev > 0) rsValues.push(range / stdDev);
    }
    if (rsValues.length > 0) {
      const avgRS = rsValues.reduce((a, b) => a + b, 0) / rsValues.length;
      logN.push(Math.log(n2));
      logRS.push(Math.log(avgRS));
    }
  }
  if (logN.length < 2) return null;
  const n = logN.length;
  const sumX = logN.reduce((a, b) => a + b, 0);
  const sumY = logRS.reduce((a, b) => a + b, 0);
  const sumXY = logN.reduce((s, x, i) => s + x * logRS[i], 0);
  const sumX2 = logN.reduce((s, x) => s + x * x, 0);
  const hurst = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return Math.max(0, Math.min(1, hurst));
}
__name(calculateHurstExponent, "calculateHurstExponent");
function calculateZScore(closes, period = 20) {
  return closes.map((close, i) => {
    if (i < period - 1) return null;
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    return stdDev > 0 ? (close - mean) / stdDev : 0;
  });
}
__name(calculateZScore, "calculateZScore");
function calculateLinearRegression(closes, period = 20) {
  const slopeArr = [];
  const r2Arr = [];
  const upperArr = [];
  const lowerArr = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      slopeArr.push(null);
      r2Arr.push(null);
      upperArr.push(null);
      lowerArr.push(null);
      continue;
    }
    const y = closes.slice(i - period + 1, i + 1);
    const n = y.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let j = 0; j < n; j++) {
      sumX += j;
      sumY += y[j];
      sumXY += j * y[j];
      sumX2 += j * j;
      sumY2 += y[j] * y[j];
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) {
      slopeArr.push(0);
      r2Arr.push(0);
      upperArr.push(closes[i]);
      lowerArr.push(closes[i]);
      continue;
    }
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const ssRes = y.reduce((s, val, j) => s + (val - (intercept + slope * j)) ** 2, 0);
    const meanY = sumY / n;
    const ssTot = y.reduce((s, val) => s + (val - meanY) ** 2, 0);
    const rSq = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    const residualStdDev = Math.sqrt(ssRes / n);
    const regEnd = intercept + slope * (n - 1);
    slopeArr.push(slope / closes[i]);
    r2Arr.push(Math.max(0, Math.min(1, rSq)));
    upperArr.push(regEnd + 2 * residualStdDev);
    lowerArr.push(regEnd - 2 * residualStdDev);
  }
  return { slope: slopeArr, rSquared: r2Arr, upperChannel: upperArr, lowerChannel: lowerArr };
}
__name(calculateLinearRegression, "calculateLinearRegression");
function calculateKAMA(closes, erPeriod = 10, fastSC = 2, slowSC = 30) {
  if (closes.length < erPeriod + 1) return closes.map(() => null);
  const fastConst = 2 / (fastSC + 1);
  const slowConst = 2 / (slowSC + 1);
  const kama = [];
  for (let i = 0; i < erPeriod; i++) kama.push(null);
  kama.push(closes[erPeriod]);
  for (let i = erPeriod + 1; i < closes.length; i++) {
    const change = Math.abs(closes[i] - closes[i - erPeriod]);
    let volatility = 0;
    for (let j = i - erPeriod + 1; j <= i; j++) {
      volatility += Math.abs(closes[j] - closes[j - 1]);
    }
    const er = volatility > 0 ? change / volatility : 0;
    const sc = (er * (fastConst - slowConst) + slowConst) ** 2;
    const prevKama = kama[i - 1];
    kama.push(prevKama + sc * (closes[i] - prevKama));
  }
  return kama;
}
__name(calculateKAMA, "calculateKAMA");
function calculateAutocorrelation(closes, lag = 1, window = 50) {
  if (closes.length < window + lag + 1) return null;
  const returns = [];
  for (let i = closes.length - window; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  let numerator = 0;
  let denominator = 0;
  for (let i = lag; i < returns.length; i++) {
    numerator += (returns[i] - mean) * (returns[i - lag] - mean);
  }
  for (let i = 0; i < returns.length; i++) {
    denominator += (returns[i] - mean) ** 2;
  }
  return denominator > 0 ? numerator / denominator : 0;
}
__name(calculateAutocorrelation, "calculateAutocorrelation");
function detectVolumeSpikes(candles, threshold = 3, lookback = 20) {
  const spikes = [];
  for (let i = lookback; i < candles.length; i++) {
    const avgVol = candles.slice(i - lookback, i).reduce((s, c) => s + c.volume, 0) / lookback;
    if (avgVol <= 0) continue;
    const ratio = candles[i].volume / avgVol;
    if (ratio >= threshold) {
      spikes.push({
        index: i,
        ratio,
        direction: candles[i].close >= candles[i].open ? "up" : "down"
      });
    }
  }
  return spikes;
}
__name(detectVolumeSpikes, "detectVolumeSpikes");
function periodHighLow(candles, end, period) {
  if (end < period - 1) return null;
  let high = -Infinity;
  let low = Infinity;
  for (let i = end - period + 1; i <= end; i++) {
    if (candles[i].high > high) high = candles[i].high;
    if (candles[i].low < low) low = candles[i].low;
  }
  return { high, low };
}
__name(periodHighLow, "periodHighLow");
function calculateIchimoku(candles, tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52, displacement = 26) {
  const len = candles.length;
  const tenkan = new Array(len).fill(null);
  const kijun = new Array(len).fill(null);
  const senkouA = new Array(len + displacement).fill(null);
  const senkouB = new Array(len + displacement).fill(null);
  const chikou = new Array(len).fill(null);
  for (let i = 0; i < len; i++) {
    const tHL = periodHighLow(candles, i, tenkanPeriod);
    if (tHL) tenkan[i] = (tHL.high + tHL.low) / 2;
    const kHL = periodHighLow(candles, i, kijunPeriod);
    if (kHL) kijun[i] = (kHL.high + kHL.low) / 2;
    if (tenkan[i] !== null && kijun[i] !== null) {
      senkouA[i + displacement] = (tenkan[i] + kijun[i]) / 2;
    }
    const bHL = periodHighLow(candles, i, senkouBPeriod);
    if (bHL) senkouB[i + displacement] = (bHL.high + bHL.low) / 2;
    if (i >= displacement) {
      chikou[i - displacement] = candles[i].close;
    }
  }
  return {
    tenkan,
    kijun,
    senkouA: senkouA.slice(0, len),
    senkouB: senkouB.slice(0, len),
    chikou
  };
}
__name(calculateIchimoku, "calculateIchimoku");
var FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
function calculateFibonacciLevels(candles, lookback = 100) {
  if (candles.length < 10) return null;
  const recent = candles.slice(-Math.min(lookback, candles.length));
  let swingHigh = -Infinity;
  let swingLow = Infinity;
  for (const c of recent) {
    if (c.high > swingHigh) swingHigh = c.high;
    if (c.low < swingLow) swingLow = c.low;
  }
  if (swingHigh === swingLow) return null;
  const lastClose = candles[candles.length - 1].close;
  const midpoint = (swingHigh + swingLow) / 2;
  const direction = lastClose >= midpoint ? "up" : "down";
  const range = swingHigh - swingLow;
  const levels = FIB_RATIOS.map((ratio) => {
    const price = direction === "up" ? swingHigh - ratio * range : swingLow + ratio * range;
    return { ratio, price, label: `${(ratio * 100).toFixed(1)}%` };
  });
  return { levels, swingHigh, swingLow, direction };
}
__name(calculateFibonacciLevels, "calculateFibonacciLevels");
function calculateCVD(candles, emaPeriod = 20) {
  const cvd = [];
  let cumulative = 0;
  for (const c of candles) {
    const range = c.high - c.low;
    const delta = range > 0 ? c.volume * (2 * c.close - c.high - c.low) / range : 0;
    cumulative += delta;
    cvd.push(cumulative);
  }
  const cvdEma = calculateEMA(cvd, emaPeriod);
  return { cvd, cvdEma };
}
__name(calculateCVD, "calculateCVD");

// src/lib/patterns.ts
function bodySize(c) {
  return Math.abs(c.close - c.open);
}
__name(bodySize, "bodySize");
function totalRange(c) {
  return c.high - c.low;
}
__name(totalRange, "totalRange");
function upperWick(c) {
  return c.high - Math.max(c.open, c.close);
}
__name(upperWick, "upperWick");
function lowerWick(c) {
  return Math.min(c.open, c.close) - c.low;
}
__name(lowerWick, "lowerWick");
function isBullish(c) {
  return c.close > c.open;
}
__name(isBullish, "isBullish");
function detectCandlestickPatterns(candles) {
  const patterns = [];
  if (candles.length < 3) return patterns;
  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];
    const range = totalRange(curr);
    if (range === 0) continue;
    const body = bodySize(curr);
    const uWick = upperWick(curr);
    const lWick = lowerWick(curr);
    if (body < range * 0.1) {
      patterns.push({ name: "Doji", type: isBullish(prev) ? "bearish" : "bullish", strength: 0.4, index: i });
    }
    if (lWick > body * 2 && uWick < body * 0.5 && !isBullish(prev)) {
      patterns.push({ name: "Hammer", type: "bullish", strength: 0.65, index: i });
    }
    if (uWick > body * 2 && lWick < body * 0.5 && isBullish(prev)) {
      patterns.push({ name: "Shooting Star", type: "bearish", strength: 0.65, index: i });
    }
    if (i >= 1) {
      const prevBody = bodySize(prev);
      if (isBullish(curr) && !isBullish(prev) && body > prevBody && curr.open <= prev.close && curr.close >= prev.open) {
        patterns.push({ name: "Bullish Engulfing", type: "bullish", strength: 0.75, index: i });
      }
      if (!isBullish(curr) && isBullish(prev) && body > prevBody && curr.open >= prev.close && curr.close <= prev.open) {
        patterns.push({ name: "Bearish Engulfing", type: "bearish", strength: 0.75, index: i });
      }
    }
    if (i >= 2) {
      const prev2 = candles[i - 2];
      const midBody = bodySize(prev);
      const prev2Body = bodySize(prev2);
      if (!isBullish(prev2) && prev2Body > range * 0.3 && midBody < Math.min(prev2Body, body) * 0.3 && isBullish(curr) && curr.close > (prev2.open + prev2.close) / 2) {
        patterns.push({ name: "Morning Star", type: "bullish", strength: 0.8, index: i });
      }
      if (isBullish(prev2) && prev2Body > range * 0.3 && midBody < Math.min(prev2Body, body) * 0.3 && !isBullish(curr) && curr.close < (prev2.open + prev2.close) / 2) {
        patterns.push({ name: "Evening Star", type: "bearish", strength: 0.8, index: i });
      }
    }
  }
  return patterns;
}
__name(detectCandlestickPatterns, "detectCandlestickPatterns");
function getRecentPatterns(candles, lookback = 5) {
  const allPatterns = detectCandlestickPatterns(candles);
  const threshold = candles.length - lookback;
  return allPatterns.filter((p) => p.index >= threshold);
}
__name(getRecentPatterns, "getRecentPatterns");

// src/lib/bayesian.ts
function getBayesianWeight(state, source) {
  return state.accuracies[source]?.bayesWeight ?? 1;
}
__name(getBayesianWeight, "getBayesianWeight");

// src/lib/signals.ts
function scoreToDirection(score) {
  if (score > 0.15) return "long";
  if (score < -0.15) return "short";
  return "neutral";
}
__name(scoreToDirection, "scoreToDirection");
function confidenceToStrength(confidence) {
  if (confidence >= 0.75) return "strong";
  if (confidence >= 0.5) return "moderate";
  if (confidence >= 0.25) return "weak";
  return "none";
}
__name(confidenceToStrength, "confidenceToStrength");
function directionLabel(direction) {
  switch (direction) {
    case "long":
      return "Bullish";
    case "short":
      return "Bearish";
    default:
      return "Neutral";
  }
}
__name(directionLabel, "directionLabel");
function deriveRSISignal(rsi) {
  if (rsi === null) return { direction: "neutral", strength: "none", confidence: 0, label: "RSI N/A", source: "rsi" };
  let direction = "neutral";
  let confidence = 0;
  if (rsi <= 20) {
    direction = "long";
    confidence = 0.9;
  } else if (rsi <= 30) {
    direction = "long";
    confidence = 0.7;
  } else if (rsi <= 40) {
    direction = "long";
    confidence = 0.4;
  } else if (rsi >= 80) {
    direction = "short";
    confidence = 0.9;
  } else if (rsi >= 70) {
    direction = "short";
    confidence = 0.7;
  } else if (rsi >= 60) {
    direction = "short";
    confidence = 0.4;
  } else {
    confidence = 0.2;
  }
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `RSI ${rsi.toFixed(1)}`,
    source: "rsi"
  };
}
__name(deriveRSISignal, "deriveRSISignal");
function deriveStochSignal(k, d) {
  if (k === null || d === null) return { direction: "neutral", strength: "none", confidence: 0, label: "Stoch N/A", source: "stoch" };
  let direction = "neutral";
  let confidence = 0;
  if (k < 20 && d < 20) {
    direction = "long";
    confidence = 0.8;
  } else if (k < 30) {
    direction = "long";
    confidence = 0.5;
  } else if (k > 80 && d > 80) {
    direction = "short";
    confidence = 0.8;
  } else if (k > 70) {
    direction = "short";
    confidence = 0.5;
  } else {
    confidence = 0.2;
  }
  if (k > d && direction === "long") confidence = Math.min(confidence + 0.1, 1);
  if (k < d && direction === "short") confidence = Math.min(confidence + 0.1, 1);
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `Stoch K:${k.toFixed(1)} D:${d.toFixed(1)}`,
    source: "stoch"
  };
}
__name(deriveStochSignal, "deriveStochSignal");
function deriveMACDSignal(macdLine, signal, histogram) {
  if (macdLine === null || signal === null) return { direction: "neutral", strength: "none", confidence: 0, label: "MACD N/A", source: "macd" };
  let direction = "neutral";
  let confidence = 0;
  if (macdLine > signal && macdLine > 0) {
    direction = "long";
    confidence = 0.7;
  } else if (macdLine > signal) {
    direction = "long";
    confidence = 0.5;
  } else if (macdLine < signal && macdLine < 0) {
    direction = "short";
    confidence = 0.7;
  } else if (macdLine < signal) {
    direction = "short";
    confidence = 0.5;
  }
  if (histogram !== null) {
    const histAbs = Math.abs(histogram);
    if (histAbs > 0) confidence = Math.min(confidence + 0.1, 1);
  }
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `MACD ${macdLine.toFixed(2)}`,
    source: "macd"
  };
}
__name(deriveMACDSignal, "deriveMACDSignal");
function deriveADXSignal(adx, direction) {
  if (adx === null) return { direction: "neutral", strength: "none", confidence: 0, label: "ADX N/A", source: "adx" };
  let confidence = 0;
  let adxDirection = direction;
  if (adx >= 40) confidence = 0.9;
  else if (adx >= 25) confidence = 0.6;
  else if (adx >= 20) confidence = 0.3;
  else {
    confidence = 0.1;
    adxDirection = "neutral";
  }
  return {
    direction: adxDirection,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `ADX ${adx.toFixed(1)}`,
    source: "adx"
  };
}
__name(deriveADXSignal, "deriveADXSignal");
function deriveBBSignal(percentB, bandwidth) {
  if (percentB === null) return { direction: "neutral", strength: "none", confidence: 0, label: "BB N/A", source: "bb" };
  let direction = "neutral";
  let confidence = 0;
  if (percentB <= 0) {
    direction = "long";
    confidence = 0.8;
  } else if (percentB <= 0.1) {
    direction = "long";
    confidence = 0.6;
  } else if (percentB <= 0.2) {
    direction = "long";
    confidence = 0.4;
  } else if (percentB >= 1) {
    direction = "short";
    confidence = 0.8;
  } else if (percentB >= 0.9) {
    direction = "short";
    confidence = 0.6;
  } else if (percentB >= 0.8) {
    direction = "short";
    confidence = 0.4;
  } else {
    confidence = 0.1;
  }
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `BB %B ${(percentB * 100).toFixed(0)}%`,
    source: "bb"
  };
}
__name(deriveBBSignal, "deriveBBSignal");
function deriveSupertrendSignal(stDir) {
  if (stDir === null) return { direction: "neutral", strength: "none", confidence: 0, label: "ST N/A", source: "supertrend" };
  const direction = stDir === 1 ? "long" : "short";
  return {
    direction,
    strength: "moderate",
    confidence: 0.65,
    label: `Supertrend ${direction === "long" ? "Bullish" : "Bearish"}`,
    source: "supertrend"
  };
}
__name(deriveSupertrendSignal, "deriveSupertrendSignal");
function deriveFundingSignal(fundingRate) {
  if (fundingRate === null) return { direction: "neutral", strength: "none", confidence: 0, label: "Funding N/A", source: "funding" };
  const absRate = Math.abs(fundingRate);
  let direction = "neutral";
  let confidence = 0;
  if (fundingRate > 1e-3) {
    direction = "short";
    confidence = 0.7;
  } else if (fundingRate > 5e-4) {
    direction = "short";
    confidence = 0.5;
  } else if (fundingRate > 3e-4) {
    direction = "short";
    confidence = 0.3;
  } else if (fundingRate < -5e-4) {
    direction = "long";
    confidence = 0.6;
  } else if (fundingRate < -3e-4) {
    direction = "long";
    confidence = 0.4;
  } else {
    confidence = 0.1;
  }
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `Funding ${(fundingRate * 100).toFixed(4)}%`,
    source: "funding"
  };
}
__name(deriveFundingSignal, "deriveFundingSignal");
function deriveOIDivergenceSignal(oiDivergence) {
  if (oiDivergence === null) return { direction: "neutral", strength: "none", confidence: 0, label: "OI N/A", source: "oi" };
  const abs = Math.abs(oiDivergence);
  const direction = oiDivergence > 0.1 ? "long" : oiDivergence < -0.1 ? "short" : "neutral";
  const confidence = Math.min(abs, 0.8);
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `OI div ${oiDivergence.toFixed(2)}`,
    source: "oi"
  };
}
__name(deriveOIDivergenceSignal, "deriveOIDivergenceSignal");
function deriveZScoreSignal(zScore) {
  if (zScore === null) return { direction: "neutral", strength: "none", confidence: 0, label: "Z N/A", source: "zscore" };
  let direction = "neutral";
  let confidence = 0;
  if (zScore <= -2.5) {
    direction = "long";
    confidence = 0.85;
  } else if (zScore <= -2) {
    direction = "long";
    confidence = 0.7;
  } else if (zScore <= -1.5) {
    direction = "long";
    confidence = 0.45;
  } else if (zScore >= 2.5) {
    direction = "short";
    confidence = 0.85;
  } else if (zScore >= 2) {
    direction = "short";
    confidence = 0.7;
  } else if (zScore >= 1.5) {
    direction = "short";
    confidence = 0.45;
  } else {
    confidence = 0.1;
  }
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `Z-Score ${zScore.toFixed(2)}`,
    source: "zscore"
  };
}
__name(deriveZScoreSignal, "deriveZScoreSignal");
function deriveOBVSignal(obv, obvEma) {
  if (obv === null || obvEma === null) return { direction: "neutral", strength: "none", confidence: 0, label: "OBV N/A", source: "obv" };
  const direction = obv > obvEma ? "long" : obv < obvEma ? "short" : "neutral";
  const diff = obvEma !== 0 ? Math.abs(obv - obvEma) / Math.abs(obvEma) : 0;
  const confidence = Math.min(diff * 5, 0.6);
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `OBV ${direction === "long" ? ">" : "<"} EMA`,
    source: "obv"
  };
}
__name(deriveOBVSignal, "deriveOBVSignal");
function deriveVWAPSignal(close, vwap) {
  if (close === null || vwap === null) return { direction: "neutral", strength: "none", confidence: 0, label: "VWAP N/A", source: "vwap" };
  const direction = close > vwap ? "long" : close < vwap ? "short" : "neutral";
  const deviation = Math.abs(close - vwap) / vwap;
  const confidence = Math.min(deviation * 20, 0.55);
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `Price ${direction === "long" ? ">" : "<"} VWAP`,
    source: "vwap"
  };
}
__name(deriveVWAPSignal, "deriveVWAPSignal");
function derivePatternSignal(candles) {
  if (candles.length < 5) return { direction: "neutral", strength: "none", confidence: 0, label: "Pattern N/A", source: "pattern" };
  const recent = getRecentPatterns(candles, 3);
  if (recent.length === 0) return { direction: "neutral", strength: "none", confidence: 0, label: "No pattern", source: "pattern" };
  const strongest = recent.reduce((best, p) => p.strength > best.strength ? p : best, recent[0]);
  const direction = strongest.type === "bullish" ? "long" : "short";
  return {
    direction,
    strength: confidenceToStrength(strongest.strength),
    confidence: strongest.strength,
    label: strongest.name,
    source: "pattern"
  };
}
__name(derivePatternSignal, "derivePatternSignal");
function deriveIchimokuSignal(close, tenkan, kijun, senkouA, senkouB) {
  if (close === null || tenkan === null || kijun === null || senkouA === null || senkouB === null) {
    return { direction: "neutral", strength: "none", confidence: 0, label: "Ichimoku N/A", source: "ichimoku" };
  }
  const cloudTop = Math.max(senkouA, senkouB);
  const cloudBottom = Math.min(senkouA, senkouB);
  let direction = "neutral";
  let confidence = 0;
  if (close > cloudTop) {
    direction = "long";
    confidence = 0.6;
    if (tenkan > kijun) confidence = 0.75;
  } else if (close < cloudBottom) {
    direction = "short";
    confidence = 0.6;
    if (tenkan < kijun) confidence = 0.75;
  } else {
    confidence = 0.1;
  }
  const tkState = tenkan > kijun ? "TK Bull" : tenkan < kijun ? "TK Bear" : "TK Flat";
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `Ichimoku ${tkState}`,
    source: "ichimoku"
  };
}
__name(deriveIchimokuSignal, "deriveIchimokuSignal");
function deriveFibSignal(close, fibResult) {
  if (close === null || fibResult === null) {
    return { direction: "neutral", strength: "none", confidence: 0, label: "Fib N/A", source: "fib" };
  }
  const keyRatios = [0.382, 0.5, 0.618];
  let nearestDist = Infinity;
  let nearestLabel = "";
  for (const level of fibResult.levels) {
    if (!keyRatios.includes(level.ratio)) continue;
    const dist = Math.abs(close - level.price) / level.price;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestLabel = level.label;
    }
  }
  if (nearestDist > 3e-3) {
    return { direction: "neutral", strength: "none", confidence: 0.1, label: "Fib away", source: "fib" };
  }
  const direction = fibResult.direction === "up" ? "long" : "short";
  const confidence = nearestDist < 1e-3 ? 0.5 : 0.4;
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `Fib ${nearestLabel}`,
    source: "fib"
  };
}
__name(deriveFibSignal, "deriveFibSignal");
function deriveCVDSignal(cvd, cvdEma) {
  if (cvd === null || cvdEma === null) {
    return { direction: "neutral", strength: "none", confidence: 0, label: "CVD N/A", source: "cvd" };
  }
  const direction = cvd > cvdEma ? "long" : cvd < cvdEma ? "short" : "neutral";
  const diff = cvdEma !== 0 ? Math.abs(cvd - cvdEma) / Math.abs(cvdEma) : 0;
  const confidence = Math.min(diff * 3, 0.65);
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `CVD ${direction === "long" ? "Buying" : "Selling"}`,
    source: "cvd"
  };
}
__name(deriveCVDSignal, "deriveCVDSignal");
function calculateRegimeWeights(hurst, adx, volPct) {
  const weights = {
    rsi: 1,
    stoch: 1,
    macd: 1,
    adx: 1,
    bb: 1,
    supertrend: 1,
    funding: 1,
    oi: 1,
    zscore: 1,
    obv: 1,
    vwap: 1,
    pattern: 1,
    ichimoku: 1,
    cvd: 1,
    fib: 1,
    "divergence-rsi": 1,
    "divergence-macd": 1
  };
  if (hurst !== null) {
    if (hurst > 0.6) {
      weights.macd *= 1.3;
      weights.supertrend *= 1.3;
      weights.adx *= 1.2;
      weights.ichimoku *= 1.3;
      weights.rsi *= 0.7;
      weights.bb *= 0.7;
      weights.zscore *= 0.7;
    } else if (hurst < 0.4) {
      weights.rsi *= 1.3;
      weights.bb *= 1.3;
      weights.zscore *= 1.3;
      weights.macd *= 0.7;
      weights.supertrend *= 0.7;
      weights.ichimoku *= 0.7;
    } else {
      for (const key of Object.keys(weights)) {
        weights[key] *= 0.8;
      }
    }
  }
  if (volPct !== null && volPct >= 80) {
    weights.obv *= 1.2;
    weights.cvd *= 1.2;
    weights.funding *= 1.3;
    weights.oi *= 1.2;
  }
  return weights;
}
__name(calculateRegimeWeights, "calculateRegimeWeights");
function clampScore(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
__name(clampScore, "clampScore");
function layerDir(v) {
  return v > 5 ? "bullish" : v < -5 ? "bearish" : "neutral";
}
__name(layerDir, "layerDir");
function avgLayers(layers) {
  if (layers.length === 0) return 0;
  return layers.reduce((s, l) => s + l.value, 0) / layers.length;
}
__name(avgLayers, "avgLayers");
function deriveTrendBias(comp) {
  const trendLayers = [];
  if (comp.supertrendDirection !== null) {
    const v = comp.supertrendDirection === 1 ? 100 : -100;
    trendLayers.push({ label: "ST", value: v, direction: v > 0 ? "bullish" : "bearish" });
  }
  if (comp.ema10 !== null && comp.ema50 !== null) {
    let emaScore = 0;
    emaScore += comp.ema10 > comp.ema50 ? 33.3 : -33.3;
    if (comp.sma200 !== null) {
      emaScore += comp.ema50 > comp.sma200 ? 33.3 : -33.3;
      emaScore += comp.ema10 > comp.sma200 ? 33.3 : -33.3;
    }
    const v = clampScore(emaScore, -100, 100);
    trendLayers.push({ label: "EMA", value: v, direction: layerDir(v) });
  }
  if (comp.linearRegressionSlope !== null && comp.close !== null && comp.close > 0) {
    const v = clampScore(comp.linearRegressionSlope / comp.close * 1e4, -100, 100);
    trendLayers.push({ label: "LR", value: v, direction: layerDir(v) });
  }
  const trendScore = avgLayers(trendLayers);
  const momentumLayers = [];
  if (comp.macdHistogram !== null && comp.close !== null && comp.close > 0) {
    const sign = comp.macdHistogram > 0 ? 50 : comp.macdHistogram < 0 ? -50 : 0;
    const boost = clampScore(comp.macdHistogram / comp.close * 5e4, -50, 50);
    const v = clampScore(sign + boost, -100, 100);
    momentumLayers.push({ label: "MACD", value: v, direction: layerDir(v) });
  }
  if (comp.rsi !== null) {
    const v = clampScore((comp.rsi - 50) * 2, -100, 100);
    momentumLayers.push({ label: "RSI", value: v, direction: layerDir(v) });
  }
  const momentumScore = avgLayers(momentumLayers);
  const volumeLayers = [];
  if (comp.obv !== null && comp.obvEma !== null) {
    const v = comp.obv > comp.obvEma ? 70 : comp.obv < comp.obvEma ? -70 : 0;
    volumeLayers.push({ label: "OBV", value: v, direction: v > 0 ? "bullish" : v < 0 ? "bearish" : "neutral" });
  }
  if (comp.cvd !== null && comp.cvdEma !== null) {
    const v = comp.cvd > comp.cvdEma ? 70 : comp.cvd < comp.cvdEma ? -70 : 0;
    volumeLayers.push({ label: "CVD", value: v, direction: v > 0 ? "bullish" : v < 0 ? "bearish" : "neutral" });
  }
  if (comp.close !== null && comp.vwap !== null) {
    const v = comp.close > comp.vwap ? 70 : comp.close < comp.vwap ? -70 : 0;
    volumeLayers.push({ label: "VWAP", value: v, direction: v > 0 ? "bullish" : v < 0 ? "bearish" : "neutral" });
  }
  const volumeScore = avgLayers(volumeLayers);
  const structureLayers = [];
  if (comp.close !== null && comp.ichimokuSenkouA !== null && comp.ichimokuSenkouB !== null) {
    const cloudTop = Math.max(comp.ichimokuSenkouA, comp.ichimokuSenkouB);
    const cloudBottom = Math.min(comp.ichimokuSenkouA, comp.ichimokuSenkouB);
    const v = comp.close > cloudTop ? 80 : comp.close < cloudBottom ? -80 : 0;
    structureLayers.push({ label: "Cloud", value: v, direction: v > 0 ? "bullish" : v < 0 ? "bearish" : "neutral" });
  }
  if (comp.ichimokuTenkan !== null && comp.ichimokuKijun !== null) {
    const v = comp.ichimokuTenkan > comp.ichimokuKijun ? 80 : comp.ichimokuTenkan < comp.ichimokuKijun ? -80 : 0;
    structureLayers.push({ label: "TK", value: v, direction: v > 0 ? "bullish" : v < 0 ? "bearish" : "neutral" });
  }
  const structureScore = avgLayers(structureLayers);
  const regimeLayers = [];
  let adxMultiplier = 1;
  if (comp.adx !== null) {
    adxMultiplier = comp.adx >= 30 ? 1.2 : comp.adx >= 20 ? 1 : comp.adx >= 15 ? 0.85 : 0.7;
    const v = comp.adx >= 25 ? 60 : comp.adx >= 20 ? 30 : comp.adx >= 15 ? -20 : -50;
    regimeLayers.push({ label: "ADX", value: v, direction: v > 0 ? "bullish" : "bearish" });
  }
  if (comp.hurstExponent !== null) {
    const v = comp.hurstExponent > 0.6 ? 60 : comp.hurstExponent < 0.4 ? -60 : 0;
    regimeLayers.push({ label: "Hurst", value: v, direction: v > 0 ? "bullish" : v < 0 ? "bearish" : "neutral" });
  }
  const regimeScore = avgLayers(regimeLayers);
  const catWeights = [0.35, 0.25, 0.15, 0.15, 0.1];
  const catScores = [trendScore, momentumScore, volumeScore, structureScore, regimeScore];
  const catLayerArrays = [trendLayers, momentumLayers, volumeLayers, structureLayers, regimeLayers];
  const catLabels = ["Trend", "Momentum", "Volume", "Structure", "Regime"];
  let rawScore = 0;
  let totalWeight = 0;
  const categories = [];
  for (let i = 0; i < 5; i++) {
    if (catLayerArrays[i].length > 0) {
      rawScore += catScores[i] * catWeights[i];
      totalWeight += catWeights[i];
    }
    categories.push({
      label: catLabels[i],
      score: catScores[i],
      weight: catWeights[i],
      layers: catLayerArrays[i]
    });
  }
  const normalizedScore = totalWeight > 0 ? rawScore / totalWeight : 0;
  const finalScore = clampScore(normalizedScore * adxMultiplier, -100, 100);
  const allLayers = categories.flatMap((c) => c.layers).filter((l) => l.value !== 0);
  const agreeCount = allLayers.filter(
    (l) => finalScore > 0 && l.value > 0 || finalScore < 0 && l.value < 0
  ).length;
  const confidence = allLayers.length > 0 ? agreeCount / allLayers.length : 0;
  const direction = finalScore > 10 ? "long" : finalScore < -10 ? "short" : "neutral";
  const macdTrend = comp.macdHistogram !== null ? comp.macdHistogram > 0 ? "bullish" : comp.macdHistogram < 0 ? "bearish" : "neutral" : "neutral";
  const emaTrend = comp.ema10 !== null && comp.ema50 !== null ? comp.ema10 > comp.ema50 ? "bullish" : "bearish" : "neutral";
  const adxStrength = comp.adx !== null ? comp.adx >= 30 ? "strong" : comp.adx >= 20 ? "moderate" : "weak" : "weak";
  return {
    direction,
    score: Math.round(finalScore * 10) / 10,
    confidence,
    categories,
    macdTrend,
    emaTrend,
    adxStrength
  };
}
__name(deriveTrendBias, "deriveTrendBias");
function deriveCombinedSignal(comp, markovPrior = 0, bayesianState, fibResult) {
  const rsiSignal = deriveRSISignal(comp.rsi);
  const stochSignal = deriveStochSignal(comp.stochK, comp.stochD);
  const macdSignal = deriveMACDSignal(comp.macdLine, comp.macdSignal, comp.macdHistogram);
  const trendBias = deriveTrendBias(comp);
  const trendDirection = trendBias.direction;
  const adxSignal = deriveADXSignal(comp.adx, trendDirection);
  const bbSignal = deriveBBSignal(comp.bbPercentB, comp.bbBandwidth);
  const stSignal = deriveSupertrendSignal(comp.supertrendDirection);
  const fundingSignal = deriveFundingSignal(comp.fundingRate);
  const oiSignal = deriveOIDivergenceSignal(comp.oiDivergence);
  const zScoreSignal = deriveZScoreSignal(comp.zScore);
  const obvSignal = deriveOBVSignal(comp.obv, comp.obvEma);
  const vwapSignal = deriveVWAPSignal(comp.close, comp.vwap);
  const patternSignal = derivePatternSignal(comp.candles);
  const ichimokuSignal = deriveIchimokuSignal(comp.close, comp.ichimokuTenkan, comp.ichimokuKijun, comp.ichimokuSenkouA, comp.ichimokuSenkouB);
  const cvdSignal = deriveCVDSignal(comp.cvd, comp.cvdEma);
  const fibSignal = deriveFibSignal(comp.close, fibResult ?? null);
  const signals = [
    rsiSignal,
    stochSignal,
    macdSignal,
    adxSignal,
    bbSignal,
    stSignal,
    fundingSignal,
    oiSignal,
    zScoreSignal,
    obvSignal,
    vwapSignal,
    patternSignal,
    ichimokuSignal,
    cvdSignal,
    fibSignal
  ];
  const regimeWeights = calculateRegimeWeights(comp.hurstExponent, comp.adx, comp.volatilityPercentile);
  let weightedScore = 0;
  let totalWeight = 0;
  for (const sig of signals) {
    const regimeW = regimeWeights[sig.source] ?? 1;
    const bayesW = bayesianState ? getBayesianWeight(bayesianState, sig.source) : 1;
    const combinedWeight = regimeW * bayesW;
    const dirMultiplier = sig.direction === "long" ? 1 : sig.direction === "short" ? -1 : 0;
    weightedScore += dirMultiplier * sig.confidence * combinedWeight;
    totalWeight += (sig.confidence || 0.1) * combinedWeight;
  }
  weightedScore += markovPrior * 0.15;
  totalWeight += Math.abs(markovPrior) * 0.15;
  const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
  const confidence = Math.min(Math.abs(normalizedScore), 1);
  const direction = scoreToDirection(normalizedScore);
  const adxConfirmation = comp.adx !== null && comp.adx >= 20;
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `${directionLabel(direction)} (${(confidence * 100).toFixed(0)}%)`,
    signals,
    trendScore: trendBias.score,
    adxConfirmation,
    markovPrior
  };
}
__name(deriveCombinedSignal, "deriveCombinedSignal");
function deriveTimeframeSnapshots(computations, markovPriors = {}, bayesianState, fibResults) {
  return computations.map((comp) => {
    const prior = markovPriors[comp.timeframe] ?? 0;
    const fibResult = fibResults?.[comp.timeframe] ?? null;
    const signal = deriveCombinedSignal(comp, prior, bayesianState, fibResult);
    const trendBias = deriveTrendBias(comp);
    return {
      timeframe: comp.timeframe,
      timeframeLabel: comp.timeframeLabel,
      signal,
      rsi: comp.rsi,
      stochK: comp.stochK,
      stochD: comp.stochD,
      macdLine: comp.macdLine,
      macdSignal: comp.macdSignal,
      macdHistogram: comp.macdHistogram,
      adx: comp.adx,
      atr: comp.atr,
      close: comp.close,
      ema10: comp.ema10,
      ema50: comp.ema50,
      sma200: comp.sma200,
      trendBias,
      bbPercentB: comp.bbPercentB,
      bbBandwidth: comp.bbBandwidth,
      supertrendDirection: comp.supertrendDirection,
      obv: comp.obv,
      vwap: comp.vwap,
      volatilityPercentile: comp.volatilityPercentile,
      hurstExponent: comp.hurstExponent,
      zScore: comp.zScore,
      rSquared: comp.rSquared,
      linearRegressionSlope: comp.linearRegressionSlope,
      kama: comp.kama,
      autocorrelation: comp.autocorrelation,
      oiDivergence: comp.oiDivergence,
      volumeSpikeRatio: comp.volumeSpikeRatio,
      ichimokuTenkan: comp.ichimokuTenkan,
      ichimokuKijun: comp.ichimokuKijun,
      ichimokuSenkouA: comp.ichimokuSenkouA,
      ichimokuSenkouB: comp.ichimokuSenkouB,
      cvd: comp.cvd,
      cvdEma: comp.cvdEma
    };
  });
}
__name(deriveTimeframeSnapshots, "deriveTimeframeSnapshots");
function calculateMarkovPrior(candles, lookback = 50) {
  if (candles.length < lookback + 2) return 0;
  const recentCandles = candles.slice(-lookback);
  let weightedUp = 0;
  let weightedDown = 0;
  let totalWeight = 0;
  for (let i = 1; i < recentCandles.length; i++) {
    const weight = i / recentCandles.length;
    const change = (recentCandles[i].close - recentCandles[i - 1].close) / recentCandles[i - 1].close;
    if (change > 0) weightedUp += weight * change;
    else weightedDown += weight * Math.abs(change);
    totalWeight += weight;
  }
  if (totalWeight === 0) return 0;
  return (weightedUp - weightedDown) / totalWeight * 100;
}
__name(calculateMarkovPrior, "calculateMarkovPrior");
function calculateMultiTimeframeMarkovPriors(candlesByTimeframe) {
  const priors = {};
  for (const [tf, candles] of Object.entries(candlesByTimeframe)) {
    priors[tf] = calculateMarkovPrior(candles);
  }
  return priors;
}
__name(calculateMultiTimeframeMarkovPriors, "calculateMultiTimeframeMarkovPriors");
var BASE_TF_WEIGHTS = {
  "5": 1,
  "15": 1.5,
  "30": 2,
  "60": 3,
  "120": 4,
  "240": 5,
  "360": 6,
  "D": 7,
  "W": 8
};
function calculateAdaptiveTFWeights(snapshots) {
  let hurstSum = 0;
  let hurstCount = 0;
  for (const snap of snapshots) {
    if (snap.hurstExponent !== null) {
      hurstSum += snap.hurstExponent;
      hurstCount++;
    }
  }
  const avgHurst = hurstCount > 0 ? hurstSum / hurstCount : 0.5;
  const weights = { ...BASE_TF_WEIGHTS };
  if (avgHurst > 0.6) {
    weights["5"] *= 0.8;
    weights["15"] *= 0.8;
    weights["30"] *= 1;
    weights["60"] *= 1.1;
    weights["120"] *= 1.3;
    weights["240"] *= 1.3;
    weights["360"] *= 1.3;
    weights["D"] *= 1.3;
    weights["W"] *= 1.3;
  } else if (avgHurst < 0.4) {
    weights["5"] *= 1.2;
    weights["15"] *= 1.2;
    weights["30"] *= 1.1;
    weights["60"] *= 1;
    weights["120"] *= 0.9;
    weights["240"] *= 0.9;
    weights["360"] *= 0.9;
    weights["D"] *= 0.8;
    weights["W"] *= 0.8;
  }
  return weights;
}
__name(calculateAdaptiveTFWeights, "calculateAdaptiveTFWeights");
var TF_WEIGHTS = {
  "5": 1,
  "15": 1.5,
  "30": 2,
  "60": 3,
  "120": 4,
  "240": 5,
  "360": 6,
  "D": 7,
  "W": 8
};
function deriveMultiTimeframeConfluence(snapshots, bayesianState) {
  const adaptiveWeights = calculateAdaptiveTFWeights(snapshots);
  let weightedLong = 0;
  let weightedShort = 0;
  let totalWeight = 0;
  let longCount = 0;
  let shortCount = 0;
  let neutralCount = 0;
  for (const snap of snapshots) {
    let weight = adaptiveWeights[snap.timeframe] ?? TF_WEIGHTS[snap.timeframe] ?? 1;
    if (snap.hurstExponent !== null) {
      if (snap.hurstExponent > 0.6) weight *= 1.2;
      else if (snap.hurstExponent < 0.4) weight *= 0.9;
    }
    if (bayesianState) {
      const avgBayes = snap.signal.signals.reduce(
        (sum, sig) => sum + getBayesianWeight(bayesianState, sig.source),
        0
      ) / Math.max(snap.signal.signals.length, 1);
      weight *= Math.min(avgBayes, 1.5);
    }
    if (snap.signal.direction === "long") {
      weightedLong += weight * snap.signal.confidence;
      longCount++;
    } else if (snap.signal.direction === "short") {
      weightedShort += weight * snap.signal.confidence;
      shortCount++;
    } else {
      neutralCount++;
    }
    totalWeight += weight;
  }
  const score = totalWeight > 0 ? (weightedLong - weightedShort) / totalWeight : 0;
  const direction = score > 0.1 ? "long" : score < -0.1 ? "short" : "neutral";
  const dominant = Math.max(longCount, shortCount);
  const alignmentRatio = snapshots.length > 0 ? dominant / snapshots.length : 0;
  let confluenceLevel;
  if (alignmentRatio >= 0.7 && dominant >= 4) confluenceLevel = "strong";
  else if (alignmentRatio >= 0.5 && dominant >= 3) confluenceLevel = "moderate";
  else if (dominant >= 2) confluenceLevel = "weak";
  else confluenceLevel = "mixed";
  return {
    direction,
    score,
    alignmentRatio,
    confluenceLevel,
    longCount,
    shortCount,
    neutralCount
  };
}
__name(deriveMultiTimeframeConfluence, "deriveMultiTimeframeConfluence");

// shared/config.ts
var RSI_SETTINGS = {
  "5": { period: 8, label: "7\u20139" },
  "15": { period: 11, label: "9\u201312" },
  "30": { period: 13, label: "12\u201314" },
  "60": { period: 15, label: "14\u201316" },
  "120": { period: 17, label: "16\u201318" },
  "240": { period: 20, label: "18\u201321" },
  "360": { period: 23, label: "21\u201324" },
  "D": { period: 14, label: "14" },
  "W": { period: 14, label: "14" }
};
var DEFAULT_RSI = { period: 14, label: "14" };
var STOCH_SETTINGS = {
  "5": { rsiLength: 7, stochLength: 7, kSmoothing: 2, dSmoothing: 2 },
  "15": { rsiLength: 9, stochLength: 9, kSmoothing: 2, dSmoothing: 3 },
  "30": { rsiLength: 12, stochLength: 12, kSmoothing: 3, dSmoothing: 3 },
  "60": { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 },
  "120": { rsiLength: 16, stochLength: 16, kSmoothing: 3, dSmoothing: 3 },
  "240": { rsiLength: 21, stochLength: 21, kSmoothing: 4, dSmoothing: 4 },
  "360": { rsiLength: 24, stochLength: 24, kSmoothing: 4, dSmoothing: 4 },
  "D": { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 },
  "W": { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 }
};
var DEFAULT_STOCH = { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 };
var MACD_SETTINGS = {
  "5": { fast: 8, slow: 21, signal: 5 },
  "15": { fast: 10, slow: 24, signal: 7 },
  "30": { fast: 12, slow: 26, signal: 9 },
  "60": { fast: 12, slow: 30, signal: 9 },
  "120": { fast: 16, slow: 36, signal: 9 },
  "240": { fast: 20, slow: 40, signal: 9 },
  "360": { fast: 22, slow: 44, signal: 10 },
  "D": { fast: 12, slow: 26, signal: 9 },
  "W": { fast: 12, slow: 26, signal: 9 }
};
var DEFAULT_MACD = { fast: 12, slow: 26, signal: 9 };
var TF_LABELS = {
  "5": "5m",
  "15": "15m",
  "30": "30m",
  "60": "1H",
  "120": "2H",
  "240": "4H",
  "360": "6H",
  "D": "1D",
  "W": "1W"
};
var MONITORED_TIMEFRAMES = ["60", "120", "240", "360", "D", "W"];
var COOLDOWN_SECS = {
  "5": 300,
  "15": 900,
  "30": 1800,
  "60": 3600,
  "120": 7200,
  "240": 14400,
  "360": 21600,
  "D": 86400,
  "W": 604800
};

// worker/compute.ts
var BYBIT_LIMIT = 200;
async function fetchCandles(symbol, interval, limit = BYBIT_LIMIT) {
  const url = new URL("https://api.bybit.com/v5/market/kline");
  url.searchParams.set("category", "linear");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(Math.min(limit, BYBIT_LIMIT)));
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Bybit OHLCV fetch failed: ${res.status}`);
  const json2 = await res.json();
  if (json2.retCode !== 0 || !json2.result?.list) throw new Error(json2.retMsg ?? "Bybit error");
  return json2.result.list.map((e) => ({
    openTime: Number(e[0]),
    open: Number(e[1]),
    high: Number(e[2]),
    low: Number(e[3]),
    close: Number(e[4]),
    volume: Number(e[5]),
    turnover: Number(e[6] ?? 0),
    closeTime: Number(e[0]) + 1
  })).sort((a, b) => a.openTime - b.openTime);
}
__name(fetchCandles, "fetchCandles");
async function fetchTicker(symbol) {
  const url = new URL("https://api.bybit.com/v5/market/tickers");
  url.searchParams.set("category", "linear");
  url.searchParams.set("symbol", symbol);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Bybit ticker fetch failed: ${res.status}`);
  const json2 = await res.json();
  if (json2.retCode !== 0 || !json2.result?.list?.[0]) throw new Error(json2.retMsg ?? "Ticker error");
  const t = json2.result.list[0];
  return {
    fundingRate: parseFloat(t.fundingRate ?? "0"),
    markPrice: parseFloat(t.markPrice ?? "0")
  };
}
__name(fetchTicker, "fetchTicker");
function buildComputations(multiFrameCandles, symbol, fundingRate = null) {
  return multiFrameCandles.filter((r) => r.candles.length >= 55).map((r) => {
    const c = r.candles.map((x) => x.close);
    const tfRsiSetting = RSI_SETTINGS[r.timeframe] ?? DEFAULT_RSI;
    const tfStochSetting = STOCH_SETTINGS[r.timeframe] ?? DEFAULT_STOCH;
    const tfMacdSetting = MACD_SETTINGS[r.timeframe] ?? DEFAULT_MACD;
    const tfRsi = calculateRSI(c, tfRsiSetting.period);
    const tfStoch = calculateStochasticRSI(c, tfStochSetting.rsiLength, tfStochSetting.stochLength, tfStochSetting.kSmoothing, tfStochSetting.dSmoothing);
    const tfMacd = calculateMACD(c, tfMacdSetting.fast, tfMacdSetting.slow, tfMacdSetting.signal);
    const tfEma10 = calculateEMA(c, 10);
    const tfEma50 = calculateEMA(c, 50);
    const tfSma200 = calculateSMA(c, 200);
    const tfAdx = calculateADX(r.candles, 14);
    const tfAtr = calculateATR(r.candles, 14);
    const tfBB = calculateBollingerBands(c, 20, 2);
    const tfST = calculateSupertrend(r.candles, 10, 3);
    const tfOBV = calculateOBV(r.candles);
    const tfOBVEma = calculateEMA(tfOBV, 20);
    const tfVWAP = calculateVWAP(r.candles);
    const tfVolPct = calculateVolatilityPercentile(tfAtr);
    const tfHurst = calculateHurstExponent(c);
    const tfZScore = calculateZScore(c);
    const tfLinReg = calculateLinearRegression(c);
    const tfKAMA = calculateKAMA(c);
    const tfAutocorr = calculateAutocorrelation(c);
    const tfVolSpikes = detectVolumeSpikes(r.candles);
    const tfIchimoku = calculateIchimoku(r.candles);
    const tfCVD = calculateCVD(r.candles);
    const len = r.candles.length;
    return {
      symbol,
      timeframe: r.timeframe,
      timeframeLabel: TF_LABELS[r.timeframe] ?? r.timeframe,
      rsi: tfRsi[tfRsi.length - 1] ?? null,
      stochK: tfStoch.kValues[tfStoch.kValues.length - 1] ?? null,
      stochD: tfStoch.dValues[tfStoch.dValues.length - 1] ?? null,
      macdLine: tfMacd.macdLine[tfMacd.macdLine.length - 1] ?? null,
      macdSignal: tfMacd.signalLine[tfMacd.signalLine.length - 1] ?? null,
      macdHistogram: tfMacd.histogram[tfMacd.histogram.length - 1] ?? null,
      ema10: tfEma10[tfEma10.length - 1] ?? null,
      ema50: tfEma50[tfEma50.length - 1] ?? null,
      sma200: tfSma200[tfSma200.length - 1] ?? null,
      adx: tfAdx.adx[tfAdx.adx.length - 1] ?? null,
      atr: tfAtr[tfAtr.length - 1] ?? null,
      close: c[c.length - 1] ?? null,
      volume: r.candles[r.candles.length - 1]?.volume ?? null,
      candles: r.candles,
      bbUpper: tfBB.upper[tfBB.upper.length - 1] ?? null,
      bbLower: tfBB.lower[tfBB.lower.length - 1] ?? null,
      bbPercentB: tfBB.percentB[tfBB.percentB.length - 1] ?? null,
      bbBandwidth: tfBB.bandwidth[tfBB.bandwidth.length - 1] ?? null,
      supertrendValue: tfST.supertrend[tfST.supertrend.length - 1] ?? null,
      supertrendDirection: tfST.direction[tfST.direction.length - 1] ?? null,
      obv: tfOBV[tfOBV.length - 1] ?? null,
      obvEma: tfOBVEma[tfOBVEma.length - 1] ?? null,
      vwap: tfVWAP[tfVWAP.length - 1] ?? null,
      volatilityPercentile: tfVolPct,
      fundingRate,
      hurstExponent: tfHurst,
      zScore: tfZScore[tfZScore.length - 1] ?? null,
      rSquared: tfLinReg.rSquared[tfLinReg.rSquared.length - 1] ?? null,
      linearRegressionSlope: tfLinReg.slope[tfLinReg.slope.length - 1] ?? null,
      kama: tfKAMA[tfKAMA.length - 1] ?? null,
      autocorrelation: tfAutocorr,
      oiDivergence: null,
      volumeSpikeRatio: tfVolSpikes.length > 0 ? tfVolSpikes[tfVolSpikes.length - 1]?.ratio ?? null : null,
      ichimokuTenkan: tfIchimoku.tenkan[len - 1] ?? null,
      ichimokuKijun: tfIchimoku.kijun[len - 1] ?? null,
      ichimokuSenkouA: tfIchimoku.senkouA[len - 1] ?? null,
      ichimokuSenkouB: tfIchimoku.senkouB[len - 1] ?? null,
      ichimokuChikou: tfIchimoku.chikou[len - 1] ?? null,
      cvd: tfCVD.cvd[tfCVD.cvd.length - 1] ?? null,
      cvdEma: tfCVD.cvdEma[tfCVD.cvdEma.length - 1] ?? null
    };
  });
}
__name(buildComputations, "buildComputations");
function lastValid(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null) return arr[i];
  }
  return null;
}
__name(lastValid, "lastValid");
function prevValid(arr) {
  let found = false;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null) {
      if (found) return arr[i];
      found = true;
    }
  }
  return null;
}
__name(prevValid, "prevValid");
function detectMACrossFromCandles(candles) {
  const c = candles.map((x) => x.close);
  const ema10 = calculateEMA(c, 10);
  const ema50 = calculateEMA(c, 50);
  const cur10 = lastValid(ema10);
  const cur50 = lastValid(ema50);
  const prev10 = prevValid(ema10);
  const prev50 = prevValid(ema50);
  if (cur10 === null || cur50 === null || prev10 === null || prev50 === null) return null;
  if (prev10 <= prev50 && cur10 > cur50) return "golden";
  if (prev10 >= prev50 && cur10 < cur50) return "death";
  return null;
}
__name(detectMACrossFromCandles, "detectMACrossFromCandles");
function generateAlertsFromComputations(computations, symbol, fundingRate) {
  const alerts = [];
  if (fundingRate !== null && Math.abs(fundingRate) >= 5e-4) {
    const dir = fundingRate > 0 ? "longs paying shorts" : "shorts paying longs";
    alerts.push({
      title: `\u{1F4B0} Extreme Funding Rate \u2014 ${symbol}`,
      body: `Funding rate ${(fundingRate * 100).toFixed(4)}% (${dir})`,
      tag: `funding-${symbol}`
    });
  }
  for (const comp of computations) {
    const tf = comp.timeframe;
    if (!MONITORED_TIMEFRAMES.includes(tf)) continue;
    if (!comp.close || !comp.candles.length) continue;
    const tfLabel = comp.timeframeLabel;
    const cross = detectMACrossFromCandles(comp.candles);
    if (cross) {
      alerts.push({
        title: `${cross === "golden" ? "\u{1F7E1} Golden" : "\u{1F7E3} Death"} Cross \u2014 ${symbol} (${tfLabel})`,
        body: `EMA 10/50 ${cross} cross at $${comp.close.toLocaleString()}`,
        tag: `macross-${symbol}-${tf}-${cross}`,
        url: "/"
      });
    }
    const rsi = comp.rsi;
    const stochD = comp.stochD;
    if (rsi !== null && stochD !== null) {
      if (rsi < 25 && stochD < 15) {
        alerts.push({
          title: `\u{1F7E2} LONG Momentum \u2014 ${symbol} (${tfLabel})`,
          body: `RSI: ${rsi.toFixed(1)} | Stoch D: ${stochD.toFixed(1)}`,
          tag: `momentum-${symbol}-${tf}-long`,
          url: "/"
        });
      } else if (rsi > 75 && stochD > 85) {
        alerts.push({
          title: `\u{1F534} SHORT Momentum \u2014 ${symbol} (${tfLabel})`,
          body: `RSI: ${rsi.toFixed(1)} | Stoch D: ${stochD.toFixed(1)}`,
          tag: `momentum-${symbol}-${tf}-short`,
          url: "/"
        });
      }
    }
  }
  return alerts;
}
__name(generateAlertsFromComputations, "generateAlertsFromComputations");
async function runSignalDetection(symbol) {
  const timeframes = [.../* @__PURE__ */ new Set([...MONITORED_TIMEFRAMES, "5", "15", "30"])];
  const [tickerResult, ...candleResults] = await Promise.allSettled([
    fetchTicker(symbol),
    ...timeframes.map((tf) => fetchCandles(symbol, tf, BYBIT_LIMIT))
  ]);
  const fundingRate = tickerResult.status === "fulfilled" ? tickerResult.value.fundingRate : null;
  const multiFrameCandles = timeframes.map((tf, i) => ({
    timeframe: tf,
    candles: candleResults[i].status === "fulfilled" ? candleResults[i].value : []
  }));
  const computations = buildComputations(multiFrameCandles, symbol, fundingRate);
  const fibResultsByTf = {};
  for (const r of multiFrameCandles) {
    if (r.candles.length > 0) {
      fibResultsByTf[r.timeframe] = calculateFibonacciLevels(r.candles);
    }
  }
  const candlesByTf = {};
  for (const r of multiFrameCandles) {
    if (r.candles.length > 0) candlesByTf[r.timeframe] = r.candles;
  }
  const markovPriors = calculateMultiTimeframeMarkovPriors(candlesByTf);
  const snapshots = deriveTimeframeSnapshots(computations, markovPriors, void 0, fibResultsByTf);
  const confluence = deriveMultiTimeframeConfluence(snapshots);
  const alerts = generateAlertsFromComputations(computations, symbol, fundingRate);
  return {
    payload: {
      computedAt: Date.now(),
      symbol,
      snapshots,
      confluence,
      firedAlerts: alerts
    },
    alerts
  };
}
__name(runSignalDetection, "runSignalDetection");

// worker/email.ts
var SUBSCRIBERS_KEY = "subscribers";
var FROM_ADDRESS = "CryptoTrendNotify <onboarding@resend.dev>";
var COOLDOWN_TTL = 3600;
async function loadSubscribers(env2) {
  const raw = await env2.EMAIL_SUBSCRIPTIONS.get(SUBSCRIBERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
__name(loadSubscribers, "loadSubscribers");
async function saveSubscribers(env2, emails) {
  await env2.EMAIL_SUBSCRIPTIONS.put(SUBSCRIBERS_KEY, JSON.stringify(emails));
}
__name(saveSubscribers, "saveSubscribers");
async function removeSubscriber(env2, email) {
  const subs = await loadSubscribers(env2);
  await saveSubscribers(env2, subs.filter((e) => e !== email));
}
__name(removeSubscriber, "removeSubscriber");
async function isSubscribed(env2, email) {
  const subs = await loadSubscribers(env2);
  return subs.includes(email);
}
__name(isSubscribed, "isSubscribed");
async function toggleSubscription(env2, email) {
  const subs = await loadSubscribers(env2);
  const idx = subs.indexOf(email);
  if (idx >= 0) {
    subs.splice(idx, 1);
    await saveSubscribers(env2, subs);
    return false;
  }
  subs.push(email);
  await saveSubscribers(env2, subs);
  return true;
}
__name(toggleSubscription, "toggleSubscription");
async function sendEmail(env2, to, subject, html) {
  if (!env2.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set \u2014 skipping email");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env2.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html })
    });
    if (!res.ok) {
      console.error(`Resend error ${res.status}:`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendEmail error:", err);
    return false;
  }
}
__name(sendEmail, "sendEmail");
async function sendTestEmail(env2, to) {
  return sendEmail(
    env2,
    to,
    "\u2705 CryptoTrendNotify \u2014 Test Email",
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:32px;background:#0b0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#111827;border-radius:12px;overflow:hidden;border:1px solid #1e2a3a;">
    <div style="background:linear-gradient(135deg,#7c3aed,#0ea5e9);padding:24px 32px;">
      <div style="font-size:20px;font-weight:700;color:#fff;">\u{1F4C8} CryptoTrend<strong>Notify</strong></div>
    </div>
    <div style="padding:24px 32px;">
      <p style="color:#e2e8f0;font-size:15px;margin:0 0 8px;">Test email delivered successfully.</p>
      <p style="color:#94a3b8;font-size:13px;margin:0;">Email alerts are configured correctly. You'll receive a digest like this whenever trading signals fire.</p>
    </div>
  </div>
</body>
</html>`
  );
}
__name(sendTestEmail, "sendTestEmail");
function buildDigestHtml(alerts) {
  const rows = alerts.map(
    (a) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #1e2a3a;">
            <div style="font-size:14px;font-weight:600;color:#e2e8f0;">${a.title}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${a.body}</div>
          </td>
        </tr>`
  ).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0b0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;border:1px solid #1e2a3a;">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#0ea5e9);padding:24px 32px;">
            <div style="font-size:20px;font-weight:700;color:#fff;">\u{1F4C8} CryptoTrend<strong>Notify</strong></div>
            <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">${alerts.length} signal${alerts.length !== 1 ? "s" : ""} detected</div>
          </td>
        </tr>
        <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        <tr>
          <td style="padding:16px 24px;border-top:1px solid #1e2a3a;text-align:center;">
            <div style="font-size:11px;color:#4b5563;">You're receiving this because you enabled email alerts on CryptoTrendNotify.</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
__name(buildDigestHtml, "buildDigestHtml");
async function sendEmailNotifications(env2, alerts) {
  if (!alerts.length) return;
  const subscribers = await loadSubscribers(env2);
  if (!subscribers.length) return;
  await Promise.allSettled(
    subscribers.map(async (email) => {
      const freshAlerts = (await Promise.all(
        alerts.map(async (a) => {
          const key = `email:${email}:${a.tag}`;
          const inCooldown = await env2.ALERT_COOLDOWNS.get(key) !== null;
          return inCooldown ? null : a;
        })
      )).filter(Boolean);
      if (!freshAlerts.length) return;
      const subject = freshAlerts.length === 1 ? freshAlerts[0].title : `${freshAlerts.length} crypto signals detected`;
      const sent = await sendEmail(env2, email, subject, buildDigestHtml(freshAlerts));
      if (sent) {
        await Promise.allSettled(
          freshAlerts.map(
            (a) => env2.ALERT_COOLDOWNS.put(`email:${email}:${a.tag}`, "1", {
              expirationTtl: COOLDOWN_TTL
            })
          )
        );
        console.log(`Email sent to ${email} (${freshAlerts.length} alerts)`);
      }
    })
  );
}
__name(sendEmailNotifications, "sendEmailNotifications");

// worker/scheduler.ts
var SYMBOLS = ["BTCUSDT", "ETHUSDT"];
var SIGNAL_CACHE_TTL_SECS = 600;
async function handleScheduled(env2) {
  const results = await Promise.allSettled(SYMBOLS.map((sym) => runSignalDetection(sym)));
  const allAlerts = [];
  for (let i = 0; i < SYMBOLS.length; i++) {
    const result = results[i];
    const symbol = SYMBOLS[i];
    if (result.status === "rejected") {
      console.error(`Signal detection failed for ${symbol}:`, result.reason);
      continue;
    }
    const { payload, alerts } = result.value;
    await storeSignalCache(env2, symbol, payload);
    allAlerts.push(...alerts);
  }
  if (!allAlerts.length) return;
  await Promise.allSettled([
    handlePushNotifications(env2, allAlerts),
    sendEmailNotifications(env2, allAlerts)
  ]);
}
__name(handleScheduled, "handleScheduled");
async function storeSignalCache(env2, symbol, payload) {
  try {
    const serialisable = {
      ...payload,
      snapshots: payload.snapshots.map((s) => ({ ...s }))
    };
    await env2.SIGNAL_CACHE.put(
      `signals:${symbol}`,
      JSON.stringify(serialisable),
      { expirationTtl: SIGNAL_CACHE_TTL_SECS }
    );
  } catch (err) {
    console.error(`Failed to store signal cache for ${symbol}:`, err);
  }
}
__name(storeSignalCache, "storeSignalCache");
async function handlePushNotifications(env2, allAlerts) {
  const subscriptions = await loadSubscriptions(env2);
  if (!subscriptions.length) return;
  const freshAlerts = (await Promise.all(
    allAlerts.map(async (alert) => {
      const inCooldown = await isInCooldown(env2, alert.tag);
      return inCooldown ? null : alert;
    })
  )).filter(Boolean);
  if (!freshAlerts.length) return;
  const expiredEndpoints = [];
  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      for (const alert of freshAlerts) {
        const ok = await sendPush(sub, alert, env2);
        if (!ok) {
          expiredEndpoints.push(sub.endpoint);
          break;
        }
      }
    })
  );
  await Promise.allSettled(
    freshAlerts.map((alert) => {
      const tfMatch = alert.tag.match(/-(\w+)-(?:long|short|golden|death)$/);
      const tf = tfMatch?.[1] ?? "60";
      const ttl = COOLDOWN_SECS[tf] ?? 3600;
      return setCooldown(env2, alert.tag, ttl);
    })
  );
  if (expiredEndpoints.length) {
    await removeSubscriptions(env2, expiredEndpoints);
    console.log(`Removed ${expiredEndpoints.length} expired subscription(s)`);
  }
  console.log(`Push cron: sent ${freshAlerts.length} alert(s) to ${subscriptions.length} subscriber(s)`);
}
__name(handlePushNotifications, "handlePushNotifications");

// worker/index.ts
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json, "json");
function getAuthEmail(request, env2) {
  return request.headers.get("Cf-Access-Authenticated-User-Email") ?? env2.DEV_USER_EMAIL ?? null;
}
__name(getAuthEmail, "getAuthEmail");
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(corsHeaders, "corsHeaders");
var index_default = {
  async fetch(request, env2) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method === "POST" && url.pathname === "/api/push/subscribe") {
      try {
        const body = await request.json();
        if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
          return json({ error: "Invalid subscription body" }, 400);
        }
        await addSubscription(env2, { endpoint: body.endpoint, keys: { p256dh: body.keys.p256dh, auth: body.keys.auth } });
        return json({ ok: true }, 201);
      } catch (err) {
        console.error("subscribe error:", err);
        return json({ error: "Failed to save subscription" }, 500);
      }
    }
    if (request.method === "POST" && url.pathname === "/api/push/unsubscribe") {
      try {
        const body = await request.json();
        if (!body?.endpoint) return json({ error: "Missing endpoint" }, 400);
        await removeSubscription(env2, body.endpoint);
        return json({ ok: true });
      } catch (err) {
        console.error("unsubscribe error:", err);
        return json({ error: "Failed to remove subscription" }, 500);
      }
    }
    if (request.method === "GET" && url.pathname === "/api/push/status") {
      return json({ ok: true, ts: Date.now() });
    }
    if (request.method === "GET" && url.pathname === "/api/signals/latest") {
      const symbol = (url.searchParams.get("symbol") ?? "BTCUSDT").toUpperCase();
      try {
        const cached = await env2.SIGNAL_CACHE.get(`signals:${symbol}`, "text");
        if (!cached) {
          return json({ error: "No signal data yet \u2014 cron has not run or KV not configured" }, 503);
        }
        const payload = JSON.parse(cached);
        return new Response(cached, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60",
            "X-Computed-At": String(payload.computedAt),
            ...corsHeaders()
          }
        });
      } catch (err) {
        console.error("signals/latest error:", err);
        return json({ error: "Failed to read signal cache" }, 500);
      }
    }
    if (request.method === "GET" && url.pathname === "/api/me") {
      const email = getAuthEmail(request, env2);
      return json({ email: email ?? null });
    }
    if (request.method === "GET" && url.pathname === "/api/email/status") {
      const email = getAuthEmail(request, env2);
      if (!email) return json({ subscribed: false, email: null });
      try {
        const subscribed = await isSubscribed(env2, email);
        return json({ subscribed, email });
      } catch (err) {
        console.error("email status error:", err);
        return json({ error: "Failed to check status" }, 500);
      }
    }
    if (request.method === "POST" && url.pathname === "/api/email/test") {
      const email = getAuthEmail(request, env2);
      if (!email) return json({ error: "Not authenticated via Cloudflare Access" }, 401);
      try {
        const ok = await sendTestEmail(env2, email);
        return json({ ok });
      } catch (err) {
        console.error("email test error:", err);
        return json({ error: "Failed to send test email" }, 500);
      }
    }
    if (request.method === "POST" && url.pathname === "/api/email/toggle") {
      const email = getAuthEmail(request, env2);
      if (!email) return json({ error: "Not authenticated via Cloudflare Access" }, 401);
      try {
        const nowEnabled = await toggleSubscription(env2, email);
        return json({ subscribed: nowEnabled, email });
      } catch (err) {
        console.error("email toggle error:", err);
        return json({ error: "Failed to toggle subscription" }, 500);
      }
    }
    if (url.pathname.startsWith("/api/admin/")) {
      const email = getAuthEmail(request, env2);
      if (!email) return json({ error: "Not authenticated" }, 401);
      if (request.method === "GET" && url.pathname === "/api/admin/subscriptions") {
        try {
          const subscriptions = await loadSubscriptions(env2);
          return json({ count: subscriptions.length, subscriptions });
        } catch (err) {
          console.error("admin subscriptions error:", err);
          return json({ error: "Failed to load subscriptions" }, 500);
        }
      }
      if (request.method === "DELETE" && url.pathname === "/api/admin/subscriptions") {
        try {
          const body = await request.json();
          if (!body?.endpoint) return json({ error: "Missing endpoint" }, 400);
          await removeSubscription(env2, body.endpoint);
          return json({ ok: true });
        } catch (err) {
          console.error("admin remove subscription error:", err);
          return json({ error: "Failed to remove subscription" }, 500);
        }
      }
      if (request.method === "GET" && url.pathname === "/api/admin/emails") {
        try {
          const emails = await loadSubscribers(env2);
          return json({ count: emails.length, emails });
        } catch (err) {
          console.error("admin emails error:", err);
          return json({ error: "Failed to load emails" }, 500);
        }
      }
      if (request.method === "DELETE" && url.pathname === "/api/admin/emails") {
        try {
          const body = await request.json();
          if (!body?.email) return json({ error: "Missing email" }, 400);
          await removeSubscriber(env2, body.email);
          return json({ ok: true });
        } catch (err) {
          console.error("admin remove email error:", err);
          return json({ error: "Failed to remove email" }, 500);
        }
      }
      if (request.method === "GET" && url.pathname === "/api/admin/cooldowns") {
        try {
          const result = await env2.ALERT_COOLDOWNS.list();
          return json({ keys: result.keys.map((k) => ({ name: k.name, expiration: k.expiration })) });
        } catch (err) {
          console.error("admin cooldowns error:", err);
          return json({ error: "Failed to load cooldowns" }, 500);
        }
      }
      if (request.method === "POST" && url.pathname === "/api/admin/trigger-cron") {
        try {
          await handleScheduled(env2);
          return json({ ok: true, triggeredAt: Date.now() });
        } catch (err) {
          console.error("admin trigger-cron error:", err);
          return json({ error: "Failed to trigger cron" }, 500);
        }
      }
    }
    return new Response("Not found", { status: 404 });
  },
  async scheduled(_event, env2, ctx) {
    ctx.waitUntil(handleScheduled(env2));
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
