/** Keep focused fields visible above the iOS soft keyboard. */
export function scrollFocusedFieldIntoView(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return
  if (typeof window === 'undefined') return
  if (!window.matchMedia('(pointer: coarse)').matches) return

  window.requestAnimationFrame(() => {
    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  })
}
