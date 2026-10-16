// Type helpers deriving request/response/push payload types from a PluginContract.
import type { z } from 'zod'
import type { PluginContract } from './plugin-contract'

export type RequestName<C extends PluginContract> = keyof C['requests'] & string
export type PushName<C extends PluginContract> = keyof C['pushes'] & string

export type RequestInput<C extends PluginContract, N extends RequestName<C>> = z.input<
  C['requests'][N]['request']
>
export type RequestData<C extends PluginContract, N extends RequestName<C>> = z.output<
  C['requests'][N]['request']
>
export type ResponseInput<C extends PluginContract, N extends RequestName<C>> = z.input<
  C['requests'][N]['response']
>
export type ResponseData<C extends PluginContract, N extends RequestName<C>> = z.output<
  C['requests'][N]['response']
>
export type PushInput<C extends PluginContract, N extends PushName<C>> = z.input<C['pushes'][N]>
export type PushData<C extends PluginContract, N extends PushName<C>> = z.output<C['pushes'][N]>

/** Makes the payload argument optional for requests whose schema accepts undefined. */
export type RequestArgs<C extends PluginContract, N extends RequestName<C>> =
  undefined extends RequestInput<C, N>
    ? [payload?: RequestInput<C, N>]
    : [payload: RequestInput<C, N>]
