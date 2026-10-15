import { useEffect, useRef, useState } from 'react'
import './LoveStoryMarquee.css'

export default function LoveStoryMarquee({ photos }) {
  const [paused, setPaused] = useState(false)
  const [layout, setLayout] = useState({ copies: 2, distance: 0, duration: 50 })
  const viewportRef = useRef(null)
  const groupRef = useRef(null)

  useEffect(() => {
    const viewport = viewportRef.current
    const group = groupRef.current
    if (!viewport || !group) return undefined

    const updateLayout = () => {
      const distance = group.offsetWidth
      if (!distance) return

      const speed = Number.parseFloat(
        window.getComputedStyle(viewport).getPropertyValue('--photo-scroll-speed')
      )
      const copies = Math.max(2, Math.ceil(viewport.clientWidth / distance) + 1)
      const duration = distance / speed

      setLayout((current) => (
        current.copies === copies && current.distance === distance && current.duration === duration
          ? current
          : { copies, distance, duration }
      ))
    }

    const observer = new ResizeObserver(updateLayout)
    observer.observe(viewport)
    observer.observe(group)
    updateLayout()

    return () => observer.disconnect()
  }, [photos])

  if (!photos.length) return null

  return (
    <div className="love-story-marquee" data-paused={paused}>
      <div className="love-story-marquee__controls">
        <button
          className="love-story-marquee__toggle"
          type="button"
          aria-label={paused ? 'Putar pergerakan foto kenangan' : 'Jeda pergerakan foto kenangan'}
          aria-pressed={paused}
          onClick={() => setPaused((current) => !current)}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            {paused ? (
              <path d="M4.5 2.5 12.5 8l-8 5.5Z" fill="currentColor" />
            ) : (
              <path d="M4 3h3v10H4zm5 0h3v10H9z" fill="currentColor" />
            )}
          </svg>
          <span>{paused ? 'Putar' : 'Jeda'}</span>
        </button>
      </div>
      <div
        className="love-story-marquee__viewport"
        ref={viewportRef}
        role="region"
        aria-label="Foto kenangan perjalanan cinta kami"
        tabIndex={0}
      >
        <div
          className="love-story-marquee__track"
          style={{
            '--marquee-distance': `${layout.distance}px`,
            '--marquee-duration': `${layout.duration}s`,
          }}
        >
          {Array.from({ length: layout.copies }, (_, copy) => (
            <div
              className={`love-story-marquee__group${copy > 0 ? ' love-story-marquee__group--duplicate' : ''}`}
              key={copy}
              ref={copy === 0 ? groupRef : undefined}
              aria-hidden={copy > 0 ? true : undefined}
            >
              {photos.map((photo, index) => (
                <figure
                  className={`love-story-marquee__item${photo.wide ? ' love-story-marquee__item--wide' : ''}`}
                  key={photo.src}
                >
                  <img
                    className="love-story-marquee__photo"
                    src={photo.src}
                    alt={copy > 0 ? '' : (photo.alt || `Foto kenangan kami ${index + 1}`)}
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: photo.position }}
                  />
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
