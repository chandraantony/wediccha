import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
}

const inputClassName = "min-h-12 w-full border border-[#111517]/20 bg-[#f8f7f2] px-4 py-3 text-base text-[#111517] outline-none transition-colors placeholder:text-[#111517]/40 focus:border-[#647449] focus:ring-2 focus:ring-[#647449]/25 disabled:opacity-60"
const labelClassName = 'mb-3 block text-xs font-bold tracking-[0.08em] text-[#111517]'
const errorClassName = 'mt-2 text-sm leading-relaxed text-[#9a3535]'

export default function RsvpSection({
  guestName = '',
  onSubmit = null,
  counts = null,
  loading = false,
  loadError = '',
}) {
  const [name, setName] = useState(guestName)
  const [attendance, setAttendance] = useState('')
  const [guests, setGuests] = useState('1')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const submittingRef = useRef(false)
  const nameRef = useRef(null)
  const attendanceRef = useRef(null)
  const guestsRef = useRef(null)
  const submissionAvailable = typeof onSubmit === 'function'

  const clearFieldError = (field) => {
    setErrors((previous) => ({ ...previous, [field]: undefined }))
    setFeedback(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!submissionAvailable || submittingRef.current) return

    const nextErrors = {}
    const trimmedName = name.trim()
    const guestCount = Number(guests)

    if (!trimmedName) nextErrors.name = 'Silakan isi nama Anda.'
    if (!attendance) nextErrors.attendance = 'Silakan pilih konfirmasi kehadiran Anda.'
    if (
      attendance === 'hadir' &&
      (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 10)
    ) {
      nextErrors.guests = 'Jumlah tamu harus antara 1 hingga 10 orang.'
    }

    setErrors(nextErrors)
    setFeedback(null)

    if (Object.keys(nextErrors).length) {
      const invalidField = nextErrors.name
        ? nameRef
        : nextErrors.attendance
          ? attendanceRef
          : guestsRef
      invalidField.current?.focus()
      return
    }

    submittingRef.current = true
    setSubmitting(true)

    try {
      const result = await onSubmit({
        name: trimmedName,
        attendance,
        guests: attendance === 'hadir' ? guestCount : 0,
      })

      if (result === false || result?.ok === false) {
        throw new Error('Submission failed')
      }

      setName(trimmedName)
      setFeedback({
        type: 'success',
        message: 'Terima kasih. Konfirmasi kehadiran Anda telah terkirim.',
      })
    } catch {
      setFeedback({
        type: 'error',
        message: 'Konfirmasi belum terkirim. Silakan coba kembali.',
      })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <section
      className="relative flex min-h-svh snap-start items-center bg-[#f0eee7] py-20 pl-5 pr-14 text-[#111517] sm:px-8 lg:px-12 lg:py-28"
      id="rsvp"
      aria-labelledby="rsvp-title"
    >
      <div className="mx-auto w-full max-w-5xl">
        <motion.div className="mx-auto max-w-2xl text-center" {...reveal}>
          <p className="m-0 text-[0.62rem] font-bold tracking-[0.3em] text-[#647449] uppercase lg:text-[0.68rem]">
            Sampai Jumpa di Hari Bahagia
          </p>
          <h2
            className="mt-4 font-['Tenor_Sans',sans-serif] text-[clamp(2.25rem,9vw,4rem)] leading-[1.1] font-normal tracking-[0.01em]"
            id="rsvp-title"
          >
            Konfirmasi Kehadiran
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#111517]/65 sm:text-base">
            Kehadiran Anda akan melengkapi kebahagiaan kami. Silakan berikan konfirmasi agar kami dapat menyambut Anda dengan baik.
          </p>
        </motion.div>

        <motion.div
          className="mx-auto mt-9 grid w-full max-w-xl grid-cols-3 border-y border-[#111517]/15 sm:mt-10"
          aria-label="Jumlah konfirmasi kehadiran"
          aria-busy={loading}
          {...reveal}
        >
          {[
            ['attending', 'Konfirmasi hadir'],
            ['guests', 'Tamu hadir'],
            ['notAttending', 'Tidak hadir'],
          ].map(([key, label], index) => (
            <div
              className={`flex min-h-24 flex-col items-center justify-center px-2 py-5 text-center sm:min-h-28 ${index > 0 ? 'border-l border-[#111517]/15' : ''}`}
              key={key}
            >
              <span className="font-['Tenor_Sans',sans-serif] text-2xl leading-none tabular-nums sm:text-3xl">
                {!loading && Number.isFinite(counts?.[key]) ? counts[key] : '—'}
              </span>
              <span className="mt-3 text-[0.56rem] font-bold leading-relaxed tracking-[0.06em] text-[#647449] uppercase sm:text-[0.62rem] sm:tracking-[0.1em]">
                {label}
              </span>
            </div>
          ))}
        </motion.div>

        {loadError && (
          <p className="mx-auto mt-4 max-w-xl text-center text-xs leading-relaxed text-[#9a3535]" role="status">
            {loadError}
          </p>
        )}

        <motion.form
          className="mx-auto mt-10 w-full max-w-xl border border-[#111517]/15 bg-[#f8f7f2] p-6 shadow-[0_1.5rem_4rem_rgba(17,21,23,0.05)] sm:mt-14 sm:p-10"
          onSubmit={handleSubmit}
          noValidate
          aria-busy={submitting}
          {...reveal}
        >
          <div>
            <label className={labelClassName} htmlFor="rsvp-name">Nama Anda</label>
            <input
              className={inputClassName}
              id="rsvp-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Tulis nama Anda"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                clearFieldError('name')
              }}
              required
              maxLength={100}
              disabled={submitting}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'rsvp-name-error' : undefined}
              ref={nameRef}
            />
            {errors.name && <p className={errorClassName} id="rsvp-name-error">{errors.name}</p>}
          </div>

          <fieldset
            className="mt-7"
            aria-describedby={errors.attendance ? 'rsvp-attendance-error' : undefined}
          >
            <legend className={labelClassName}>Konfirmasi Kehadiran</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['hadir', 'Hadir'],
                ['tidak_hadir', 'Tidak dapat hadir'],
              ].map(([value, label], index) => (
                <label
                  className={`flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-[#647449]/40 ${
                    attendance === value
                      ? 'border-[#647449] bg-[#647449]/8'
                      : 'border-[#111517]/20 hover:border-[#647449]/60'
                  } ${submitting ? 'cursor-wait opacity-60' : ''}`}
                  key={value}
                >
                  <input
                    className="h-4 w-4 shrink-0 accent-[#647449]"
                    type="radio"
                    name="attendance"
                    value={value}
                    checked={attendance === value}
                    onChange={() => {
                      setAttendance(value)
                      clearFieldError('attendance')
                      setErrors((previous) => ({ ...previous, guests: undefined }))
                    }}
                    required
                    disabled={submitting}
                    aria-invalid={Boolean(errors.attendance)}
                    ref={index === 0 ? attendanceRef : undefined}
                  />
                  {label}
                </label>
              ))}
            </div>
            {errors.attendance && (
              <p className={errorClassName} id="rsvp-attendance-error">{errors.attendance}</p>
            )}
          </fieldset>

          {attendance === 'hadir' && (
            <div className="mt-7">
              <label className={labelClassName} htmlFor="rsvp-guests">
                Jumlah Tamu
              </label>
              <input
                className={inputClassName}
                id="rsvp-guests"
                name="guests"
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                step={1}
                required
                value={guests}
                onChange={(event) => {
                  setGuests(event.target.value)
                  clearFieldError('guests')
                }}
                disabled={submitting}
                aria-invalid={Boolean(errors.guests)}
                aria-describedby={`rsvp-guests-help${errors.guests ? ' rsvp-guests-error' : ''}`}
                ref={guestsRef}
              />
              <p className="mt-2 text-xs leading-relaxed text-[#111517]/60" id="rsvp-guests-help">
                Termasuk Anda, maksimal 10 orang.
              </p>
              {errors.guests && <p className={errorClassName} id="rsvp-guests-error">{errors.guests}</p>}
            </div>
          )}

          <button
            className="mt-8 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[#111517] px-6 py-4 text-[0.65rem] font-bold tracking-[0.16em] text-[#f8f7f2] uppercase transition-colors hover:bg-[#647449] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#647449] disabled:cursor-not-allowed disabled:bg-[#111517]/35"
            type="submit"
            disabled={!submissionAvailable || submitting}
            aria-describedby={!submissionAvailable ? 'rsvp-availability' : undefined}
          >
            {submitting ? 'Mengirim...' : 'Kirim Konfirmasi'}
          </button>

          {!submissionAvailable && (
            <p className="mt-4 text-center text-xs leading-relaxed text-[#111517]/60" id="rsvp-availability">
              Form konfirmasi kehadiran segera dibuka.
            </p>
          )}

          <div aria-live="polite" aria-atomic="true">
            {feedback && (
              <p
                className={`mt-4 text-center text-sm leading-relaxed ${feedback.type === 'success' ? 'text-[#647449]' : 'text-[#9a3535]'}`}
              >
                {feedback.message}
              </p>
            )}
          </div>
        </motion.form>
      </div>
    </section>
  )
}
