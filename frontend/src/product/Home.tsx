import { t, uiText } from "../i18n/core"
import { useEffect, useRef, useState } from "react"
import { useProduct } from "./Store"
import { Badge, Button, Field, Heading, Icon, Select } from "./UI"
import { LawyerCarousel } from "./LawyerCarousel"
import type { Lawyer, Page, SessionUser } from "./model"
import lexiImg from "../imports/mazcotalexi.png"
import heroBg from "../imports/caratula-V1.png"

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    el.classList.add("reveal-ready")
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("reveal-visible")
          observer.disconnect()
        }
      },
      { threshold: 0.08 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className={`home-reveal ${className}`}>
      {children}
    </div>
  )
}

const smooth = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth") as ScrollBehavior

export function HomePage({ navigate, user }: { navigate: (p: Page) => void; user: SessionUser | null }) {
  const store = useProduct()
  const { lawyers, setChatOpen, setProfile, setContact, catalogLoading, catalogError, reloadCatalog } = store
  const [sort, setSort] = useState("name")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const areas = Array.from(new Set(lawyers.flatMap((l) => l.specialties))).sort()
  const q = searchQuery.trim().toLowerCase()
  const filteredLawyers = lawyers
    .filter(
      (l) =>
        (!q ||
          l.name.toLowerCase().includes(q) ||
          l.specialties.some((a) => `${a} ${uiText(a)}`.toLowerCase().includes(q))) &&
        (!activeFilter || l.specialties.includes(activeFilter)),
    )
    .sort((a, b) =>
      sort === "price"
        ? (a.fee ?? Infinity) - (b.fee ?? Infinity)
        : sort === "experience"
          ? (b.years ?? -1) - (a.years ?? -1)
          : a.name.localeCompare(b.name, "es"),
    )
  const featured = [...lawyers]
    .filter((l) => !l.test)
    .sort((a, b) => Number(b.verified) - Number(a.verified) || (b.years ?? -1) - (a.years ?? -1))
    .slice(0, 4)
  const suspended = !!(store.profile || store.contact || store.chatOpen || store.information)
  const goCatalog = () => document.getElementById("catalog")?.scrollIntoView({ behavior: smooth() })
  const consult = (l: Lawyer) => setContact(l)

  return (
    <main className="home-page">
      <section className="home-hero" aria-labelledby="hero-title">
        <img src={heroBg} alt="" className="hero-institutional-background" aria-hidden="true" fetchPriority="low" />
        <div className="home-container hero-layout">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span />
              <span>{t("home.technologyThatSupportsYourRights")}</span>
            </div>
            <h1 id="hero-title" className="home-hero-title">
              <span>{t("home.findThe")}</span>
              <span>
                <em>{t("home.titleWord")}</em> {t("home.titleConnector")}
              </span>
              <span>{t("home.need")}</span>
            </h1>
            <p className="hero-description">{t("home.weConnectPeopleWithLegalProfessionalsInCordobaAnd")}</p>
            <div className="hero-actions">
              <Button onClick={goCatalog}>
                {t("home.findALawyer")} <Icon name="arrow" />
              </Button>
              <Button variant="secondary" onClick={() => setChatOpen(true)}>
                <Icon name="chat" /> {t("home.consultLexi")}
              </Button>
            </div>
            <div className="hero-assurance">
              <Icon name="shield" />
              <span>{t("home.findGuidanceChooseWithConfidence")}</span>
            </div>
            <div className="hero-trust" aria-label="Datos de la plataforma">
              {[
                [catalogLoading ? "…" : String(lawyers.length), lawyers.length === 1 ? "Profesional disponible" : "Profesionales disponibles"],
                [catalogLoading ? "…" : String(areas.length || "—"), "home.legalAreas"],
                [t("home.free"), "home.initialGuidance"],
              ].map(([value, label]) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{uiText(label)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-lexi-scene">
            <div className="lexi-orbit lexi-orbit--outer" aria-hidden="true" />
            <div className="lexi-orbit lexi-orbit--inner" aria-hidden="true" />
            <span className="lexi-scene-spark spark-one" aria-hidden="true" />
            <span className="lexi-scene-spark spark-two" aria-hidden="true" />
            <div className="lexi-scene-label">
              <span className="lexi-label-icon">
                <Icon name="shield" />
              </span>
              <div>
                <strong>{t("home.aFirstStepTowardsGuidance")}</strong>
                <span>{t("home.toTakeYourNextStep")}</span>
              </div>
            </div>
            <img className="hero-lexi" src={lexiImg} alt={t("home.lexiAbogaciaSOwlLegalAssistant")} fetchPriority="high" width="420" height="420" />
            <div className="hero-lexi-card">
              <span className="lexi-card-avatar">
                <Icon name="chat" />
              </span>
              <div>
                <p>
                  {t("home.hiIM")} <strong>Lexi.</strong>
                </p>
                <span>{t("home.iLlHelpYouFindWhereToStart")}</span>
              </div>
              <Badge>{t("home.aiAssistant")}</Badge>
            </div>
            <span className="lexi-scene-caption">{t("home.approachableSimpleHereForYou")}</span>
          </div>
        </div>
        <div className="hero-bottom-line">
          <span>{t("home.cordobaArgentina")}</span>
          <span>
            {t("home.clearGuidanceInformedDecisions")} <Icon name="arrow" />
          </span>
        </div>
      </section>

      <section className="home-catalog home-section" id="catalog" aria-labelledby="catalog-title">
        <div className="home-container">
          <Reveal>
            <div className="home-section-heading">
              <div>
                <p className="eyebrow">{t("home.theFirstStepIsFindingWhoToConsult")}</p>
                <h2 id="catalog-title">{t("home.findTheRightProfessional")}</h2>
                <p>Explorá abogados de Córdoba por especialidad, experiencia y honorarios publicados.</p>
              </div>
              <span className="section-number" aria-hidden="true">
                {t("home.01Professionals")}
              </span>
            </div>
          </Reveal>
          <form
            className="catalog-search-row"
            onSubmit={(e) => {
              e.preventDefault()
              document.getElementById("catalog-results")?.scrollIntoView({ behavior: smooth(), block: "nearest" })
            }}
          >
            <div className="catalog-search-field">
              <Icon name="search" />
              <Field
                id="catalog-search"
                label={t("home.searchByNameOrSpecialty")}
                placeholder={t("home.whatKindOfLawyerDoYouNeed")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit">
              {t("home.search")} <Icon name="arrow" />
            </Button>
            <Select label={t("home.sortLawyers")} aria-label={t("home.sortLawyers")} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name">Nombre</option>
              <option value="experience">Más experiencia</option>
              <option value="price">{t("home.lowestFee")}</option>
            </Select>
          </form>
          {areas.length > 0 && (
            <div className="catalog-filter-list" role="group" aria-label={t("home.filterBySpecialty")}>
              <Button variant="ghost" className={!activeFilter ? "filter-active" : ""} aria-pressed={!activeFilter} onClick={() => setActiveFilter(null)}>
                {!activeFilter && <Icon name="check" />}
                {t("dashboard.all")}
              </Button>
              {areas.map((area) => (
                <Button
                  key={area}
                  variant="ghost"
                  className={activeFilter === area ? "filter-active" : ""}
                  aria-pressed={activeFilter === area}
                  onClick={() => setActiveFilter(activeFilter === area ? null : area)}
                >
                  {activeFilter === area && <Icon name="check" />}
                  {uiText(area).replace(/^Derecho (de )?/, "")}
                </Button>
              ))}
            </div>
          )}
          <div className="catalog-results-heading" id="catalog-results">
            <p role="status">
              <strong>{t("home.results", { count: filteredLawyers.length })}</strong>{" "}
              {activeFilter ? t("home.filterArea", { area: uiText(activeFilter || "") }) : t("home.readyToSupportYou")}
            </p>
            <p>
              <Icon name="location" />
              Córdoba
            </p>
          </div>
          {catalogLoading ? (
            <p className="loading-line" role="status">
              Cargando catálogo…
            </p>
          ) : catalogError ? (
            <div className="ui-card" role="alert">
              <p>{catalogError}</p>
              <Button variant="secondary" onClick={reloadCatalog}>
                Reintentar
              </Button>
            </div>
          ) : (
            <LawyerCarousel
              key={`${searchQuery}-${activeFilter}-${sort}`}
              label={t("home.lawyerCatalogue")}
              lawyers={filteredLawyers}
              onView={setProfile}
              onConsult={consult}
              suspended={suspended}
              onClear={() => {
                setSearchQuery("")
                setActiveFilter(null)
              }}
            />
          )}
          <div className="catalog-lexi-help">
            <div>
              <img src={lexiImg} alt="" width="48" height="48" />
              <p>
                <strong>{t("home.notSureWhichSpecialtyToChoose")}</strong>
                <span>{t("home.lexiHelpsIdentifyTheLegalAreaRelatedToYour")}</span>
              </p>
            </div>
            <Button variant="ghost" onClick={() => setChatOpen(true)}>
              {t("home.consultLexi")} <Icon name="arrow" />
            </Button>
          </div>
        </div>
      </section>

      <section className="home-how home-section" id="how-it-works" aria-labelledby="how-title">
        <div className="home-container">
          <Reveal>
            <div className="home-section-heading home-section-heading--center">
              <p className="eyebrow">{t("home.simpleFromTheVeryStart")}</p>
              <h2 id="how-title">{t("home.howDoesAbogaciaWork")}</h2>
              <p>{t("home.fromYourFirstQuestionToProfessionalContact")}</p>
            </div>
            <div className="home-steps">
              {[
                ["01", "chat", "home.tellUsWhatYouNeed", "home.searchBySpecialtyOrDescribeYourSituationToLexi"],
                ["02", "search", "home.chooseALawyer", "Compará perfiles, especialidades, experiencia y honorarios publicados."],
                ["03", "briefcase", "Escribile por WhatsApp", "Completá el formulario: armamos el mensaje y lo abrís en WhatsApp. Queda guardado en Mis consultas."],
              ].map(([number, icon, title, description]) => (
                <article className="home-step" key={number}>
                  <div className="home-step-top">
                    <span className="home-step-icon">
                      <Icon name={icon} />
                    </span>
                    <span>{number}</span>
                  </div>
                  <Heading level={3}>{uiText(title)}</Heading>
                  <p>{uiText(description)}</p>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="home-lexi-section home-section" id="lexi" aria-labelledby="lexi-title">
        <div className="home-container">
          <Reveal className="home-lexi-layout">
            <div className="lexi-preview-composition">
              <div className="lexi-preview-identity">
                <img src={lexiImg} alt={t("home.lexiLegalGuidanceAssistant")} width="200" height="200" />
                <span className="eyebrow">{t("home.yourFirstGuidance")}</span>
              </div>
              <div className="lexi-conversation-preview">
                <div className="preview-chat-heading">
                  <span />
                  <strong>{t("home.aConversationWithLexi")}</strong>
                  <Badge>Ejemplo</Badge>
                </div>
                <div className="preview-user-message">{t("home.iLostMyJobAndDonTKnowWhat")}</div>
                <div className="preview-lexi-message">
                  <img src={lexiImg} alt="" width="36" height="36" />
                  <p>
                    {t("home.yourEnquiryMayRelateTo")} <strong>{t("auth.employmentLaw")}</strong>
                    {t("home.iCanShowYouProfessionalsInThisSpecialty")}
                  </p>
                </div>
                <div className="preview-specialty">
                  <Icon name="briefcase" />
                  <span>{t("auth.employmentLaw")}</span>
                  <Icon name="arrow" />
                </div>
              </div>
            </div>
            <div className="home-lexi-copy">
              <p className="eyebrow">{t("home.technologyWithAHumanPurpose")}</p>
              <h2 id="lexi-title">
                {t("home.meet")} <em>Lexi,</em>
                <br /> {t("home.yourAiLegalAssistant")}
              </h2>
              <p>{t("home.notSureWhatKindOfLawyerYouNeedLexi")}</p>
              <Button onClick={() => setChatOpen(true)}>
                {t("home.talkToLexi")} <Icon name="arrow" />
              </Button>
              <p className="lexi-legal-note">
                <Icon name="shield" /> {t("home.lexiProvidesGeneralGuidanceAndDoesNotReplaceProfessional")}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {featured.length > 1 && (
        <section className="home-featured home-section" aria-labelledby="featured-title">
          <div className="home-container">
            <Reveal>
              <div className="home-section-heading">
                <div>
                  <p className="eyebrow">{t("home.experienceForEverySituation")}</p>
                  <h2 id="featured-title">{t("home.featuredProfessionals")}</h2>
                  <p>Profesionales con matrícula verificada y mayor experiencia publicada.</p>
                </div>
                <Button variant="ghost" onClick={goCatalog}>
                  {t("home.exploreAllLawyers")} <Icon name="arrow" />
                </Button>
              </div>
            </Reveal>
            <LawyerCarousel label={t("home.featuredLawyers")} lawyers={featured} onView={setProfile} onConsult={consult} suspended={suspended} />
          </div>
        </section>
      )}

      <section className="home-professional-section" id="professionals">
        <div className="home-container">
          <Reveal className="home-professional-cta">
            <div className="professional-cta-emblem">
              <Icon name="scale" />
            </div>
            <div>
              <p className="eyebrow">{t("home.growYourProfessionalPractice")}</p>
              <h2>
                {t("auth.areYouALawyer")} <br /> {t("home.joinAbogacia")}
              </h2>
              <p>Verificá tu identidad y tu matrícula, publicá tus casos y recibí consultas por WhatsApp de personas de Córdoba.</p>
            </div>
            <div className="professional-cta-action">
              <Button onClick={() => navigate("register-lawyer")}>
                {t("home.registerAsAProfessional")} <Icon name="arrow" />
              </Button>
              {!user && (
                <>
                  <Button variant="secondary" onClick={() => navigate("register-citizen")}>
                    {t("home.iMACitizen")}
                  </Button>
                  <span>{t("home.yourNextProfessionalConnectionStartsHere")}</span>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>
      <footer className="home-footer home-container">
        <div>
          <strong>
            abogac<span>IA</span>
          </strong>
          <p>{t("home.clearGuidanceProfessionalsNearby")}</p>
        </div>
        <p>
          {t("home.cordobaArgentina_df756")} <br />
          La orientación de Lexi es informativa y no reemplaza el asesoramiento de un abogado matriculado.
        </p>
        <Button variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: smooth() })}>
          {t("auth.backToHome")} <Icon name="arrow-up" />
        </Button>
      </footer>
      <Button className="home-lexi-fab" onClick={() => setChatOpen(true)} aria-label={t("home.openLegalGuidanceWithLexi")}>
        <img src={lexiImg} alt="" width="44" height="44" />
        <span>Lexi</span>
      </Button>
    </main>
  )
}
