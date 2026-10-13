import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
}

const inputClassName =
  'mt-3 min-h-12 w-full rounded-sm border border-[#f8f7f2]/25 bg-[#f8f7f2]/5 px-4 py-3 text-base leading-relaxed text-[#f8f7f2] placeholder:text-[#f8f7f2]/40 transition-colors focus:border-[#a3b18a] focus:outline-2 focus:outline-offset-4 focus:outline-[#a3b18a] disabled:opacity-60'

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
})

const formatWishDate = (createdAt) => {
  if (!createdAt) return null
  const date = new Date(createdAt)
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date)
}

export default function WishesSection({
  guestName = '',
  onSubmit = null,
  wishes = [],
  loading = false,
  loadError = '',
}) {
  const [name, setName] = useState(() => guestName.slice(0, 100))
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [visibleCount, setVisibleCount] = useState(5)
  const submitting = useRef(false)
  const nameInput = useRef(null)
  const messageInput = useRef(null)
  const canSubmit = typeof onSubmit === 'function'

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting.current || !canSubmit) return

    const trimmedName = name.trim()
    const trimmedMessage = message.trim()
    setSuccess(false)

    if (!trimmedName) {
      setError({ field: 'name', text: 'Mohon isi nama Anda.' })
      nameInput.current?.focus()
      return
    }

    if (!trimmedMessage) {
      setError({ field: 'message', text: 'Mohon tuliskan doa atau ucapan Anda.' })
      messageInput.current?.focus()
      return
    }

    submitting.current = true
    setPending(true)
    setError(null)

    try {
      const result = await onSubmit({ name: trimmedName, message: trimmedMessage })
      if (result === false || result?.ok === false) throw new Error('Submission failed')
      setMessage('')
      setSuccess(true)
    } catch {
      setError({ field: null, text: 'Ucapan belum terkirim. Silakan coba kembali.' })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  const clearFeedback = (field) => {
    setSuccess(false)
    if (error?.field === field || error?.field === null) setError(null)
  }

  return (
    <section
      className="relative flex min-h-svh snap-start items-center overflow-hidden bg-[#111517] py-20 pr-14 pl-5 text-[#f8f7f2] sm:px-8 lg:px-12 lg:py-28"
      id="wishes"
      aria-labelledby="wishes-title"
    >
      <div className="mx-auto w-full max-w-5xl">
        <motion.div className="mx-auto max-w-2xl text-center" {...reveal}>
          <p className="m-0 text-[0.62rem] font-bold tracking-[0.3em] text-[#a3b18a] uppercase lg:text-[0.68rem]">
            Titipkan Harapan
          </p>
          <h2
            className="mt-4 font-['Tenor_Sans',sans-serif] text-[clamp(2.25rem,10vw,4rem)] leading-[1.1] font-normal tracking-[0.01em]"
            id="wishes-title"
          >
            Doa dan Ucapan
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#f8f7f2]/70 sm:text-base sm:leading-8">
            Setiap doa dan ucapan Anda menjadi bagian yang berharga dalam awal
            perjalanan kami bersama.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-10 sm:mt-14 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
          <motion.form
            className="border border-[#f8f7f2]/15 bg-[#f8f7f2]/3 p-6 sm:p-8"
            onSubmit={handleSubmit}
            noValidate
            aria-busy={pending}
            {...reveal}
          >
            <div>
              <label className="text-sm tracking-[0.02em]" htmlFor="wishes-name">
                Nama Anda <span className="text-[#a3b18a]">*</span>
              </label>
              <input
                ref={nameInput}
                className={inputClassName}
                id="wishes-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Nama lengkap Anda"
                required
                maxLength={100}
                value={name}
                disabled={pending}
                aria-invalid={error?.field === 'name' || undefined}
                aria-describedby={error?.field === 'name' ? 'wishes-error' : undefined}
                onChange={(event) => {
                  setName(event.target.value)
                  clearFeedback('name')
                }}
              />
            </div>

            <div className="mt-7">
              <label className="text-sm tracking-[0.02em]" htmlFor="wishes-message">
                Doa dan ucapan <span className="text-[#a3b18a]">*</span>
              </label>
              <textarea
                ref={messageInput}
                className={`${inputClassName} min-h-40 resize-y`}
                id="wishes-message"
                name="message"
                placeholder="Tuliskan harapan baik Anda untuk Ice dan Chandra…"
                required
                maxLength={1000}
                rows={5}
                value={message}
                disabled={pending}
                aria-invalid={error?.field === 'message' || undefined}
                aria-describedby={`wishes-public-note wishes-character-count${error?.field === 'message' ? ' wishes-error' : ''}`}
                onChange={(event) => {
                  setMessage(event.target.value)
                  clearFeedback('message')
                }}
              />
              <p className="mt-3 text-xs leading-relaxed text-[#f8f7f2]/65" id="wishes-public-note">
                Ucapan Anda akan tampil di undangan ini.
              </p>
              <p
                className="mt-2 text-right text-xs tabular-nums text-[#f8f7f2]/55"
                id="wishes-character-count"
              >
                {message.length} / 1.000 karakter
              </p>
            </div>

            {error && (
              <p className="mt-5 text-sm leading-relaxed text-[#ffc8b7]" id="wishes-error" role="alert">
                {error.text}
              </p>
            )}

            {!canSubmit && (
              <p className="mt-5 text-sm leading-relaxed text-[#f8f7f2]/65" id="wishes-availability">
                Form doa dan ucapan segera dibuka.
              </p>
            )}

            <button
              className="mt-7 flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-[#a3b18a] bg-[#a3b18a] px-6 py-3.5 text-[0.65rem] font-bold tracking-[0.15em] text-[#111517] uppercase transition-colors hover:bg-[#c2cdaa] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8f7f2] disabled:cursor-not-allowed disabled:border-[#f8f7f2]/20 disabled:bg-[#f8f7f2]/10 disabled:text-[#f8f7f2]/50 sm:w-auto sm:min-w-52"
              type="submit"
              disabled={pending || !canSubmit}
              aria-describedby={!canSubmit ? 'wishes-availability' : undefined}
            >
              {pending ? 'Mengirim…' : 'Kirim Ucapan'}
              {!pending && <span className="text-base" aria-hidden="true">↗</span>}
            </button>

            <p className="mt-4 text-sm leading-relaxed text-[#c2cdaa]" role="status" aria-live="polite">
              {success ? 'Terima kasih. Doa dan ucapan Anda telah terkirim.' : pending ? 'Ucapan Anda sedang dikirim.' : ''}
            </p>
          </motion.form>

          <motion.div
            className="min-w-0 border-t border-[#f8f7f2]/15 pt-10 lg:border-t-0 lg:pt-0"
            role="region"
            aria-labelledby="wishes-list-title"
            aria-busy={loading}
            {...reveal}
          >
            <h3
              className="font-['Tenor_Sans',sans-serif] text-2xl leading-tight font-normal sm:text-3xl"
              id="wishes-list-title"
            >
              Harapan untuk Kami
            </h3>
            <p className="mt-3 text-sm text-[#a3b18a]" role="status" aria-live="polite">
              {loading ? 'Memuat ucapan…' : loadError ? '' : `${wishes.length} ucapan`}
            </p>

            {!loading && loadError && (
              <p className="mt-6 text-sm leading-7 text-[#ffc8b7]" role="alert">
                {loadError}
              </p>
            )}

            {!loading && !loadError && wishes.length === 0 && (
              <p className="mt-8 border-y border-[#f8f7f2]/15 py-8 text-sm leading-7 text-[#f8f7f2]/70">
                Belum ada ucapan. Jadilah yang pertama membagikan doa untuk kami.
              </p>
            )}

            {!loading && wishes.length > 0 && (
              <>
                <div
                  className="mt-6 max-h-[32rem] overflow-y-auto overscroll-contain pr-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a3b18a]"
                  tabIndex={0}
                  aria-label="Daftar doa dan ucapan, dapat digulir"
                >
                  <ul className="divide-y divide-[#f8f7f2]/15" id="wishes-list">
                    {wishes.slice(0, visibleCount).map((wish, index) => {
                      const formattedDate = formatWishDate(wish.createdAt)

                      return (
                        <li className="py-6 first:pt-0" key={wish.id ?? `${wish.createdAt}-${index}`}>
                          <p className="text-sm font-semibold break-words text-[#a3b18a]">
                            {wish.name}
                          </p>
                          {formattedDate && (
                            <time className="mt-1 block text-xs text-[#f8f7f2]/50" dateTime={wish.createdAt}>
                              {formattedDate}
                            </time>
                          )}
                          <p className="mt-3 text-sm leading-7 break-words whitespace-pre-line text-[#f8f7f2]/80">
                            {wish.message}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {visibleCount < wishes.length && (
                  <button
                    className="mt-6 min-h-12 cursor-pointer rounded-full border border-[#f8f7f2]/30 px-6 py-3 text-[0.65rem] font-bold tracking-[0.12em] text-[#f8f7f2] uppercase transition-colors hover:border-[#a3b18a] hover:text-[#a3b18a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a3b18a]"
                    type="button"
                    aria-controls="wishes-list"
                    onClick={() => setVisibleCount((count) => count + 5)}
                  >
                    Lihat lebih banyak
                  </button>
                )}
              </>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
