import { t, uiText, formatMoney } from "../i18n/core"
import { useEffect, useId, useRef, useState } from "react"
import { Badge, Button, Empty, Heading, Icon } from "./UI"
import { carouselPages, normalizedSlide } from "./carousel"
import type { Lawyer } from "./model"

export function LawyerBadge({ lawyer }: { lawyer: Lawyer }) {
  if (lawyer.test)
    return <Badge state="Pendiente">Cuenta de prueba — matrícula no verificada</Badge>
  return lawyer.verified ? (
    <Badge state="Verificada">
      <Icon name="shield" /> Matrícula verificada
    </Badge>
  ) : (
    <Badge state="Pendiente">Matrícula sin verificar</Badge>
  )
}

function LawyerCard({
  lawyer,
  onView,
  onConsult,
}: {
  lawyer: Lawyer
  onView: () => void
  onConsult: () => void
}) {
  return (
    <article className="catalog-card professional-card">
      <div className="professional-card-top">
        <div className="professional-photo">
          <span className="initials-photo" aria-hidden="true">{lawyer.initials}</span>
          {lawyer.verified && (
            <span className="photo-verified" title="Matrícula verificada">
              <Icon name="check" />
            </span>
          )}
        </div>
        <div className="professional-card-identity">
          <span className="professional-specialty">
            {lawyer.specialty ? uiText(lawyer.specialty) : "Especialidad no informada"}
          </span>
          <Heading level={3}>{lawyer.name}</Heading>
          {lawyer.years != null && (
            <div className="professional-rating">
              <Icon name="briefcase" />
              <span>
                {t("common.years", { count: lawyer.years })} de experiencia
              </span>
            </div>
          )}
        </div>
      </div>
      <p className="professional-description">
        {lawyer.description || lawyer.specialties.map(uiText).join(" · ")}
      </p>
      <div className="professional-location">
        <Icon name="location" />
        <span>{lawyer.location}</span>
      </div>
      <div className="professional-verification">
        <LawyerBadge lawyer={lawyer} />
      </div>
      <div className="professional-card-bottom">
        <div className="professional-fee">
          <span>Honorarios publicados</span>
          <strong>{lawyer.fee != null ? formatMoney(lawyer.fee) : "A convenir"}</strong>
        </div>
        <div className="professional-card-actions">
          <Button onClick={onView}>
            {t("lawyers.viewProfile")} <Icon name="arrow" />
          </Button>
          <Button
            variant="secondary"
            onClick={onConsult}
            disabled={!lawyer.contactEnabled}
            title={lawyer.contactEnabled ? undefined : "Este profesional no habilitó el contacto por WhatsApp"}
          >
            {lawyer.contactEnabled ? t("lawyers.contact") : "Contacto no disponible"}
          </Button>
        </div>
      </div>
    </article>
  )
}
export function LawyerCarousel({
  lawyers,
  label,
  onView,
  onConsult,
  suspended = false,
  onClear,
}: {
  lawyers: Lawyer[]
  label: string
  onView: (lawyer: Lawyer) => void
  onConsult: (lawyer: Lawyer) => void
  suspended?: boolean
  onClear?: () => void
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const frame = useRef(0),
    settling = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const animating = useRef(false)
  const playbackIntent = useRef<boolean | null>(null)
  const [visible, setVisible] = useState(3)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  const [paused, setPaused] = useState(false),
    [hovered, setHovered] = useState(false)
  const [inView, setInView] = useState(false),
    [tabVisible, setTabVisible] = useState(!document.hidden)
  const [position, setPosition] = useState(0)
  const positionRef = useRef(0)
  const id = useId()
  const count = lawyers.length,
    canMove = count > visible
  const signature = lawyers.map((l) => l.id).join(",")
  const pages = carouselPages(count, visible)
  const playing =
    canMove &&
    !paused &&
    !reduced &&
    !hovered &&
    !suspended &&
    inView &&
    tabVisible

  function pitch() {
    const items =
      viewport.current?.querySelectorAll<HTMLElement>(".carousel-slide")
    return items && items.length > 1
      ? items[1].getBoundingClientRect().left -
          items[0].getBoundingClientRect().left
      : 0
  }
  function setIndex(index: number) {
    positionRef.current = index
    setPosition(index)
  }
  function stopAnimation() {
    cancelAnimationFrame(frame.current)
    animating.current = false
  }
  function jump(index: number) {
    const el = viewport.current
    if (!el) return
    el.style.scrollSnapType = "none"
    el.scrollLeft = ((canMove ? count : 0) + index) * pitch()
    el.style.scrollSnapType = ""
    setIndex(index)
  }
  function move(direction: number, targetPage?: number) {
    if (!canMove || animating.current || !viewport.current) return
    const current = positionRef.current
    let target = targetPage
    if (target === undefined) {
      target =
        direction > 0
          ? (pages.find((p) => p > current) ?? count)
          : ([...pages].reverse().find((p) => p < current) ??
            -Math.min(count, visible))
    }
    const destination = normalizedSlide(target, count)
    const el = viewport.current,
      start = el.scrollLeft
    const end = (count + target) * pitch()
    if (reduced) {
      jump(destination)
      return
    }
    animating.current = true
    el.style.scrollSnapType = "none"
    const began = performance.now()
    function animate(now: number) {
      const t = Math.min(1, (now - began) / 500)
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      el!.scrollLeft = start + (end - start) * eased
      if (t < 1) frame.current = requestAnimationFrame(animate)
      else {
        animating.current = false
        jump(destination)
      }
    }
    frame.current = requestAnimationFrame(animate)
  }
  // Keep the latest navigation function available to the timer without resetting it on unrelated app renders.
  const moveRef = useRef(move)
  moveRef.current = move

  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const resize = () => {
      stopAnimation()
      setViewportWidth(el.clientWidth)
      setVisible(
        window.matchMedia("(min-width: 1024px)").matches
          ? 3
          : window.matchMedia("(min-width: 640px)").matches
            ? 2
            : 1,
      )
    }
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    const intersection = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 },
    )
    intersection.observe(el)
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const motion = () => {
      setReduced(media.matches)
      if (media.matches) {
        setPaused(true)
        stopAnimation()
      }
    }
    const visibility = () => setTabVisible(!document.hidden)
    media.addEventListener("change", motion)
    document.addEventListener("visibilitychange", visibility)
    resize()
    return () => {
      observer.disconnect()
      intersection.disconnect()
      media.removeEventListener("change", motion)
      document.removeEventListener("visibilitychange", visibility)
      stopAnimation()
      clearTimeout(settling.current)
    }
  }, [count])
  useEffect(() => {
    stopAnimation()
    const el = viewport.current
    if (!el) return
    const reset = requestAnimationFrame(() => jump(0))
    return () => cancelAnimationFrame(reset)
  }, [signature])
  useEffect(() => {
    stopAnimation()
    const resize = requestAnimationFrame(() =>
      jump(Math.max(0, Math.min(positionRef.current, count - visible))),
    )
    return () => cancelAnimationFrame(resize)
  }, [visible, canMove, viewportWidth, reduced])
  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => moveRef.current(1), 4500)
    return () => clearInterval(timer)
  }, [playing, signature, visible])
  function settle() {
    if (animating.current) return
    clearTimeout(settling.current)
    settling.current = setTimeout(() => {
      const el = viewport.current,
        step = pitch()
      if (!el || !step) return
      const raw = Math.round(el.scrollLeft / step) - (canMove ? count : 0)
      const normalized = normalizedSlide(raw, count)
      const bounded = Math.min(normalized, Math.max(0, count - visible))
      jump(bounded)
    }, 160)
  }
  const manual = (direction: number, page?: number) => {
    setPaused(true)
    move(direction, page)
  }
  const pauseInteraction = () => {
    setPaused(true)
    stopAnimation()
    settle()
  }
  if (!count)
    return (
      <Empty
        title={t("lawyers.noProfessionalsMatchTheseFilters")}
        action={
          onClear && (
            <Button variant="secondary" onClick={onClear}>
              {t("lawyers.clearFilters")}
            </Button>
          )
        }
      >
        {t("lawyers.tryAnotherSpecialtyOrSearchByName")}
      </Empty>
    )
  const copies = canMove ? [-1, 0, 1] : [0]
  return (
    <section
      className="lawyer-carousel"
      role="region"
      aria-roledescription={t("common.carousel")}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setPaused(true)}
    >
      <div className="carousel-toolbar">
        <p
          className="carousel-position"
          aria-live={playing ? "off" : "polite"}
          aria-atomic="true"
        >
          <span className="carousel-position-mark" />
          {count === 1
            ? t("lawyers.1ProfessionalAvailable")
            : t("carousel.range", {
                start: position + 1,
                end: Math.min(position + visible, count),
                count,
              })}
        </p>
        <div className="carousel-controls">
          <Button
            variant="ghost"
            className="carousel-play"
            disabled={!canMove || reduced}
            // Pointer intent precedes focus, which also pauses playback.
            onPointerDown={() => {
              playbackIntent.current = !paused
            }}
            onPointerCancel={() => {
              playbackIntent.current = null
            }}
            onBlur={() => {
              playbackIntent.current = null
            }}
            onClick={() => {
              setPaused(playbackIntent.current ?? !paused)
              playbackIntent.current = null
            }}
            aria-controls={id}
            aria-label={
              reduced
                ? t("lawyers.autoplayDisabledForReducedMotion")
                : !canMove
                  ? t("lawyers.autoplayUnavailableAllResultsAreVisible")
                  : paused
                    ? t("lawyers.resumeAutoplay")
                    : t("lawyers.pauseAutoplay")
            }
          >
            <Icon name={paused || reduced || !canMove ? "play" : "pause"} />
            <span>
              {reduced
                ? t("lawyers.noAutomaticAnimation")
                : !canMove
                  ? t("lawyers.allVisible")
                  : paused
                    ? t("lawyers.resume")
                    : t("lawyers.pause")}
            </span>
          </Button>
          <Button
            variant="secondary"
            disabled={!canMove}
            onClick={() => manual(-1)}
            aria-label={t("lawyers.previousProfessionals")}
            aria-controls={id}
          >
            <Icon name="chevron-left" />
          </Button>
          <Button
            variant="secondary"
            disabled={!canMove}
            onClick={() => manual(1)}
            aria-label={t("lawyers.nextProfessionals")}
            aria-controls={id}
          >
            <Icon name="chevron-right" />
          </Button>
        </div>
      </div>
      <div
        id={id}
        ref={viewport}
        className="carousel-viewport"
        onScroll={settle}
        onPointerDown={pauseInteraction}
        onWheel={pauseInteraction}
        onKeyDown={(e) => {
          if (
            e.target === e.currentTarget &&
            (e.key === "ArrowRight" || e.key === "ArrowLeft")
          ) {
            e.preventDefault()
            manual(e.key === "ArrowRight" ? 1 : -1)
          }
        }}
        tabIndex={canMove ? 0 : undefined}
        aria-label={t("lawyers.professionalsSwipeOrUseTheArrowsToExplore")}
      >
        <div className="carousel-track">
          {copies.flatMap((copy) =>
            lawyers.map((lawyer, index) => (
              <div
                className="carousel-slide"
                key={`${copy}-${lawyer.id}`}
                inert={copy !== 0 ? true : undefined}
                aria-hidden={copy !== 0 ? true : undefined}
                role={copy === 0 ? "group" : undefined}
                aria-roledescription={
                  copy === 0 ? t("common.slide") : undefined
                }
                aria-label={
                  copy === 0
                    ? t("carousel.slide", {
                        number: index + 1,
                        count,
                        name: lawyer.name,
                      })
                    : undefined
                }
                onFocusCapture={() => {
                  if (copy !== 0) return
                  setPaused(true)
                  stopAnimation()
                  setIndex(Math.max(0, Math.min(index, count - visible)))
                }}
              >
                <LawyerCard
                  lawyer={lawyer}
                  onView={() => {
                    setPaused(true)
                    onView(lawyer)
                  }}
                  onConsult={() => {
                    setPaused(true)
                    onConsult(lawyer)
                  }}
                />
              </div>
            )),
          )}
        </div>
      </div>
      <div className="carousel-footer">
        <span>
          {reduced
            ? t("lawyers.reducedMotionEnabled")
            : t("lawyers.pausesOnHoverAfterInteractingResumeWheneverYouLike")}
        </span>
        <div className="carousel-dots" aria-label={t("lawyers.carouselPages")}>
          {pages.map((page, i) => (
            <Button
              key={page}
              variant="ghost"
              aria-label={t("carousel.page", { number: i + 1 })}
              aria-current={
                pages.filter((p) => p <= position).length - 1 === i
                  ? "true"
                  : undefined
              }
              disabled={!canMove}
              onClick={() => manual(1, page)}
            >
              <span />
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}
