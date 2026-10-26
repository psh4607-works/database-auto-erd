export const captureVisibility = (
  saved: string[],
  rendered: string[],
  hidden: string[],
) => {
  const renderedIds = new Set(rendered)
  return Array.from(
    new Set([...saved.filter((id) => !renderedIds.has(id)), ...hidden]),
  )
}
