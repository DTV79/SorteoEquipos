export default function Info({ texto }) {
  return (
    <span className="teams-info" tabIndex="0" aria-label={texto}>
      i
      <span className="teams-info-popover">{texto}</span>
    </span>
  )
}
