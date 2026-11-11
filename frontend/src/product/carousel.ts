export function carouselPages(count: number, visible: number): number[] {
  const size = Math.max(1, Math.floor(visible))
  const last = Math.max(0, count - size)
  const pages = [0]
  while (pages[pages.length - 1] < last) {
    pages.push(Math.min(last, pages[pages.length - 1] + size))
  }
  return pages
}

export function normalizedSlide(index: number, count: number): number {
  if (count <= 0) return 0
  return ((index % count) + count) % count
}
