import { useState } from 'react'
import './LoveStoryMarquee.css'

export default function LoveStoryMarquee({ photos }) {
  const [paused, setPaused] = useState(false)

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
        role="region"
        aria-label="Foto kenangan perjalanan cinta kami"
        tabIndex={0}
      >
        <div className="love-story-marquee__track">
          {[false, true].map((duplicate) => (
            <div
              className={`love-story-marquee__group${duplicate ? ' love-story-marquee__group--duplicate' : ''}`}
              key={String(duplicate)}
              aria-hidden={duplicate ? true : undefined}
            >
              {photos.map((photo, index) => (
                <figure
                  className={`love-story-marquee__item${photo.wide ? ' love-story-marquee__item--wide' : ''}`}
                  key={photo.src}
                >
                  <img
                    className="love-story-marquee__photo"
                    src={photo.src}
                    alt={duplicate ? '' : `Foto kenangan kami ${index + 1}`}
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
