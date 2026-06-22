// No-op Mixpanel: any method access returns a no-op so analytics.ts runs inert.
export class Mixpanel {
  constructor() {
    return new Proxy(this, {
      get: (target: any, prop) =>
        prop in target ? target[prop] : () => undefined,
    });
  }
  getPeople() {
    return new Proxy({}, { get: () => () => undefined });
  }
}
export default { Mixpanel };
