<!-- Role: draws a normalized curve (0..1 values) with an optional playhead; optionally editable by
     mouse or finger, filling the gaps between two pointer positions. -->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    points: readonly number[]
    /** Cycle position 0..1, undefined to hide. */
    playhead?: number
    editable?: boolean
  }>(),
  { playhead: undefined, editable: false },
)

const emit = defineEmits<{
  /** Emitted once per stroke, on release: the whole new curve. */
  draw: [points: number[]]
}>()

const canvas = ref<HTMLCanvasElement>()
let draft: number[] | undefined
let lastStroke: { index: number; value: number } | undefined
let resizeObserver: ResizeObserver | undefined

function color(element: HTMLElement, token: string): string {
  return getComputedStyle(element).getPropertyValue(token).trim()
}

function render(): void {
  const element = canvas.value
  const context = element?.getContext('2d')
  if (!element || !context) return
  const ratio = window.devicePixelRatio || 1
  const width = Math.round(element.clientWidth * ratio)
  const height = Math.round(element.clientHeight * ratio)
  if (element.width !== width) element.width = width
  if (element.height !== height) element.height = height
  context.clearRect(0, 0, width, height)

  context.lineWidth = ratio
  context.strokeStyle = color(element, '--app-border-strong')
  context.beginPath()
  context.moveTo(0, height / 2)
  context.lineTo(width, height / 2)
  context.stroke()

  const points = draft ?? props.points
  const last = Math.max(1, points.length - 1)
  context.lineWidth = 2 * ratio
  context.strokeStyle = color(element, '--app-accent')
  context.beginPath()
  points.forEach((value, index) => {
    const x = (index / last) * width
    const y = (1 - value) * (height - 2 * ratio) + ratio
    if (index === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  })
  context.stroke()

  if (props.playhead !== undefined) {
    context.lineWidth = 2 * ratio
    context.strokeStyle = color(element, '--app-warn')
    context.beginPath()
    context.moveTo(props.playhead * width, 0)
    context.lineTo(props.playhead * width, height)
    context.stroke()
  }
}

function strokePoint(event: PointerEvent): { index: number; value: number } {
  const rect = (canvas.value as HTMLCanvasElement).getBoundingClientRect()
  const count = props.points.length
  const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
  return { index: Math.round(x * (count - 1)), value: 1 - y }
}

/** Writes the stroke into the draft, interpolating every index skipped by a fast gesture. */
function paint(event: PointerEvent): void {
  if (!draft) return
  const point = strokePoint(event)
  const from = lastStroke ?? point
  const step = point.index >= from.index ? 1 : -1
  const span = Math.abs(point.index - from.index)
  for (let offset = 0; offset <= span; offset++) {
    const t = span === 0 ? 1 : offset / span
    draft[from.index + offset * step] = from.value + (point.value - from.value) * t
  }
  lastStroke = point
  render()
}

function onPointerDown(event: PointerEvent): void {
  if (!props.editable || !canvas.value) return
  canvas.value.setPointerCapture(event.pointerId)
  draft = [...props.points]
  lastStroke = undefined
  paint(event)
}

function onPointerUp(): void {
  if (!draft) return
  emit('draw', draft)
  draft = undefined
}

watch(() => [props.points, props.playhead], render)
onMounted(() => {
  resizeObserver = new ResizeObserver(render)
  if (canvas.value) resizeObserver.observe(canvas.value)
  render()
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <canvas
    ref="canvas"
    class="curve-canvas"
    :class="{ 'curve-canvas--editor': editable }"
    @pointerdown="onPointerDown"
    @pointermove="paint"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  />
</template>
