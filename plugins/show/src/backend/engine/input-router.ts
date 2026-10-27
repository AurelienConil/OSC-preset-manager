// InputRouter: the live pin matrix. Forwards each incoming OSC value to the linked parameters,
// converted to their units, after the per-input rate limit (stage 1 of the rate limiting).
import type { InputDeclDto, OscValueDto, ParameterDeclDto, PinLinkDto, SetupDto } from '../../show.dto'
import { convertValue } from '../../modulation'
import { RateLimiter } from './rate-limiter'

interface Route {
  input: InputDeclDto
  outputs: ParameterDeclDto[]
  limiter: RateLimiter<OscValueDto> | undefined
}

export class InputRouter {
  private routes = new Map<string, Route>()
  private driven = new Set<string>()

  /** `now` must be monotonic (performance.now). */
  constructor(
    private readonly send: (output: ParameterDeclDto, value: OscValueDto) => void,
    private readonly now: () => number = () => performance.now(),
  ) {}

  /** Rebuilds the routes for a preset's links; links to undeclared addresses are ignored. */
  configure(setup: SetupDto, links: readonly PinLinkDto[]): void {
    this.dispose()
    const inputs = new Map(setup.inputs.map((input) => [input.address, input]))
    const parameters = new Map(setup.parameters.map((parameter) => [parameter.address, parameter]))
    for (const link of links) {
      const input = inputs.get(link.input)
      const output = parameters.get(link.output)
      if (!input || !output) continue
      this.routeOf(input).outputs.push(output)
      this.driven.add(output.address)
    }
  }

  /** Parameters currently driven by an input: the engine must not modulate them. */
  drivenOutputs(): ReadonlySet<string> {
    return this.driven
  }

  receive(address: string, args: readonly OscValueDto[]): void {
    const route = this.routes.get(address)
    const [value] = args
    if (!route || value === undefined) return
    if (route.limiter) route.limiter.push(value)
    else this.forward(route, value)
  }

  dispose(): void {
    for (const route of this.routes.values()) route.limiter?.dispose()
    this.routes = new Map()
    this.driven = new Set()
  }

  private routeOf(input: InputDeclDto): Route {
    const existing = this.routes.get(input.address)
    if (existing) return existing
    const route: Route = { input, outputs: [], limiter: undefined }
    if (input.maxRateHz !== null) {
      route.limiter = new RateLimiter(input.maxRateHz, (value) => this.forward(route, value), this.now)
    }
    this.routes.set(input.address, route)
    return route
  }

  private forward(route: Route, value: OscValueDto): void {
    for (const output of route.outputs) {
      const converted = convertValue(route.input, output, value)
      if (converted !== undefined) this.send(output, converted)
    }
  }
}
