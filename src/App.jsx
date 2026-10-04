import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import bridePortrait from './bridesgrooms/brides.jpeg'
import groomPortrait from './bridesgrooms/grooms-web.jpg'

const WEDDING_DATE = new Date('2026-10-24T00:00:00+07:00')

const getTimeLeft = () => {
  const difference = Math.max(0, WEDDING_DATE.getTime() - Date.now())

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  }
}

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
}

const profileTextReveal = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
}

const profileTextItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
}

function Countdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft)

  useEffect(() => {
    const timer = window.setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const units = [
    ['Hari', timeLeft.days],
    ['Jam', timeLeft.hours],
    ['Menit', timeLeft.minutes],
    ['Detik', timeLeft.seconds],
  ]

  return (
    <div
      className="grid w-full max-w-3xl grid-cols-4 border-y border-[#101719]/20"
      aria-label="Hitung mundur menuju 24 Oktober 2026"
      aria-live="off"
    >
      {units.map(([label, value], index) => (
        <div
          className={`relative flex min-h-22 flex-col items-center justify-center sm:min-h-24 lg:min-h-28 ${
            index > 0 ? 'before:absolute before:inset-y-1/4 before:left-0 before:w-px before:bg-[#101719]/15' : ''
          }`}
          key={label}
        >
          <span className="text-2xl leading-none font-light tabular-nums sm:text-3xl lg:text-5xl">
            {String(value).padStart(2, '0')}
          </span>
          <span className="mt-2 text-[0.52rem] font-bold tracking-[0.1em] text-[#68705f] uppercase sm:text-[0.6rem] lg:text-[0.68rem] lg:tracking-[0.14em]">
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

const SECTIONS = [
  { id: 'groom', label: 'Mempelai Pria' },
  { id: 'bride', label: 'Mempelai Wanita' },
  { id: 'venue', label: 'Pemberkatan & Resepsi' },
  { id: 'countdown', label: 'Catat Tanggalnya' },
  { id: 'wedding-gift', label: 'Wedding Gift' },
  { id: 'love-stories', label: 'Love Stories' },
  { id: 'gallery', label: 'Galeri' },
]

function SectionNav() {
  const [active, setActive] = useState(SECTIONS[0].id)
  const [pending, setPending] = useState(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    )

    for (const { id } of SECTIONS) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [])

  const goTo = (id) => {
    if (id === active || pending) return
    setPending(id)
  }

  useEffect(() => {
    const ids = SECTIONS.map(({ id }) => id)
    const onClick = (event) => {
      const anchor = event.target.closest('a[href^="#"]')
      if (!anchor) return
      const id = anchor.getAttribute('href').slice(1)
      if (!ids.includes(id)) return
      event.preventDefault()
      goTo(id)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  })

  return (
    <>
      <AnimatePresence>
        {pending && (
          <motion.div
            className="fixed inset-0 z-40 bg-[#111517]"
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
            onAnimationComplete={(definition) => {
              if (definition.y === '0%') {
                document
                  .getElementById(pending)
                  ?.scrollIntoView({ behavior: 'auto' })
                window.setTimeout(() => setPending(null), 120)
              }
            }}
          />
        )}
      </AnimatePresence>
      <nav
        className="fixed top-1/2 right-4 z-50 flex -translate-y-1/2 flex-col gap-4 mix-blend-difference sm:right-6"
        aria-label="Navigasi bagian"
      >
        {SECTIONS.map(({ id, label }) => (
        <button
          key={id}
          className="group relative flex h-5 w-5 items-center justify-center"
          onClick={() => goTo(id)}
          aria-label={label}
          aria-current={active === id ? 'true' : undefined}
        >
          <span
            className={`block rounded-full transition-all duration-500 ease-out ${
              active === id
                ? 'h-2.5 w-2.5 bg-white ring-4 ring-white/15'
                : 'h-1.5 w-1.5 bg-white/30 group-hover:bg-white/60'
            }`}
          />
          <span className="pointer-events-none absolute right-6 origin-right scale-95 rounded-full bg-white px-3 py-1 text-[0.58rem] font-bold tracking-[0.14em] whitespace-nowrap text-black uppercase opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
            {label}
          </span>
        </button>
        ))}
      </nav>
    </>
  )
}

function ProfileSection({
  id,
  role,
  name,
  fullName,
  parents,
  photoSrc,
  photoAlt,
}) {
  return (
    <section
      className="relative flex min-h-svh snap-start items-center justify-center overflow-hidden bg-[#070707] py-6 sm:py-8 lg:py-10"
      id={id}
      aria-labelledby={`${id}-title`}
    >
      <img
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-45 blur-3xl lg:hidden"
        src={photoSrc}
        alt=""
        aria-hidden="true"
        loading="lazy"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[#070707]/55 lg:hidden"
        aria-hidden="true"
      />
      <motion.div
        className="relative z-10 h-[86svh] min-h-[34rem] max-h-[54rem] w-full max-w-none overflow-hidden bg-[#070707] shadow-[0_2rem_5rem_rgba(17,21,23,0.14)] sm:w-[calc(100%-2rem)] sm:max-w-xs lg:max-w-sm lg:rounded-t-full"
        initial={{ opacity: 0, scale: 0.985 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={photoSrc}
          alt={photoAlt}
          loading="lazy"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#080b0c]/90 via-[#080b0c]/10 via-45% to-transparent"
          aria-hidden="true"
        />

        <motion.div
          className="absolute inset-x-0 bottom-0 z-10 px-7 pb-[clamp(3.5rem,8svh,6rem)] text-center text-[#f8f7f2] sm:px-10"
          variants={profileTextReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.45 }}
        >
          <motion.p
            className="m-0 text-[0.6rem] font-bold tracking-[0.3em] text-[#d5e0c7] uppercase lg:text-[0.66rem]"
            variants={profileTextItem}
          >
            {role}
          </motion.p>
          <motion.h2
            className="mt-3 font-['Tenor_Sans',sans-serif] text-[clamp(2.4rem,11vw,3.75rem)] leading-none font-normal tracking-[0.03em]"
            id={`${id}-title`}
            variants={profileTextItem}
          >
            {name}
          </motion.h2>
          <motion.p
            className="mt-3 font-['Snell_Roundhand','Segoe_Script','Brush_Script_MT',cursive] text-xl leading-snug text-white/90 sm:text-2xl"
            variants={profileTextItem}
          >
            {fullName}
          </motion.p>
          <motion.p
            className="mx-auto mt-4 max-w-sm font-['Tenor_Sans',sans-serif] text-xs leading-relaxed tracking-[0.02em] text-white/75 sm:text-sm"
            variants={profileTextItem}
          >
            {parents}
          </motion.p>
        </motion.div>
      </motion.div>
    </section>
  )
}

const LOVE_STORIES = [
  {
    number: '01',
    title: 'Awal Pertemuan',
    content: (
      <>
        Tak ada yang benar-benar kebetulan. Kisah kami bermula di Bandung pada{' '}
        <em>27 September 2021</em>, tepat di hari wisuda. Saat itu, kami diperkenalkan.
        Pertemuan singkat tersebut menjadi awal dari sebuah cerita yang indah, meski kami
        belum menyadari bahwa takdir sedang mempertemukan dua hati.
      </>
    ),
  },
  {
    number: '02',
    title: 'Menjalin Kedekatan',
    content: (
      <>
        Setahun setelah pertemuan itu, kami mulai saling berkomunikasi. Awalnya hanya saling
        bertanya kabar dan berbagi cerita sederhana. Seiring berjalannya waktu, percakapan
        kami menjadi semakin hangat dan intens. Dari hari ke hari, kami semakin mengenal satu
        sama lain dan menemukan kenyamanan dalam setiap kebersamaan.
      </>
    ),
  },
  {
    number: '03',
    title: 'Menjadi Sepasang Kekasih',
    content: (
      <>
        Pada <em>7 Juli 2023</em>, kami memutuskan untuk melangkah lebih jauh dengan menjalin
        hubungan sebagai sepasang kekasih. Selama hampir tiga tahun bersama, kami belajar
        untuk saling memahami, saling menguatkan, dan bertumbuh bersama dalam suka maupun
        duka.
      </>
    ),
  },
  {
    number: '04',
    title: 'Menuju Hari Bahagia',
    content: (
      <>
        Perjalanan kami telah dipenuhi dengan cerita, tawa, dan pelajaran berharga. Dengan
        penuh rasa syukur, kami memutuskan untuk melangkah ke babak baru dalam kehidupan,
        mengikat janji suci pernikahan sebagai awal perjalanan seumur hidup. Semoga cinta
        yang telah tumbuh sejak pertemuan pertama ini senantiasa menjadi rumah yang penuh
        kebahagiaan, keberkahan, dan kasih sayang.
      </>
    ),
  },
]

function LoveStoriesSection() {
  return (
    <section
      className="relative min-h-svh snap-start overflow-hidden bg-[#f0eee7] px-5 py-20 text-[#111517] sm:px-8 lg:px-12 lg:py-28"
      id="love-stories"
      aria-labelledby="love-stories-title"
    >
      <div className="mx-auto w-full max-w-5xl">
        <motion.div className="mx-auto max-w-2xl text-center" {...reveal}>
          <p className="m-0 text-[0.62rem] font-bold tracking-[0.3em] text-[#647449] uppercase lg:text-[0.68rem]">
            Perjalanan Kami
          </p>
          <h2
            className="mt-4 font-['Tenor_Sans',sans-serif] text-[clamp(2.5rem,11vw,4.5rem)] leading-none font-normal tracking-[0.01em]"
            id="love-stories-title"
          >
            Love Stories
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#111517]/65 sm:text-base">
            Empat babak yang membawa kami menuju satu janji seumur hidup.
          </p>
        </motion.div>

        <div className="mt-14 border-t border-[#111517]/15 sm:mt-18">
          {LOVE_STORIES.map((story, index) => (
            <motion.article
              className="grid gap-4 border-b border-[#111517]/15 py-9 sm:grid-cols-[3rem_1fr] sm:gap-7 sm:py-11 lg:grid-cols-[4rem_15rem_1fr] lg:gap-9"
              key={story.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 0.75,
                delay: index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <span className="text-[0.62rem] font-bold tracking-[0.2em] text-[#647449]">
                {story.number}
              </span>
              <h3 className="font-['Tenor_Sans',sans-serif] text-2xl leading-tight font-normal tracking-[0.01em] sm:col-start-2 lg:col-start-auto lg:text-3xl">
                {story.title}
              </h3>
              <p className="max-w-2xl text-sm leading-7 text-[#111517]/68 sm:col-start-2 sm:text-base sm:leading-8 lg:col-start-auto">
                {story.content}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

const galleryModules = import.meta.glob('./assets/gallery-*.jpeg', {
  eager: true,
  import: 'default',
})

const GALLERY_IMAGES = Object.entries(galleryModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src]) => ({ src, alt: `Ice dan Chandra — foto galeri ${path.match(/gallery-(\d+)/)?.[1] ?? ''}` }))

function GallerySection() {
  const images = GALLERY_IMAGES
  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    if (!previewImage) return undefined

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setPreviewImage(null)
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [previewImage])

  return (
    <section
      className="relative flex min-h-svh snap-start flex-col items-center justify-center overflow-hidden bg-[#111517] px-5 py-16 text-[#f8f7f2] lg:py-24"
      id="gallery"
      aria-labelledby="gallery-title"
    >
      <motion.div className="text-center" {...reveal}>
        <p className="m-0 text-[0.62rem] font-bold tracking-[0.3em] text-[#a3b18a] uppercase lg:text-[0.68rem]">
          Momen Kami
        </p>
        <h2
          className="mt-3 text-[clamp(2.25rem,10vw,3.5rem)] leading-none font-light tracking-[0.03em] lg:text-5xl"
          id="gallery-title"
        >
          Galeri
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed tracking-[0.02em] text-[#f8f7f2]/70 lg:text-base">
          Sepenggal perjalanan kami — kenangan lainnya akan segera hadir.
        </p>
      </motion.div>

      <div className="mx-auto mt-10 w-[min(64rem,100%)] columns-2 gap-3 sm:gap-4 lg:mt-14 lg:columns-3">
        {images.map(({ src, alt }, index) => (
          <motion.button
            type="button"
            key={src}
            className="mb-3 block w-full cursor-zoom-in break-inside-avoid overflow-hidden sm:mb-4"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
              duration: 0.7,
              delay: (index % 3) * 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
            onClick={() => setPreviewImage({ src, alt })}
            aria-label={`Perbesar ${alt}`}
          >
            <img
              className="h-auto w-full bg-[#f8f7f2]/5 transition-transform duration-700 hover:scale-[1.03]"
              src={src}
              alt={alt}
              loading="lazy"
            />
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            className="fixed inset-0 z-60 flex cursor-zoom-out items-center justify-center bg-[#07090a]/95 p-4 backdrop-blur-sm sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label="Pratinjau foto galeri"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setPreviewImage(null)}
          >
            <motion.img
              className="max-h-[90svh] max-w-full cursor-default object-contain shadow-[0_2rem_6rem_rgba(0,0,0,0.45)]"
              src={previewImage.src}
              alt={previewImage.alt}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
            />
            <button
              type="button"
              className="absolute top-4 right-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/25 text-2xl leading-none text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-[#111517] sm:top-6 sm:right-6"
              onClick={() => setPreviewImage(null)}
              aria-label="Tutup pratinjau foto"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

const EVENTS = [
  {
    number: '01',
    title: 'Pemberkatan',
    time: '09.00 s.d. 11.00 WIB' ,
    venue: 'Gereja Katholik Santo Pio Bandar Hinalang',
    address: 'Saribudolok',
    image: '/events/church-line.svg',
    imageAlt: 'Ilustrasi garis gereja untuk pemberkatan pernikahan',
    animation: 'light',
  },
  {
    number: '02',
    title: 'Resepsi',
    time: '11.00 WIB s.d. selesai' ,
    venue: 'Gedung Serbaguna Sapanriah Saribudolok.',
    address: 'Saribudolok',
    image: '/events/reception-line.svg',
    imageAlt: 'Ilustrasi garis meja resepsi dengan lampu dan lilin',
    animation: 'sparkle',
  },
]

function EventSection() {
  return (
    <section
      className="relative flex min-h-svh snap-start items-center overflow-hidden bg-[#f0eee7] px-5 py-20 text-[#111517] sm:px-8 lg:px-12 lg:py-28"
      id="venue"
      aria-labelledby="venue-title"
    >
      <div className="mx-auto w-full max-w-6xl">
        <motion.div className="mx-auto max-w-2xl text-center" {...reveal}>
          <p className="m-0 text-[0.62rem] font-bold tracking-[0.3em] text-[#647449] uppercase lg:text-[0.68rem]">
            Detail Acara
          </p>
          <h2
            className="mt-4 font-['Tenor_Sans',sans-serif] text-[clamp(2.25rem,10vw,4rem)] leading-[1.05] font-normal tracking-[0.01em]"
            id="venue-title"
          >
            Pemberkatan &amp; Resepsi
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#111517]/65 sm:text-base">
            Dengan penuh sukacita, kami mengundang Anda untuk hadir dan menjadi bagian dari hari bahagia kami.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:mt-14 lg:grid-cols-2 lg:gap-6">
          {EVENTS.map((event, index) => (
            <motion.article
              className="group overflow-hidden border border-[#111517]/15 bg-[#f8f7f2] shadow-[0_1.5rem_4rem_rgba(17,21,23,0.06)]"
              key={event.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -6 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 0.75,
                delay: index * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="relative aspect-[3/2] overflow-hidden bg-[#111517]">
                <motion.img
                  className="h-full w-full object-cover"
                  src={event.image}
                  alt={event.imageAlt}
                  loading="lazy"
                  initial={{ opacity: 0, scale: 1.12 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                />
                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#111517]/45 via-transparent to-white/5" />

                {event.animation === 'light' && (
                  <motion.div
                    className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-18deg] bg-linear-to-r from-transparent via-white/28 to-transparent blur-xl"
                    animate={{ x: ['0%', '500%'] }}
                    transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
                    aria-hidden="true"
                  />
                )}

                {event.animation === 'sparkle' && (
                  <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                    {[
                      ['18%', '20%', 0],
                      ['42%', '15%', 0.8],
                      ['68%', '24%', 1.5],
                      ['83%', '12%', 2.1],
                      ['57%', '38%', 2.8],
                    ].map(([left, top, delay]) => (
                      <motion.span
                        className="absolute h-1.5 w-1.5 rounded-full bg-[#ffe5a3] shadow-[0_0_0.8rem_0.25rem_rgba(255,229,163,0.75)]"
                        key={`${left}-${top}`}
                        style={{ left, top }}
                        animate={{ opacity: [0.35, 1, 0.35], scale: [0.7, 1.35, 0.7] }}
                        transition={{ duration: 2.4, delay, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                )}

                <span
                  className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-[#111517]/25 font-['Tenor_Sans',sans-serif] text-[0.62rem] tracking-[0.16em] text-white backdrop-blur-sm"
                  aria-hidden="true"
                >
                  {event.number}
                </span>
              </div>

              <div className="p-7 sm:p-9 lg:p-10">
                <h3 className="font-['Tenor_Sans',sans-serif] text-3xl font-normal tracking-[0.02em] sm:text-4xl">
                  {event.title}
                </h3>

                <div className="mt-9 grid gap-7 border-t border-[#111517]/12 pt-7 sm:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <p className="text-[0.6rem] font-bold tracking-[0.24em] text-[#647449] uppercase">Waktu</p>
                  <p className="mt-2 text-base leading-relaxed sm:text-lg">{event.time}</p>
                </div>
                <div>
                  <p className="text-[0.6rem] font-bold tracking-[0.24em] text-[#647449] uppercase">Lokasi</p>
                  <address className="mt-2 not-italic">
                    <p className="font-['Tenor_Sans',sans-serif] text-lg leading-snug sm:text-xl">{event.venue}</p>
                    <p className="mt-2 text-sm leading-relaxed text-[#111517]/60 sm:text-base">{event.address}</p>
                  </address>
                </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

const BANK_ACCOUNTS = [
  {
    bank: 'BCA',
    number: '6460436310',
    displayNumber: 'Ice Maria Saragih',
    logo: '/banks/bca.svg',
    logoAlt: 'Logo BCA',
  },
  {
    bank: 'Mandiri',
    number: '1310016499875',
    displayNumber: 'Chandra Antonius Pur',
    logo: '/banks/mandiri.svg',
    logoAlt: 'Logo Bank Mandiri',
  },
]

function WeddingGiftSection() {
  const [copiedBank, setCopiedBank] = useState(null)

  const copyAccountNumber = async ({ bank, number }) => {
    try {
      await navigator.clipboard.writeText(number)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = number
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
    }

    setCopiedBank(bank)
    window.setTimeout(() => {
      setCopiedBank((currentBank) => (currentBank === bank ? null : currentBank))
    }, 2200)
  }

  return (
    <section
      className="relative flex min-h-svh snap-start items-center overflow-hidden bg-[#111517] px-5 py-20 text-[#f8f7f2] sm:px-8 lg:px-12 lg:py-28"
      id="wedding-gift"
      aria-labelledby="wedding-gift-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 20%, #d5e0c7 0, transparent 26%), radial-gradient(circle at 82% 78%, #d5e0c7 0, transparent 24%)',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <motion.div className="mx-auto max-w-2xl text-center" {...reveal}>
          <p className="m-0 text-[0.62rem] font-bold tracking-[0.3em] text-[#a3b18a] uppercase lg:text-[0.68rem]">
            Tanda Kasih
          </p>
          <h2
            className="mt-4 font-['Tenor_Sans',sans-serif] text-[clamp(2.6rem,12vw,4.75rem)] leading-none font-normal tracking-[0.02em]"
            id="wedding-gift-title"
          >
            Wedding Gift
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#f8f7f2]/65 sm:text-base sm:leading-8">
            Doa restu Anda merupakan hadiah terindah bagi kami. Namun, apabila Anda ingin
            memberikan tanda kasih, dapat dikirimkan melalui rekening berikut.
          </p>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5">
          {BANK_ACCOUNTS.map((account, index) => {
            const isCopied = copiedBank === account.bank

            return (
              <motion.article
                className="relative overflow-hidden border border-white/15 bg-white/[0.055] p-7 backdrop-blur-sm sm:p-8"
                key={account.bank}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{
                  duration: 0.75,
                  delay: index * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-[0.58rem] font-bold tracking-[0.26em] text-[#a3b18a] uppercase">
                      Bank Transfer
                    </p>
                    <h3 className="mt-2 font-['Tenor_Sans',sans-serif] text-2xl font-normal tracking-[0.04em] sm:text-3xl">
                      {account.bank}
                    </h3>
                  </div>
                  <span className="flex h-12 w-24 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white px-3 shadow-[0_0.6rem_1.5rem_rgba(0,0,0,0.14)]">
                    <img
                      className="h-auto max-h-7 w-full object-contain"
                      src={account.logo}
                      alt={account.logoAlt}
                      loading="lazy"
                    />
                  </span>
                </div>

                <div className="mt-10 border-t border-white/12 pt-7">
                  <p className="text-[0.58rem] font-bold tracking-[0.22em] text-white/45 uppercase">
                    Atas Nama
                  </p>
                  <p className="mt-3 text-[clamp(1.45rem,7vw,2rem)] leading-none tracking-[0.08em] tabular-nums">
                    {account.displayNumber}
                  </p>
                </div>

                <button
                  type="button"
                  className={`mt-8 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-3.5 text-[0.62rem] font-bold tracking-[0.2em] uppercase transition-colors duration-300 ${
                    isCopied
                      ? 'border-[#d5e0c7] bg-[#d5e0c7] text-[#111517]'
                      : 'border-white/25 text-white hover:border-white hover:bg-white hover:text-[#111517]'
                  }`}
                  onClick={() => copyAccountNumber(account)}
                  aria-label={`Salin nomor rekening ${account.bank}`}
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    aria-hidden="true"
                  >
                    {isCopied ? (
                      <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <>
                        <rect x="8" y="8" width="11" height="11" rx="2" />
                        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                      </>
                    )}
                  </svg>
                  {isCopied ? 'Berhasil Disalin' : 'Salin Nomor Rekening'}
                </button>
              </motion.article>
            )
          })}
        </div>

        <motion.div className="mx-auto mt-14 max-w-2xl text-center sm:mt-18" {...reveal}>
          <p className="font-['Snell_Roundhand','Segoe_Script','Brush_Script_MT',cursive] text-[clamp(2.15rem,10vw,3.5rem)] leading-none text-[#d5e0c7]">
            Thank you
          </p>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-white/60 sm:text-base">
            Terima kasih atas doa, restu, dan kasih yang Anda berikan untuk perjalanan baru
            kami.
          </p>
          <p className="mt-7 text-[0.62rem] font-bold tracking-[0.28em] text-[#a3b18a] uppercase">
            Ice &amp; Chandra
          </p>
        </motion.div>

        <p className="sr-only" aria-live="polite">
          {copiedBank ? `Nomor rekening ${copiedBank} berhasil disalin.` : ''}
        </p>
      </div>
    </section>
  )
}

function Cover({ onOpen, guestName }) {
  return (
    <motion.section
      className="fixed inset-0 isolate z-30 overflow-hidden bg-[#b5d9e5]"
      id="home"
      aria-labelledby="couple-names"
      exit={{ y: '-100%' }}
      transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
    >
      <motion.img
        className="absolute inset-0 h-full w-full object-cover object-bottom"
        src="/ice-chandra-cover.jpg"
        alt="Ice and Chandra holding hands in a field of yellow flowers"
        fetchPriority="high"
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-[#b5d9e5]/10 via-transparent to-transparent" />

      <motion.div
        className="relative z-10 mx-auto flex h-full w-[min(72rem,calc(100%-2.5rem))] flex-col pt-[8svh] sm:pt-[9svh] lg:pt-[9svh]"
        initial="hidden"
        animate="show"
        exit="hidden"
        variants={{
          hidden: { opacity: 0, transition: { duration: 0.3 } },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.15, delayChildren: 0.35 },
          },
        }}
      >
        <motion.p
          className="mb-4 font-['Snell_Roundhand','Segoe_Script','Brush_Script_MT',cursive] text-[clamp(1.45rem,7vw,2.15rem)] leading-none font-semibold tracking-[0.01em] lg:mb-6 lg:text-[clamp(2.1rem,3vw,3.1rem)]"
          variants={{
            hidden: { opacity: 0, y: 24 },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
            },
          }}
        >
          we share our happiness
        </motion.p>
        <motion.h1
          className="flex flex-col font-['Tenor_Sans',sans-serif] text-[clamp(3.25rem,16vw,5.25rem)] leading-[0.87] font-normal tracking-[0.015em] lg:text-[clamp(5rem,7vw,7.5rem)]"
          id="couple-names"
          variants={{
            hidden: { opacity: 0, y: 40 },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
            },
          }}
        >
          <span>ICE &amp;</span>
          <span>CHANDRA</span>
        </motion.h1>
        <motion.p
          className="mt-6 max-w-3xl text-[0.9rem] leading-relaxed tracking-[0.01em] sm:text-base lg:mt-8 lg:text-xl"
          variants={{
            hidden: { opacity: 0, y: 24 },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
            },
          }}
        >
          And over all these virtues put on love, which binds them
          all together in perfect unity — Colossians 3:14
        </motion.p>

        <motion.div
          className="mt-auto pb-[10svh]"
          variants={{
            hidden: { opacity: 0, y: 24 },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
            },
          }}
        >
          {guestName && (
            <div className="mb-5 max-w-sm rounded-r-lg border-l border-[#111517]/45 bg-[#f8f7f2]/75 px-4 py-3 text-left shadow-sm backdrop-blur-sm">
              <p className="text-[0.58rem] font-bold tracking-[0.22em] text-[#111517]/65 uppercase">
                Kepada Yth. Bapak/Ibu/Saudara/i
              </p>
              <p className="mt-1.5 font-['Tenor_Sans',sans-serif] text-xl leading-snug sm:text-2xl">
                {guestName}
              </p>
            </div>
          )}
          <button
            type="button"
            className="group inline-flex cursor-pointer items-center gap-3 rounded-full border border-[#111517] bg-[#111517] px-7 py-3.5 text-[0.68rem] font-bold tracking-[0.22em] text-[#f8f7f2] uppercase transition-colors duration-300 hover:bg-transparent hover:text-[#111517]"
            onClick={onOpen}
          >
            Open Invitation
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
              &rarr;
            </span>
          </button>
        </motion.div>
      </motion.div>
    </motion.section>
  )
}

function MusicControl({ isPlaying, onToggle }) {
  return (
    <motion.button
      type="button"
      className="fixed right-5 bottom-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-[#111517]/80 text-lg text-white shadow-lg backdrop-blur-md transition-colors hover:bg-[#111517] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6 sm:bottom-6"
      onClick={onToggle}
      aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
      title={isPlaying ? 'Pause music' : 'Play music'}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.92 }}
    >
      <span aria-hidden="true">{isPlaying ? 'Ⅱ' : '♪'}</span>
    </motion.button>
  )
}

function App() {
  const [opened, setOpened] = useState(false)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicAvailable, setMusicAvailable] = useState(true)
  const audioRef = useRef(null)
  const guestName = (() => {
    const params = new URLSearchParams(window.location.search)
    return (params.get('guest') || params.get('to') || '').trim().slice(0, 100)
  })()

  const playMusic = async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      audio.volume = 0.45
      await audio.play()
    } catch {
      setMusicPlaying(false)
    }
  }

  const openInvitation = () => {
    setOpened(true)
    playMusic()
  }

  const toggleMusic = () => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      playMusic()
    } else {
      audio.pause()
    }
  }

  useEffect(() => {
    document.documentElement.style.overflow = opened ? '' : 'hidden'
    document.body.style.overflow = opened ? '' : 'hidden'
    if (opened) window.scrollTo({ top: 0, behavior: 'auto' })
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [opened])

  return (
    <main className="min-w-80 overflow-x-hidden bg-[#f8f7f2] font-['Tenor_Sans',sans-serif] text-[#111517]">
      <audio
        ref={audioRef}
        loop
        preload="metadata"
        onPlay={() => setMusicPlaying(true)}
        onPause={() => setMusicPlaying(false)}
        onError={() => setMusicAvailable(false)}
      >
        <source src="/music/everlasting-love-jesse-barrera.mp3" type="audio/mpeg" />
      </audio>

      <AnimatePresence>
        {!opened && <Cover onOpen={openInvitation} guestName={guestName} />}
      </AnimatePresence>

      {opened && <SectionNav />}
      {opened && musicAvailable && (
        <MusicControl isPlaying={musicPlaying} onToggle={toggleMusic} />
      )}
      {opened && (
        <>
          <ProfileSection
            id="groom"
            role="Mempelai Pria"
            name="Chandra"
            fullName="Chandra Antonius Purba"
            parents="Putra dari Bapak Jamarliden Purba & Ibu Jenda Pengadin Sembiring"
            photoSrc={groomPortrait}
            photoAlt="Potret Chandra, mempelai pria"
          />

          <ProfileSection
            id="bride"
            role="Mempelai Wanita"
            name="Ice"
            fullName="Ice Maria Saragih"
            parents="Putri dari Bapak Denni Walton Saragih & Ibu Derliyanna Sipayung"
            photoSrc={bridePortrait}
            photoAlt="Potret Ice, mempelai wanita"
          />

          <EventSection />

          <section
            className="relative flex min-h-svh snap-start flex-col overflow-hidden bg-[#f8f7f2]"
            id="countdown"
            aria-labelledby="countdown-title"
          >
            <div className="relative h-[52svh] min-h-80 w-full shrink-0 overflow-hidden bg-[#f8f7f2] lg:aspect-[3/2] lg:h-auto lg:min-h-0 lg:flex-none">
              <motion.img
                className="absolute inset-0 z-10 block h-full w-full object-cover object-[center_62%]"
                src="/ice-chandra-details.jpg"
                alt="Ice dan Chandra duduk bersama mengenakan celana jeans dan sepatu merah"
                loading="lazy"
                initial={{ opacity: 0, scale: 1.06 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            <motion.div
              className="relative z-10 mx-auto flex w-[min(60rem,calc(100%-2rem))] flex-col items-center justify-center py-6 text-center sm:py-8 lg:py-10"
              {...reveal}
            >
              <p className="m-0 text-[0.62rem] font-bold tracking-[0.3em] text-[#647449] lg:text-[0.68rem]">
                CATAT TANGGALNYA
              </p>
              <h2
                className="mt-3 text-[clamp(2.5rem,12vw,4rem)] leading-none font-light tracking-[0.03em] lg:text-6xl"
                id="countdown-title"
              >
                24 · 10 · 2026
              </h2>
              <p className="mt-3 mb-6 font-['Snell_Roundhand','Segoe_Script','Brush_Script_MT',cursive] text-[clamp(1.45rem,7vw,2rem)] leading-none lg:mb-8 lg:text-4xl">
                Ice &amp; Chandra
              </p>
              <Countdown />
              <p className="mt-5 text-sm tracking-[0.02em] text-[#596052] lg:text-base">
                Kami tidak sabar merayakan hari bahagia ini bersama Anda.
              </p>
            </motion.div>
          </section>

          <WeddingGiftSection />

          <LoveStoriesSection />

          <GallerySection />
        </>
      )}
    </main>
  )
}

export default App
